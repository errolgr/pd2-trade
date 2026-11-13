/// Every command registered in `tauri::generate_handler!` (src/lib.rs). An app manifest makes the runtime ACL check
/// app commands too, so each one needs an `allow-*` permission granted to the window that calls it; a command left out
/// here is denied everywhere. scripts/tauri-acl.test.mjs keeps this list, the handler and the grants in sync.
const APP_COMMANDS: &[&str] = &[
    "get_diablo_rect",
    "press_key",
    "is_diablo_focused",
    "is_diablo_fullscreen",
    "focus_diablo",
    "focus_overlay",
    "set_outside_click_watch",
    "update_window_bounds",
    "set_interactive_region",
    "start_chat_watcher",
    "stop_chat_watcher",
    "get_diablo2_directory",
    "auto_detect_diablo2_directory",
    "open_url",
    "open_config_dir",
    "write_debug_logs",
    "open_sign_in_window",
    "close_sign_in_window",
];

fn main() {
    tauri_build::try_build(
        tauri_build::Attributes::new()
            .app_manifest(tauri_build::AppManifest::new().commands(APP_COMMANDS)),
    )
    .expect("failed to run tauri-build");
}
