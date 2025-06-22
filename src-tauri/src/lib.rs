use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};


pub mod modules;

// Re-export modules for easier access
pub use modules::{window, keyboard, system, commands};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "windows")]
    if !system::is_elevated() {
        system::restart_as_admin();
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_app_exit::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = app
                .get_webview_window("main")
                .expect("no main window")
                .set_focus();
        }))
        .setup(|app| {
            let _handle = app.app_handle();

            let win_builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
                .title("PD2 Trader")
                .inner_size(1200.0, 750.0)
                .decorations(false)
                .transparent(true)
                .visible(true)
                .shadow(false)
                .always_on_top(true)
                .skip_taskbar(true);

            let main_window = win_builder.build().unwrap();
            main_window.center().unwrap();
            main_window.set_ignore_cursor_events(true);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_diablo_rect, 
            commands::press_key, 
            commands::is_diablo_focused
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
