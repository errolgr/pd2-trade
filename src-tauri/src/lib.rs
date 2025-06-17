use rdev::{listen, Event, EventType, Key as RdevKey};
use std::thread;
use tauri::{Emitter, Manager, Runtime, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_shell;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

fn spawn_global_key_listener<R: Runtime + 'static>(app_handle: tauri::AppHandle<R>) {
    use std::sync::{Arc, Mutex};

    let modifiers = Arc::new(Mutex::new(Vec::new()));
    let app_handle_clone = app_handle.clone();
    let modifiers_clone = Arc::clone(&modifiers);

    thread::spawn(move || {
        let listener = move |event: Event| {
            match event.event_type {
                EventType::KeyPress(key) => {
                    // Update modifier state
                    let mut mods = modifiers_clone.lock().unwrap();
                    if is_modifier(key) && !mods.contains(&key) {
                        mods.push(key);
                        return; // Don't emit on modifier press
                    }

                    // Compose and emit only when a main key is pressed
                    if let Some(main_key) = key_to_string(key) {
                        let combo = mods
                            .iter()
                            .filter_map(|k| key_to_string(*k))
                            .chain(std::iter::once(main_key))
                            .collect::<Vec<_>>()
                            .join("+");

                        if let Some(window) = app_handle_clone.get_webview_window("main") {
                            let _ = window.emit("key-pressed", combo);
                        }
                    }
                }
                EventType::KeyRelease(key) => {
                    let mut mods = modifiers_clone.lock().unwrap();
                    mods.retain(|&k| k != key);
                }
                _ => {}
            }
        };

        if let Err(e) = listen(listener) {
            eprintln!("Failed to listen to global events: {:?}", e);
        }
    });
}

fn is_modifier(key: RdevKey) -> bool {
    matches!(
        key,
        RdevKey::ControlLeft
            | RdevKey::ControlRight
            | RdevKey::ShiftLeft
            | RdevKey::ShiftRight
            | RdevKey::Alt
            | RdevKey::AltGr
    )
}

fn key_to_string(key: RdevKey) -> Option<&'static str> {
    use RdevKey::*;
    match key {
        KeyA => Some("A"),
        KeyB => Some("B"),
        KeyC => Some("C"),
        KeyD => Some("D"),
        KeyE => Some("E"),
        KeyF => Some("F"),
        KeyG => Some("G"),
        KeyH => Some("H"),
        KeyI => Some("I"),
        KeyJ => Some("J"),
        KeyK => Some("K"),
        KeyL => Some("L"),
        KeyM => Some("M"),
        KeyN => Some("N"),
        KeyO => Some("O"),
        KeyP => Some("P"),
        KeyQ => Some("Q"),
        KeyR => Some("R"),
        KeyS => Some("S"),
        KeyT => Some("T"),
        KeyU => Some("U"),
        KeyV => Some("V"),
        KeyW => Some("W"),
        KeyX => Some("X"),
        KeyY => Some("Y"),
        KeyZ => Some("Z"),

        ControlLeft => Some("ControlLeft"),
        ControlRight => Some("ControlRight"),
        Alt => Some("Alt"),
        AltGr => Some("AltGr"),
        ShiftLeft => Some("ShiftLeft"),
        ShiftRight => Some("ShiftRight"),

        _ => None,
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_app_exit::init())
        .setup(|app| {
            let handle = app.app_handle();

            let win_builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
                .title("PD2 Trader")
                .inner_size(1200.0, 750.0)
                .decorations(true)
                .transparent(false)
                .visible(true)
                .shadow(false)
                .skip_taskbar(false);

            spawn_global_key_listener(handle.clone());
            let main_window = win_builder.build().unwrap();
            main_window.center().unwrap();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
