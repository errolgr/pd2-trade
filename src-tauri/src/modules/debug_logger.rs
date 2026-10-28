use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

const MAX_SIZE: u64 = 5 * 1024 * 1024; // 5MB
const TRIM_TO: u64 = MAX_SIZE / 2; // Keep ~2.5MB when trimming

static LOG_PATH: Mutex<Option<PathBuf>> = Mutex::new(None);

/// Mirrors the Debug Logging setting; the frontend sets it whenever it starts or stops its own capture.
static ENABLED: AtomicBool = AtomicBool::new(false);

pub fn init(app_config_dir: PathBuf) {
    let log_dir = app_config_dir.join("logs");
    let _ = fs::create_dir_all(&log_dir);
    let log_path = log_dir.join("debug.log");
    *LOG_PATH.lock().unwrap_or_else(|p| p.into_inner()) = Some(log_path);
}

pub fn set_enabled(enabled: bool) {
    ENABLED.store(enabled, Ordering::SeqCst);
}

pub fn enabled() -> bool {
    ENABLED.load(Ordering::SeqCst)
}

/// Appends one `[ISO time] [LEVEL] message` line, the frontend's format, when Debug Logging is on.
pub fn log(level: &str, message: &str) {
    if !enabled() {
        return;
    }
    let _ = write_logs(&format!("[{}] [{}] {}\n", iso_now(), level, message));
}

pub fn write_logs(entries: &str) -> Result<(), String> {
    let guard = LOG_PATH.lock().unwrap_or_else(|p| p.into_inner());
    let log_path = guard.as_ref().ok_or("Debug logger not initialized")?;

    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_path)
        .map_err(|e| format!("Failed to open log file: {}", e))?;

    file.write_all(entries.as_bytes())
        .map_err(|e| format!("Failed to write to log file: {}", e))?;

    drop(file);

    let metadata = fs::metadata(log_path).map_err(|e| format!("Failed to read metadata: {}", e))?;
    if metadata.len() > MAX_SIZE {
        let content =
            fs::read_to_string(log_path).map_err(|e| format!("Failed to read log file: {}", e))?;
        fs::write(log_path, trim_tail(&content, TRIM_TO as usize))
            .map_err(|e| format!("Failed to truncate log file: {}", e))?;
    }

    Ok(())
}

/// The last ~`keep` bytes of `content`, starting at a whole line. The cut moves forward to a char boundary:
/// slicing inside a multi-byte character panics.
fn trim_tail(content: &str, keep: usize) -> &str {
    let mut from = content.len().saturating_sub(keep);
    while !content.is_char_boundary(from) {
        from += 1;
    }
    let tail = &content[from..];
    tail.find('\n').map_or(tail, |i| &tail[i + 1..])
}

fn iso_now() -> String {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    iso_utc(now.as_secs() as i64, now.subsec_millis())
}

/// `YYYY-MM-DDTHH:MM:SS.mmmZ` for a Unix time (days-to-civil, Howard Hinnant).
fn iso_utc(secs: i64, millis: u32) -> String {
    let days = secs.div_euclid(86_400);
    let rem = secs.rem_euclid(86_400);
    let z = days + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1_460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = doy - (153 * mp + 2) / 5 + 1;
    let month = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = yoe + era * 400 + i64::from(month <= 2);
    format!(
        "{year:04}-{month:02}-{day:02}T{:02}:{:02}:{:02}.{millis:03}Z",
        rem / 3_600,
        rem % 3_600 / 60,
        rem % 60
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn trim_tail_never_splits_a_character() {
        let line = "[t] [LOG] €€€ item\n";
        let content = line.repeat(50);
        for keep in 0..content.len() {
            let tail = trim_tail(&content, keep);
            assert!(
                tail.is_empty() || tail.starts_with("[t]"),
                "keep {keep}: {tail:?}"
            );
            assert!(tail.len() <= keep);
        }
    }

    #[test]
    fn iso_utc_formats_unix_time() {
        assert_eq!(iso_utc(0, 0), "1970-01-01T00:00:00.000Z");
        assert_eq!(iso_utc(951_782_400, 5), "2000-02-29T00:00:00.005Z");
        assert_eq!(iso_utc(1_793_131_200, 999), "2026-10-27T20:00:00.999Z");
    }
}
