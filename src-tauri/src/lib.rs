use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

#[cfg(target_os = "windows")]
use windows_sys::Win32::Foundation::RECT;

#[cfg(target_os = "windows")]
use windows_sys::Win32::UI::WindowsAndMessaging::{SystemParametersInfoW, SPI_GETWORKAREA};

pub mod modules;

// Re-export modules for easier access
pub use modules::{chat_watcher, commands, debug_logger, keyboard, system, window};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "windows")]
    if !system::is_elevated() {
        system::restart_as_admin();
    }

    // In debug builds, kill any orphaned elevated instances of ourselves
    // before continuing. The auto-elevation above detaches the elevated
    // process from `tauri dev`'s process tree, so on rebuild dev can't
    // kill it; without this, every restart leaves a tray icon behind and
    // single-instance's IPC can't reliably bridge across UAC integrity
    // levels to deduplicate.
    #[cfg(all(target_os = "windows", debug_assertions))]
    system::kill_other_instances();

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
                .with_denylist(&["SignIn"])
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
            // Initialize debug logger with app config directory
            if let Ok(config_dir) = app.path().app_config_dir() {
                debug_logger::init(config_dir);
            }

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

            // Initialize window state saving on focus/blur events
            window::initialize_window_state_saving(app.app_handle().clone());

            #[cfg(debug_assertions)]
            main_window.open_devtools();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_diablo_rect,
            commands::press_key,
            commands::is_diablo_focused,
            commands::update_window_bounds,
            commands::set_window_click_through,
            commands::force_window_focus,
            commands::reposition_toast_window,
            commands::start_chat_watcher,
            commands::stop_chat_watcher,
            commands::get_diablo2_directory,
            commands::auto_detect_diablo2_directory,
            commands::open_oauth_url,
            commands::write_debug_logs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
