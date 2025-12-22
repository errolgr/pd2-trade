use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

#[cfg(target_os = "windows")]
use windows_sys::Win32::Foundation::RECT;

#[cfg(target_os = "windows")]
use windows_sys::Win32::UI::WindowsAndMessaging::{SystemParametersInfoW, SPI_GETWORKAREA};

pub mod modules;

// Re-export modules for easier access
pub use modules::{chat_watcher, commands, keyboard, system, webview, window};

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
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_filename("window-state.json")
                .with_state_flags(tauri_plugin_window_state::StateFlags::all())
                .with_denylist(&[])
                .build(),
        )
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = app
                .get_webview_window(&modules::config::WINDOW_CONFIG.labels.Main)
                .expect("no main window")
                .set_focus();
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_app_exit::init())
        .setup(|app| {
            let _handle = app.app_handle();

            let (x, y, width, height) =
                match window::get_appropriate_window_bounds(app.app_handle()) {
                    Some(rect) => (
                        rect.x as f64,
                        rect.y as f64,
                        rect.width as f64,
                        rect.height as f64,
                    ),
                    None => {
                        eprintln!("Warning: Using default window bounds.");
                        (0.0, 0.0, 1920.0, 1080.0)
                    }
                };

            let win_builder = WebviewWindowBuilder::new(
                app,
                &modules::config::WINDOW_CONFIG.labels.Main,
                WebviewUrl::default(),
            )
            .title(&modules::config::WINDOW_CONFIG.titles.Main)
            .inner_size(width, height)
            .position(x, y)
            .decorations(false)
            .transparent(true)
            .visible(true)
            .focused(true)
            .shadow(false)
            .always_on_top(true)
            .skip_taskbar(true);

            let main_window = win_builder.build().unwrap();
            let _ = main_window.set_ignore_cursor_events(true);

            // Create toast window
            let _toast_window = WebviewWindowBuilder::new(
                app,
                &modules::config::WINDOW_CONFIG.labels.Toast,
                WebviewUrl::App("toast".into()),
            )
            .title(&modules::config::WINDOW_CONFIG.titles.Toast)
            .inner_size(400.0, 200.0)
            .decorations(false)
            .transparent(true)
            .visible(false)
            .shadow(false)
            .always_on_top(true)
            .skip_taskbar(true)
            .focusable(false)
            .build()
            .unwrap();

            // Position the toast window initially
            let app_handle = app.app_handle().clone();
            let _ = commands::reposition_toast_window(app_handle.clone());

            // Initialize Diablo focus monitoring (hotkeys & window repositioning)
            let app_handle_bounds = app.app_handle().clone();
            let app_handle_focus = app.app_handle().clone();
            window::initialize_diablo_focus_monitoring(
                app_handle_focus,
                Some(Box::new(move |_is_focused| {
                    // Reposition windows when Diablo focus changes
                    let _ = commands::update_window_bounds(app_handle_bounds.clone());
                    let _ = commands::reposition_toast_window(app_handle_bounds.clone());
                })),
            );

            // Start background tracking thread for window movement
            window::start_tracking_thread(app.app_handle().clone());

            #[cfg(debug_assertions)]
            main_window.open_devtools();
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
            commands::start_chat_watcher,
            commands::stop_chat_watcher,
            commands::get_diablo2_directory,
            commands::auto_detect_diablo2_directory,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
