use rdev::{listen, Event, EventType, Key as RdevKey};
use serde::Serialize;
use std::{ffi::OsStr, iter, os::windows::prelude::OsStrExt, ptr};
use tauri::{Emitter, Manager, Runtime, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_shell;
use std::{thread};
use EventType::KeyRelease;
use windows_sys::Win32::{Foundation::{HWND, RECT}, UI::WindowsAndMessaging::{FindWindowW, GetWindowRect}};
use enigo::{Enigo, Key, Settings, Direction, Keyboard};

#[tauri::command]

fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

fn to_wide(s: &str) -> Vec<u16> {
    OsStr::new(s).encode_wide().chain(iter::once(0)).collect()
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WindowRect {
    x: i32,
    y: i32,
    width: i32,
    height: i32,
}

#[tauri::command]
fn get_diablo_rect() -> Option<WindowRect> {
    let title_w = to_wide("Diablo II");
    // NULL class (we don't care), title pointer
    let hwnd: HWND = unsafe { FindWindowW(ptr::null(), title_w.as_ptr()) };
    if hwnd == 0 {
        return None;
    }

    let mut r = RECT {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
    };
    let ok = unsafe { GetWindowRect(hwnd, &mut r as *mut RECT) };
    if ok == 0 {
        return None;
    }

    Some(WindowRect {
        x: r.left,
        y: r.top,
        width: r.right - r.left,
        height: r.bottom - r.top,
    })
}

fn str_to_keys(seq: &str) -> Result<(Vec<Key>, Key), String> {
    let mut mods = Vec::<Key>::new();
    let mut main: Option<Key> = None;

    println!("[str_to_keys] Parsing sequence: {}", seq);

    for part in seq.split('+') {
        match part.to_ascii_lowercase().as_str() {
            "ctrl" | "control" => {
                println!("  -> Found modifier: Ctrl");
                mods.push(Key::Control);
            },
            "alt" => {
                println!("  -> Found modifier: Alt");
                mods.push(Key::Alt);
            },
            "shift" => {
                println!("  -> Found modifier: Shift");
                mods.push(Key::Shift);
            },
            "cmd" | "command" => {
                println!("  -> Found modifier: Meta");
                mods.push(Key::Meta);
            },
            k if k.len() == 1 => {
                let ch = k.chars().next().unwrap();
                println!("  -> Found layout key: {}", ch);
                main = Some(Key::Unicode(ch));
            },
            k if k.starts_with('f') && k.len() <= 3 => {
                if let Ok(n) = k[1..].parse::<u8>() {
                    main = Some(match n {
                        1 => Key::F1,
                        2 => Key::F2,
                        3 => Key::F3,
                        4 => Key::F4,
                        5 => Key::F5,
                        6 => Key::F6,
                        7 => Key::F7,
                        8 => Key::F8,
                        9 => Key::F9,
                        10 => Key::F10,
                        11 => Key::F11,
                        12 => Key::F12,
                        _ => {
                            let err = format!("Unsupported function key: F{}", n);
                            println!("[str_to_keys] Error: {}", err);
                            return Err(err);
                        }
                    });
                }
            },
            _ => {
                let err = format!("Unsupported fragment: {part}");
                println!("[str_to_keys] Error: {}", err);
                return Err(err);
            }
        }
    }

    let main = main.ok_or_else(|| {
        let err = "No main key found".to_string();
        println!("[str_to_keys] Error: {}", err);
        err
    })?;

    Ok((mods, main))
}


#[tauri::command]
fn press_key(sequence: String) -> Result<(), String> {
    println!("[press_key] Received sequence: {}", sequence);

    let (mods, main) = str_to_keys(&sequence)?;
    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| format!("Failed to init Enigo: {:?}", e))?;

    println!("[press_key] Pressing modifiers...");
    for m in &mods {
        println!("  -> Down: {:?}", m);
        enigo.key(*m, Direction::Press).map_err(|e| e.to_string())?;
    }

    println!("[press_key] Pressing main key: {:?}", main);
    enigo.key(main, Direction::Click).map_err(|e| e.to_string())?;

    println!("[press_key] Releasing modifiers...");
    for m in mods.iter().rev() {
        println!("  -> Up: {:?}", m);
        enigo.key(*m, Direction::Release).map_err(|e| e.to_string())?;
    }

    println!("[press_key] Done.");
    Ok(())
}

#[cfg(target_os = "windows")]
fn is_elevated() -> bool {
    use std::mem::size_of;
    use std::ptr;
    use windows_sys::Win32::{
        Foundation::CloseHandle,
        Security::{GetTokenInformation, TokenElevation, TOKEN_ELEVATION, TOKEN_QUERY},
        System::Threading::{GetCurrentProcess, OpenProcessToken},
    };

    unsafe {
        let mut token = 0;
        // OpenProcessToken is in System::Threading
        if OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token) == 0 {
            return false;
        }
        let mut elevation = TOKEN_ELEVATION { TokenIsElevated: 0 };
        let mut ret_size = 0;
        // GetTokenInformation stays in Security
        let ok = GetTokenInformation(
            token,
            TokenElevation,
            &mut elevation as *mut _ as *mut _,
            size_of::<TOKEN_ELEVATION>() as u32,
            &mut ret_size,
        ) != 0;
        CloseHandle(token);
        ok && elevation.TokenIsElevated != 0
    }
}

#[cfg(target_os = "windows")]
fn restart_as_admin() {
    use std::{ffi::OsStr, os::windows::ffi::OsStrExt, process::exit, ptr};
    use windows_sys::Win32::UI::Shell::{ShellExecuteW, SEE_MASK_NOASYNC};
    use windows_sys::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;

    let exe = std::env::current_exe().unwrap();
    let args: Vec<String> = std::env::args().skip(1).collect();
    let params = args.join(" ");

    let to_wide = |s: &OsStr| {
        let mut v: Vec<u16> = s.encode_wide().collect();
        v.push(0);
        v
    };

    unsafe {
        ShellExecuteW(
            0,                                     // HWND = null
            to_wide(OsStr::new("runas")).as_ptr(), // lpOperation
            to_wide(exe.as_os_str()).as_ptr(),     // lpFile
            if params.is_empty() {
                std::ptr::null()
            } else {
                to_wide(OsStr::new(&params)).as_ptr()
            }, // lpParameters
            std::ptr::null(),                      // lpDirectory
            SW_SHOWNORMAL,                         // nShowCmd
        );
    }
    exit(0);
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
                KeyRelease(key) => {
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
        KeyA => Some("a"),
        KeyB => Some("b"),
        KeyC => Some("c"),
        KeyD => Some("d"),
        KeyE => Some("e"),
        KeyF => Some("f"),
        KeyG => Some("g"),
        KeyH => Some("h"),
        KeyI => Some("i"),
        KeyJ => Some("j"),
        KeyK => Some("k"),
        KeyL => Some("l"),
        KeyM => Some("m"),
        KeyN => Some("n"),
        KeyO => Some("o"),
        KeyP => Some("p"),
        KeyQ => Some("q"),
        KeyR => Some("r"),
        KeyS => Some("s"),
        KeyT => Some("t"),
        KeyU => Some("u"),
        KeyV => Some("v"),
        KeyW => Some("w"),
        KeyX => Some("x"),
        KeyY => Some("y"),
        KeyZ => Some("z"),

        Num0 => Some("0"),
        Num1 => Some("1"),
        Num2 => Some("2"),
        Num3 => Some("3"),
        Num4 => Some("4"),
        Num5 => Some("5"),
        Num6 => Some("6"),
        Num7 => Some("7"),
        Num8 => Some("8"),
        Num9 => Some("9"),

        ControlLeft => Some("ctrl"),
        ControlRight => Some("ctrl"),
        Alt => Some("alt"),
        AltGr => Some("alt"),

        _ => None,
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "windows")]
    if !is_elevated() {
        restart_as_admin();
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
        .plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
            let _ = app
                .get_webview_window("main")
                .expect("no main window")
                .set_focus();
        }))
        .setup(|app| {
            let handle = app.app_handle();

            let win_builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
                .title("PD2 Trader")
                .inner_size(1200.0, 750.0)
                .decorations(false)
                .transparent(true)
                .visible(true)
                .shadow(false)
                .always_on_top(true)
                .skip_taskbar(true);

            spawn_global_key_listener(handle.clone());
            let main_window = win_builder.build().unwrap();
            main_window.center().unwrap();
            main_window.set_ignore_cursor_events(true);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_diablo_rect, press_key])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
