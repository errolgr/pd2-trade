use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

#[cfg(target_os = "windows")]
use windows_sys::Win32::Foundation::RECT;

#[cfg(target_os = "windows")]
use windows_sys::Win32::UI::WindowsAndMessaging::{SystemParametersInfoW, SPI_GETWORKAREA};

pub mod modules;

// Re-export modules for easier access
pub use modules::{commands, keyboard, system, webview, window};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "windows")]
    if !system::is_elevated() {
        system::restart_as_admin();
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_app_exit::init())
        .setup(|app| {
            let _handle = app.app_handle();

            #[cfg(target_os = "windows")]
            let (x, y, width, height) = {
                // Try to get Diablo II window bounds
                if let Some(rect) = window::get_diablo_rect() {
                    (
                        rect.x as f64,
                        rect.y as f64,
                        rect.width as f64,
                        rect.height as f64,
                    )
                } else {
                    // Fallback to work area
                    let mut work_area = RECT {
                        left: 0,
                        top: 0,
                        right: 0,
                        bottom: 0,
                    };
                    unsafe {
                        SystemParametersInfoW(
                            SPI_GETWORKAREA,
                            0,
                            &mut work_area as *mut _ as *mut _,
                            0,
                        );
                    }
                    let width = (work_area.right - work_area.left) as f64;
                    let height = (work_area.bottom - work_area.top) as f64;
                    let x = work_area.left as f64;
                    let y = work_area.top as f64;
                    (x, y, width, height)
                }
            };

            #[cfg(not(target_os = "windows"))]
            let (x, y, width, height) = {
                let monitor = app.primary_monitor().unwrap().unwrap();
                let size = monitor.size();
                let position = monitor.position();
                (
                    position.x as f64,
                    position.y as f64,
                    size.width as f64,
                    size.height as f64,
                )
            };

            let win_builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
                .title("PD2 Trader")
                .inner_size(width, height)
                .position(x, y)
                .decorations(false)
                .transparent(true)
                .visible(true)
                .shadow(false)
                .always_on_top(true)
                .skip_taskbar(true);

            let main_window = win_builder.build().unwrap();
            main_window.set_ignore_cursor_events(true);
            #[cfg(debug_assertions)]
            main_window.open_devtools();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_diablo_rect,
            commands::press_key,
            commands::is_diablo_focused,
            commands::open_project_diablo2_webview
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
