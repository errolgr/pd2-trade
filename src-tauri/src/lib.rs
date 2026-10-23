use tauri::webview::PageLoadEvent;
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_global_shortcut::GlobalShortcutExt;

pub mod modules;

// Re-export modules for easier access
pub use modules::{chat_watcher, commands, debug_logger, keyboard, region, system, window};

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
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = app
                .get_webview_window(&modules::config::WINDOW_CONFIG.labels.Main)
                .expect("no main window")
                .set_focus();
        }))
        .plugin(tauri_plugin_app_exit::init())
        // Shortcuts registered by the page call back into it; after a reload they'd stay registered but
        // call into the dead page (and block re-registering). Rust registers none itself, so clear them all.
        .on_page_load(|webview, payload| {
            if payload.event() == PageLoadEvent::Started
                && webview.label() == modules::config::WINDOW_CONFIG.labels.Main
            {
                if let Err(e) = webview.app_handle().global_shortcut().unregister_all() {
                    eprintln!("Failed to clear global shortcuts on page load: {}", e);
                }
            }
        })
        .setup(|app| {
            // Initialize debug logger with app config directory
            if let Ok(config_dir) = app.path().app_config_dir() {
                debug_logger::init(config_dir);
            }

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

            // Single transparent always-on-top overlay hosting every UI panel. It never takes
            // focus on its own (the frontend toggles focusable while a panel needs the keyboard)
            // and only receives clicks inside the region set via `set_interactive_region`.
            let main_window = WebviewWindowBuilder::new(
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
            .focused(false)
            .focusable(false)
            .resizable(false)
            .shadow(false)
            .always_on_top(true)
            .skip_taskbar(true)
            .build()?;

            // The foreground tracking tells the overlay apart from our other windows (tray menu owner).
            // A tool window, so browsers beneath it don't take it for an opaque window and stop painting.
            #[cfg(target_os = "windows")]
            if let Ok(hwnd) = main_window.hwnd() {
                window::set_overlay_window(hwnd.0 as isize);
                window::keep_overlay_tool_window(hwnd.0 as isize);
            }
            // Click-through until the frontend reports its interactive rects.
            if let Err(e) = region::apply_region(&main_window, &[]) {
                eprintln!("Failed to seed empty interactive region: {}", e);
            }
            // The builder takes logical units; snap to the exact physical work-area rect.
            let _ = commands::update_window_bounds(app.app_handle().clone());

            // Game focus context (emits `diablo-focus-changed`, see window::focus); re-fit the overlay
            // to the monitor Diablo is on.
            let app_handle_bounds = app.app_handle().clone();
            window::initialize_diablo_focus_monitoring(
                app.app_handle().clone(),
                Box::new(move |_in_game| {
                    let _ = commands::update_window_bounds(app_handle_bounds.clone());
                }),
            );

            #[cfg(debug_assertions)]
            main_window.open_devtools();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_diablo_rect,
            commands::press_key,
            commands::is_diablo_focused,
            commands::focus_diablo,
            commands::focus_overlay,
            commands::set_outside_click_watch,
            commands::update_window_bounds,
            region::set_interactive_region,
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
