use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use std::fs;
use std::io::{BufRead, BufReader, Seek, SeekFrom};
use std::path::{Path, PathBuf};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::Emitter;

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WhisperEvent {
    pub is_trade: bool,
    pub from: String,
    pub message: String,
    pub item_name: Option<String>,
    pub is_join: bool,
    pub is_incoming: bool,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TradeMessageEvent {
    pub is_incoming: bool,
    pub player_name: String,
    pub account_name: Option<String>,
    pub character_name: Option<String>,
    pub message: String,
    pub item_name: Option<String>,
    pub price: Option<String>,
}

static WATCHER_HANDLE: Mutex<Option<Arc<Mutex<Option<RecommendedWatcher>>>>> = Mutex::new(None);
static LAST_POSITION: Mutex<u64> = Mutex::new(0);

/// Find the Diablo II installation directory
/// If custom_path is provided and exists, use it. Otherwise, try auto-detection.
pub fn find_diablo2_directory(custom_path: Option<&str>) -> Option<PathBuf> {
    // If custom path is provided and exists, use it
    if let Some(custom) = custom_path {
        if !custom.is_empty() {
            let path = PathBuf::from(custom);
            if path.exists() {
                return Some(path);
            }
        }
    }

    crate::modules::system::find_diablo2_install_path()
}

/// Auto-detect the Diablo II installation directory (without using custom path)
pub fn auto_detect_diablo2_directory() -> Option<PathBuf> {
    find_diablo2_directory(None)
}

// find_diablo2_in_registry removed

/// Get the chat log file path, creating directories if needed
pub fn get_chat_log_path(custom_d2_dir: Option<&str>) -> Option<PathBuf> {
    let d2_dir = find_diablo2_directory(custom_d2_dir)?;
    let logs_dir = d2_dir.join("ProjectD2").join("pd2logs");
    // Create directories if they don't exist
    if let Err(_e) = fs::create_dir_all(&logs_dir) {
        return None;
    }

    let log_file = logs_dir.join("pd2_chat.log");

    // Create file if it doesn't exist
    if !log_file.exists() {
        if let Err(_e) = fs::File::create(&log_file) {
            return None;
        }
    }

    Some(log_file)
}

/// Get the game log file path, creating directories if needed
pub fn get_game_log_path(custom_d2_dir: Option<&str>) -> Option<PathBuf> {
    let d2_dir = find_diablo2_directory(custom_d2_dir)?;
    let logs_dir = d2_dir.join("ProjectD2").join("pd2logs");

    // Create directories if they don't exist
    if let Err(_e) = fs::create_dir_all(&logs_dir) {
        return None;
    }

    let log_file = logs_dir.join("pd2_game.log");

    // Create file if it doesn't exist
    if !log_file.exists() {
        if let Err(_e) = fs::File::create(&log_file) {
            return None;
        }
    }

    Some(log_file)
}

/// Character name (lowercase) → account name, learned from join lines and realm whispers. In-game
/// whisper lines only carry the character name; this keeps their conversations keyed by account.
static CHARACTER_ACCOUNTS: Mutex<Option<HashMap<String, String>>> = Mutex::new(None);

fn remember_account(character: &str, account: &str) {
    let account = account.trim().trim_start_matches('*');
    let character = character.trim();
    if character.is_empty() || account.is_empty() || character.contains(' ') {
        return;
    }
    if let Ok(mut guard) = CHARACTER_ACCOUNTS.lock() {
        guard
            .get_or_insert_with(HashMap::new)
            .insert(character.to_lowercase(), account.to_string());
    }
}

fn account_for(character: &str) -> Option<String> {
    CHARACTER_ACCOUNTS
        .lock()
        .ok()?
        .as_ref()?
        .get(&character.to_lowercase())
        .cloned()
}

/// Learn character → account from "4,<char>(<account>) joined our world." and "2,From <char> (*<account>): …".
fn learn_accounts(line: &str) {
    let (who, end) = if let Some(rest) = line.strip_prefix("4,") {
        match rest.find(" joined our world") {
            Some(end) => (rest, end),
            None => return,
        }
    } else if let Some(rest) = line.strip_prefix("2,From ") {
        match rest.find(':') {
            Some(end) => (rest, end),
            None => return,
        }
    } else {
        return;
    };
    let who = &who[..end];
    if let (Some(open), Some(close)) = (who.find('('), who.find(')')) {
        if open < close {
            remember_account(&who[..open], &who[open + 1..close]);
        }
    }
}

/// In-game whispers (the other player is in your game) are logged as "2,<char> whispers: <msg>" and
/// "2,You whispered to <char>: <msg>". Rewrites them to the realm format ("2,From <char> (*<account>): <msg>",
/// "2,Sent to …") the parsers below read, with the account when it is known; other lines are returned as-is.
fn normalize_in_game_whisper(line: &str) -> std::borrow::Cow<'_, str> {
    let Some(body) = line.strip_prefix("2,") else {
        return line.into();
    };
    let (direction, character, message) = if let Some(rest) = body.strip_prefix("You whispered to ") {
        match rest.split_once(": ") {
            Some((character, message)) => ("Sent to", character, message),
            None => return line.into(),
        }
    } else {
        match body.split_once(" whispers: ") {
            Some((character, message)) => ("From", character, message),
            None => return line.into(),
        }
    };
    // Character names have no spaces; anything else is a different kind of line.
    if character.is_empty() || character.contains(' ') {
        return line.into();
    }
    match account_for(character) {
        Some(account) => format!("2,{} {} (*{}): {}", direction, character, account, message).into(),
        None => format!("2,{} {}: {}", direction, character, message).into(),
    }
}

/// Parse a whisper from a log line
/// Format: "2,From <character> (*<account>): Hi, I'm interested in your Frostburn listed for 2 wss"
/// Format: "4,<character>(<account>) joined our world. Diablo's minions grow stronger."
fn parse_whisper(line: &str) -> Option<WhisperEvent> {
    // Check for join messages (starts with "4,")
    if line.starts_with("4,") {
        // Format: "4,shrackx(shrack) joined our world. Diablo's minions grow stronger."
        if line.contains(" joined our world") {
            let after_prefix = &line[2..]; // Skip "4,"
            if let Some(joined_pos) = after_prefix.find(" joined our world") {
                let player_part = after_prefix[..joined_pos].trim();
                // Extract character name and account name
                let (character, account) = if let Some(paren_start) = player_part.find('(') {
                    let character_name = player_part[..paren_start].trim();
                    if let Some(paren_end) = player_part[paren_start..].find(')') {
                        let account_name =
                            player_part[paren_start + 1..paren_start + paren_end].trim();
                        (character_name, account_name)
                    } else {
                        (character_name, "")
                    }
                } else {
                    (player_part, "")
                };

                // Use account name if available, otherwise character name
                let sender = if !account.is_empty() {
                    account.strip_prefix('*').unwrap_or(account)
                } else {
                    character
                };

                return Some(WhisperEvent {
                    is_trade: false,
                    from: sender.to_string(),
                    message: after_prefix.to_string(),
                    item_name: None,
                    is_join: true,
                    is_incoming: true,
                });
            }
        }
        return None; // Other type 4 messages, ignore
    }

    // Check if it's a whisper (starts with "2,")
    if !line.starts_with("2,") {
        return None; // Not a whisper line, ignore
    }

    let is_incoming = line.contains("From ");
    let is_outgoing = line.contains("Sent to ");

    if !is_incoming && !is_outgoing {
        return None; // Neither From nor Sent to, ignore
    }

    // Extract the message part after "From" or "Sent to"
    let after_prefix = if is_incoming {
        let from_start = line.find("From ")?;
        &line[from_start + 5..] // Skip "From "
    } else {
        let sent_to_start = line.find("Sent to ")?;
        &line[sent_to_start + 8..] // Skip "Sent to "
    };

    // Find the colon that separates sender from message
    let colon_pos = match after_prefix.find(':') {
        Some(pos) => pos,
        None => return None, // No colon found, malformed line, ignore
    };
    let sender_part = &after_prefix[..colon_pos].trim();
    let message = after_prefix[colon_pos + 1..].trim();

    // Ignore friend online/offline messages
    if message.contains("Your friend")
        && (message.contains("has left Project Diablo 2")
            || message.contains("has entered Project Diablo 2"))
    {
        return None;
    }

    // Extract sender name - prefer account name from parentheses, otherwise use character name
    // Format: "shrackx (*shrack)" or "shrackx (*shrack)" or just "shrackx"
    let sender = if let Some(paren_start) = sender_part.find('(') {
        // Extract account name from parentheses (e.g., "*shrack" from "(*shrack)")
        if let Some(paren_end) = sender_part[paren_start..].find(')') {
            let account_name = &sender_part[paren_start + 1..paren_start + paren_end].trim();
            // Remove "*" prefix if present
            account_name.strip_prefix('*').unwrap_or(account_name)
        } else {
            // Fallback to character name if parentheses are malformed
            sender_part.split_whitespace().next().unwrap_or(sender_part)
        }
    } else if let Some(space_pos) = sender_part.find(' ') {
        &sender_part[..space_pos]
    } else {
        sender_part
    };

    // Check if it's a trade whisper
    let is_trade = message.starts_with("Hi, I'm interested in your");

    // Extract item name from trade whisper
    let item_name = if is_trade {
        // Format: "Hi, I'm interested in your Frostburn listed for 2 wss"
        // Extract item name between "your" and "listed"
        if let Some(your_pos) = message.find("your ") {
            let after_your = &message[your_pos + 5..];
            if let Some(listed_pos) = after_your.find(" listed") {
                Some(after_your[..listed_pos].trim().to_string())
            } else {
                None
            }
        } else {
            None
        }
    } else {
        None
    };

    Some(WhisperEvent {
        is_trade,
        from: sender.to_string(),
        message: message.to_string(),
        item_name,
        is_join: false,
        is_incoming,
    })
}

/// Parse a trade message from a log line
/// Incoming format: "2,From shrack (*shrack): Hi, I'm interested in your Frostburn listed for 2 wss"
/// Outgoing format: "2,Sent to Shrackb (*shrack): Hi, I'm interested in your Frostburn listed for 2 wss"
fn parse_trade_message(line: &str) -> Option<TradeMessageEvent> {
    // Check if it's a whisper (starts with "2,")
    if !line.starts_with("2,") {
        return None; // Not a whisper line, ignore
    }

    // Check if it's a trade message (contains "Hi, I'm interested in your")
    if !line.contains("Hi, I'm interested in your") {
        return None; // Not a trade message
    }

    let is_incoming = line.contains("From ");
    let is_outgoing = line.contains("Sent to ");

    if !is_incoming && !is_outgoing {
        return None; // Neither From nor Sent to, ignore
    }

    // Extract the message part
    let after_prefix = if is_incoming {
        let from_start = line.find("From ")?;
        &line[from_start + 5..]
    } else {
        let sent_to_start = line.find("Sent to ")?;
        &line[sent_to_start + 8..]
    };

    // Find the colon that separates sender from message
    let colon_pos = after_prefix.find(':')?;
    let sender_part = after_prefix[..colon_pos].trim();
    let message = after_prefix[colon_pos + 1..].trim();

    // Extract character name and account name
    // Format: "shrack (*shrack)" or "DoreetDrood (*Doreets)" or just "shrack"
    let (character_name, account_name, player_name) =
        if let Some(paren_start) = sender_part.find('(') {
            // Extract character name (before parentheses)
            let char_name = sender_part[..paren_start].trim();
            // Extract account name from parentheses (e.g., "*shrack" from "(*shrack)")
            if let Some(paren_end) = sender_part[paren_start..].find(')') {
                let acc_name = &sender_part[paren_start + 1..paren_start + paren_end].trim();
                // Remove "*" prefix if present
                let acc_name_clean = acc_name.strip_prefix('*').unwrap_or(acc_name);
                (
                    Some(char_name.to_string()),
                    Some(acc_name_clean.to_string()),
                    acc_name_clean,
                )
            } else {
                // Fallback to character name if parentheses are malformed
                (Some(char_name.to_string()), None, char_name)
            }
        } else if let Some(space_pos) = sender_part.find(' ') {
            let char_name = &sender_part[..space_pos];
            (Some(char_name.to_string()), None, char_name)
        } else {
            (Some(sender_part.to_string()), None, sender_part)
        };

    // Extract item name from trade message
    // Format: "Hi, I'm interested in your Frostburn listed for 2 wss"
    let item_name = if let Some(your_pos) = message.find("your ") {
        let after_your = &message[your_pos + 5..];
        if let Some(listed_pos) = after_your.find(" listed") {
            Some(after_your[..listed_pos].trim().to_string())
        } else {
            None
        }
    } else {
        None
    };

    // Extract price from trade message
    // Format: "listed for 2 wss" or "listed for 2 wss."
    let price = if let Some(listed_pos) = message.find("listed for ") {
        let after_listed = &message[listed_pos + 11..];
        // Take everything until end of line or period
        let price_end = after_listed.find('.').unwrap_or(after_listed.len());
        Some(after_listed[..price_end].trim().to_string())
    } else {
        None
    };

    Some(TradeMessageEvent {
        is_incoming,
        player_name: player_name.to_string(),
        account_name,
        character_name,
        message: message.to_string(),
        item_name,
        price,
    })
}

/// Read new lines from the chat log file
fn read_new_lines(
    file_path: &Path,
    app_handle: tauri::AppHandle,
) -> Result<(), Box<dyn std::error::Error>> {
    // Check file size first
    let file_size = file_path.metadata().map(|m| m.len()).unwrap_or(0);

    let file = fs::File::open(file_path)?;
    let mut reader = BufReader::new(file);

    let mut last_pos_guard = match LAST_POSITION.lock() {
        Ok(g) => g,
        Err(_e) => {
            // eprintln!("Failed to lock LAST_POSITION: {}", e);
            return Ok(());
        }
    };

    // If file size is less than last position, file might have been truncated/reset (new game created)
    if file_size < *last_pos_guard {
        *last_pos_guard = file_size;
        return Ok(()); // Don't read old messages, just update position
    }

    // If file was reset to 0 and hasn't grown yet, nothing to read
    if file_size == 0 {
        *last_pos_guard = 0;
        return Ok(());
    }

    // If we're already at the end, nothing to read
    if *last_pos_guard >= file_size {
        return Ok(());
    }

    // Seek to last position
    if let Err(_e) = reader.seek(SeekFrom::Start(*last_pos_guard)) {
        // If seek fails, try to get current file size and start from there
        if let Ok(metadata) = file_path.metadata() {
            *last_pos_guard = metadata.len();
            if let Err(_e2) = reader.seek(SeekFrom::Start(*last_pos_guard)) {
                return Ok(()); // Return early if we can't seek
            }
        } else {
            return Ok(()); // Return early if we can't get metadata
        }
    }

    let mut line = Vec::new();

    loop {
        // Read line - handle errors gracefully
        match reader.read_until(b'\n', &mut line) {
            Ok(0) => break, // EOF
            Ok(_bytes_read) => {
                // Convert bytes to string, replacing invalid UTF-8 sequences with replacement characters
                let raw_line = String::from_utf8_lossy(&line);
                learn_accounts(&raw_line);
                // In-game whispers ("X whispers: …") read as realm whispers ("From X (*acct): …").
                let line_str = normalize_in_game_whisper(&raw_line);

                // Parse trade message first (both incoming and outgoing)
                if let Some(trade_message) = parse_trade_message(&line_str) {
                    // Emit trade message event to frontend
                    let _ = app_handle.emit("trade-message", trade_message.clone());
                }

                // Parse whisper - if it returns None, just skip the line (it's not a whisper we care about)
                if let Some(whisper) = parse_whisper(&line_str) {
                    // Emit whisper event to frontend
                    let _ = app_handle.emit("whisper-received", whisper.clone());
                }
                // Always clear the line buffer for next iteration
                line.clear();
            }
            Err(_e) => {
                // Try to update position and continue
                if let Ok(current_pos) = reader.seek(SeekFrom::Current(0)) {
                    *last_pos_guard = current_pos;
                }
                break; // Exit loop on read error
            }
        }
    }

    // Always update last position, even if there were errors
    match reader.seek(SeekFrom::Current(0)) {
        Ok(current_pos) => {
            *last_pos_guard = current_pos;
        }
        Err(_e) => {
            // Try to get position from file metadata as fallback
            if let Ok(metadata) = file_path.metadata() {
                *last_pos_guard = metadata.len();
            }
        }
    }

    Ok(())
}

/// Start watching the chat log file
pub fn start_watching(
    app_handle: tauri::AppHandle,
    custom_d2_dir: Option<String>,
) -> Result<(), String> {
    let log_path = match get_chat_log_path(custom_d2_dir.as_deref()) {
        Some(path) => path,
        None => {
            let msg = "Could not find or create chat log file. Please check your Diablo II Directory settings.";
            let _ = app_handle.emit("error", msg);
            return Err(msg.to_string());
        }
    };

    // Also create the game log file
    let _ = get_game_log_path(custom_d2_dir.as_deref());

    // Initialize last position to end of file
    if let Ok(file) = fs::File::open(&log_path) {
        if let Ok(metadata) = file.metadata() {
            if let Ok(mut guard) = LAST_POSITION.lock() {
                *guard = metadata.len();
            }
        }
    }

    // Create watcher
    let log_path_for_watcher = log_path.clone();

    let mut watcher: RecommendedWatcher =
        notify::recommended_watcher(move |result: Result<Event, notify::Error>| {
            match result {
                Ok(event) => {
                    if matches!(event.kind, EventKind::Modify(_)) {
                        let app_handle_clone = app_handle.clone();
                        let log_path_clone = log_path_for_watcher.clone();

                        std::thread::spawn(move || {
                            // Small delay to ensure file is fully written
                            std::thread::sleep(std::time::Duration::from_millis(100));

                            let _ = read_new_lines(&log_path_clone, app_handle_clone);
                        });
                    }
                }
                Err(_e) => {
                    // Silently ignore watcher errors
                }
            }
        })
        .map_err(|e| format!("Failed to create file watcher: {}", e))?;

    // Watch the log file
    watcher
        .watch(&log_path, RecursiveMode::NonRecursive)
        .map_err(|e| format!("Failed to watch chat log file: {}", e))?;

    // Store watcher handle
    if let Ok(mut guard) = WATCHER_HANDLE.lock() {
        *guard = Some(Arc::new(Mutex::new(Some(watcher))));
    } else {
        return Err("Failed to lock watcher handle".to_string());
    }

    Ok(())
}

/// Stop watching the chat log file
pub fn stop_watching() -> Result<(), String> {
    let mut handle_guard = match WATCHER_HANDLE.lock() {
        Ok(g) => g,
        Err(_) => return Err("Failed to lock watcher handle".to_string()),
    };

    if let Some(arc_watcher) = handle_guard.take() {
        if let Ok(mut watcher_guard) = arc_watcher.lock() {
            watcher_guard.take();
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// What the read loop does with one log line.
    fn read(line: &str) -> (Option<WhisperEvent>, Option<TradeMessageEvent>) {
        learn_accounts(line);
        let line = normalize_in_game_whisper(line);
        (parse_whisper(&line), parse_trade_message(&line))
    }

    #[test]
    fn in_game_whisper_from_a_player_in_your_game_is_an_incoming_whisper() {
        let (whisper, trade) = read("2,Kestrelz whispers: psst, you selling anything?\r\n");
        let whisper = whisper.expect("in-game whisper is parsed");
        assert!(whisper.is_incoming && !whisper.is_join && !whisper.is_trade);
        assert_eq!(whisper.from, "Kestrelz");
        assert_eq!(whisper.message, "psst, you selling anything?");
        assert!(trade.is_none());
    }

    #[test]
    fn in_game_whisper_uses_the_account_from_the_join_line() {
        let (join, _) = read("4,Joinerchar(joineracct) joined our world. Diablo's minions grow stronger.\n");
        assert_eq!(join.expect("join parsed").from, "joineracct");

        let (whisper, _) = read("2,Joinerchar whispers: hey: still selling?\n");
        let whisper = whisper.expect("in-game whisper is parsed");
        assert_eq!(whisper.from, "joineracct");
        assert_eq!(whisper.message, "hey: still selling?");
    }

    #[test]
    fn outgoing_in_game_whisper_is_outgoing_and_uses_a_known_account() {
        read("2,From Realmchar (*realmacct): hi\n");
        let (whisper, _) = read("2,You whispered to Realmchar: joining now\n");
        let whisper = whisper.expect("outgoing in-game whisper is parsed");
        assert!(!whisper.is_incoming);
        assert_eq!(whisper.from, "realmacct");
        assert_eq!(whisper.message, "joining now");
    }

    #[test]
    fn in_game_trade_whisper_is_a_trade_with_item_and_price() {
        let (whisper, trade) =
            read("2,Tradechar whispers: Hi, I'm interested in your Frostburn listed for 2 wss\n");
        let whisper = whisper.expect("parsed");
        assert!(whisper.is_trade);
        assert_eq!(whisper.item_name.as_deref(), Some("Frostburn"));
        let trade = trade.expect("trade message parsed");
        assert!(trade.is_incoming);
        assert_eq!(trade.character_name.as_deref(), Some("Tradechar"));
        assert_eq!(trade.price.as_deref(), Some("2 wss"));
    }

    #[test]
    fn realm_whispers_still_parse_unchanged() {
        let (whisper, trade) =
            read("2,From shrackx (*shrack): Hi, I'm interested in your Frostburn listed for 2 wss\n");
        let whisper = whisper.expect("parsed");
        assert_eq!(whisper.from, "shrack");
        assert!(whisper.is_incoming && whisper.is_trade);
        assert_eq!(trade.expect("trade").account_name.as_deref(), Some("shrack"));
    }

    #[test]
    fn public_chat_and_system_lines_are_not_whispers() {
        assert!(read("0,ÿc4Trader ÿc0: wts shako\n").0.is_none());
        assert!(read("2,Some text without the whisper marker\n").0.is_none());
        // A name with spaces is not a character name.
        assert!(read("2,Not a name whispers: x\n").0.is_none());
    }
}
