use tauri::{Manager, WebviewUrl, WebviewWindowBuilder, TitleBarStyle};

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
       .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = app
                .get_webview_window("main")
                .expect("no main window")
                .set_focus();
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_app_exit::init())
        .setup(|app| {
            let _handle = app.app_handle();

            #[cfg(target_os = "windows")]
            let (x, y, width, height) = {
                // Get appropriate bounds based on Diablo focus state
                if let Some(rect) = window::get_appropriate_window_bounds() {
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
                .decorations(true)
                .shadow(false)
                .transparent(true)  
                .always_on_top(true)
                .skip_taskbar(true);

            let window = win_builder.build().unwrap();
            let _ = window.set_ignore_cursor_events(false);
            
            // Create toast window
            let toast_window = WebviewWindowBuilder::new(app, "toast", WebviewUrl::App("toast".into()))
                .title("PD2 Trader - Toast")
                .inner_size(400.0, 200.0)
                .decorations(false)
                .visible(false)
                .shadow(false)
                .transparent(true)
                .always_on_top(true)
                .skip_taskbar(true)
                .build()
                .unwrap();
            
            // Position the toast window initially
            
            // Initialize event-driven foreground monitoring
            let app_handle = app.app_handle().clone();
            let _ = commands::reposition_toast_window(app_handle.clone());
            window::initialize_foreground_monitoring(move || {
                let _ = commands::update_window_bounds(app_handle.clone());
                let _ = commands::reposition_toast_window(app_handle.clone());
            });
            
            #[cfg(debug_assertions)]
            window.open_devtools();

            #[cfg(target_os = "macos")]
            {
                use cocoa::appkit::{NSColor, NSWindow};
                use cocoa::base::{id, nil};

                // Note: If you have issues with this, consider setting the background color in your frontend CSS instead.
                let ns_window = window.ns_window().unwrap() as id;
                unsafe {
                    let bg_color = NSColor::colorWithRed_green_blue_alpha_(
                        nil, // use nil as the first argument
                        50.0 / 255.0,
                        158.0 / 255.0,
                        163.5 / 255.0,
                        0.0,
                    );
                    ns_window.setBackgroundColor_(bg_color);
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_diablo_rect,
            commands::press_key,
            commands::is_diablo_focused,
            commands::open_project_diablo2_webview,
            commands::update_window_bounds,
            commands::set_window_click_through,
            commands::force_window_focus,
            commands::reposition_toast_window,
            commands::open_accessibility_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
