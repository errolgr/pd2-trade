use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::sync::Mutex;
use once_cell::sync::Lazy;

const MAX_SIZE: u64 = 5 * 1024 * 1024; // 5MB
const TRIM_TO: u64 = MAX_SIZE / 2; // Keep ~2.5MB when trimming

static LOG_PATH: Lazy<Mutex<Option<PathBuf>>> = Lazy::new(|| Mutex::new(None));

pub fn init(app_config_dir: PathBuf) {
    let log_dir = app_config_dir.join("logs");
    let _ = fs::create_dir_all(&log_dir);
    let log_path = log_dir.join("debug.log");
    *LOG_PATH.lock().unwrap() = Some(log_path);
}

pub fn write_logs(entries: &str) -> Result<(), String> {
    let guard = LOG_PATH.lock().unwrap();
    let log_path = guard.as_ref().ok_or("Debug logger not initialized")?;

    // Append entries
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_path)
        .map_err(|e| format!("Failed to open log file: {}", e))?;

    file.write_all(entries.as_bytes())
        .map_err(|e| format!("Failed to write to log file: {}", e))?;

    drop(file);

    // Check size and truncate if needed
    let metadata = fs::metadata(log_path).map_err(|e| format!("Failed to read metadata: {}", e))?;
    if metadata.len() > MAX_SIZE {
        let content =
            fs::read_to_string(log_path).map_err(|e| format!("Failed to read log file: {}", e))?;
        let keep_from = content.len() - TRIM_TO as usize;
        let trimmed = &content[keep_from..];
        // Find first newline to avoid partial line
        let start = trimmed.find('\n').map(|i| i + 1).unwrap_or(0);
        fs::write(log_path, &trimmed[start..])
            .map_err(|e| format!("Failed to truncate log file: {}", e))?;
    }

    Ok(())
}
