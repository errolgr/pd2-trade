use serde::Serialize;

use tauri::Emitter;

#[cfg(target_os = "windows")]
use std::sync::Mutex;

#[cfg(target_os = "windows")]
use std::{ffi::OsStr, iter, os::windows::prelude::OsStrExt, ptr};

#[cfg(target_os = "windows")]
use windows_sys::Win32::{
    Foundation::{HWND, RECT},
    UI::Accessibility::{SetWinEventHook, UnhookWinEvent, HWINEVENTHOOK},
    UI::WindowsAndMessaging::{
        FindWindowW, GetForegroundWindow, GetWindowRect, GetWindowThreadProcessId,
        SystemParametersInfoW, EVENT_SYSTEM_FOREGROUND, SPI_GETWORKAREA, WINEVENT_OUTOFCONTEXT,
    },
};

#[cfg(not(target_os = "windows"))]
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WindowRect {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

#[cfg(target_os = "windows")]
fn to_wide(s: &str) -> Vec<u16> {
    OsStr::new(s).encode_wide().chain(iter::once(0)).collect()
}

#[cfg(target_os = "windows")]
pub fn get_diablo_rect() -> Option<WindowRect> {
    let title_w = to_wide("Diablo II");
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

#[cfg(not(target_os = "windows"))]
pub fn get_diablo_rect(_app: &AppHandle) -> Option<WindowRect> {
    linux_x11::get_diablo_rect()
}

#[cfg(target_os = "windows")]
pub fn is_diablo_focused() -> bool {
    let title_w = to_wide("Diablo II");
    let hwnd: HWND = unsafe { FindWindowW(ptr::null(), title_w.as_ptr()) };

    // 1. Check if Diablo II window was found
    if hwnd == 0 {
        return false;
    }

    let foreground = unsafe { GetForegroundWindow() };

    // 2. Check if Diablo II is the foreground window
    if hwnd == foreground {
        return true;
    }

    // 3. Check if the foreground window belongs to THIS application (PID check)
    // This prevents flickering when interacting with overlays (Chat, Settings, etc.)
    let mut foreground_pid: u32 = 0;
    unsafe { GetWindowThreadProcessId(foreground, &mut foreground_pid) };

    if foreground_pid == std::process::id() {
        return true;
    }

    false
}

#[cfg(not(target_os = "windows"))]
pub fn is_diablo_focused() -> bool {
    linux_x11::is_diablo_focused()
}

#[cfg(target_os = "windows")]
pub fn get_work_area() -> Option<WindowRect> {
    let mut work_area = RECT {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
    };
    let ok =
        unsafe { SystemParametersInfoW(SPI_GETWORKAREA, 0, &mut work_area as *mut _ as *mut _, 0) };
    if ok == 0 {
        return None;
    }
    Some(WindowRect {
        x: work_area.left,
        y: work_area.top,
        width: work_area.right - work_area.left,
        height: work_area.bottom - work_area.top,
    })
}

use tauri::AppHandle;

// --- X11 implementation for Linux ---

#[cfg(not(target_os = "windows"))]
mod linux_x11 {
    use super::WindowRect;
    use std::error::Error;
    use x11rb::connection::Connection;
    use x11rb::protocol::xproto::{AtomEnum, ConnectionExt, Window};

    pub fn get_atom(conn: &impl Connection, name: &str) -> Result<u32, Box<dyn Error>> {
        let reply = conn.intern_atom(false, name.as_bytes())?.reply()?;
        Ok(reply.atom)
    }

    pub fn get_property_u32(
        conn: &impl Connection,
        window: Window,
        property: u32,
        type_: u32,
    ) -> Result<Option<Vec<u32>>, Box<dyn Error>> {
        let reply = conn
            .get_property(false, window, property, type_, 0, 1024)?
            .reply()?;

        if reply.format == 32 && reply.value_len > 0 {
            Ok(Some(
                reply
                    .value32()
                    .ok_or(x11rb::errors::ConnectionError::ParseError(
                        x11rb::errors::ParseError::InvalidValue,
                    ))?
                    .collect(),
            ))
        } else {
            Ok(None)
        }
    }

    pub fn get_window_name(
        conn: &impl Connection,
        window: Window,
    ) -> Result<String, Box<dyn Error>> {
        let net_wm_name = get_atom(conn, "_NET_WM_NAME")?;
        let utf8_string = get_atom(conn, "UTF8_STRING")?;

        // Try _NET_WM_NAME first
        let reply = conn
            .get_property(false, window, net_wm_name, utf8_string, 0, 1024)?
            .reply()?;

        if reply.format == 8 && reply.value_len > 0 {
            return Ok(String::from_utf8_lossy(&reply.value).to_string());
        }

        // Fallback to WM_NAME
        let reply = conn
            .get_property(false, window, AtomEnum::WM_NAME, AtomEnum::STRING, 0, 1024)?
            .reply()?;

        if reply.format == 8 && reply.value_len > 0 {
            return Ok(String::from_utf8_lossy(&reply.value).to_string());
        }

        Ok(String::new())
    }

    pub fn find_diablo_window(conn: &impl Connection) -> Result<Option<Window>, Box<dyn Error>> {
        let screen = &conn.setup().roots[0]; // Assuming screen 0 is fine for finding root properties
        let root = screen.root;

        let net_client_list = get_atom(conn, "_NET_CLIENT_LIST")?;

        let clients = get_property_u32(conn, root, net_client_list, AtomEnum::WINDOW.into())?
            .unwrap_or_default();

        for window in &clients {
            if let Ok(name) = get_window_name(conn, *window) {
                // println!("DEBUG: Found window: '{}'", name);
                if name.contains("Diablo II") {
                    // println!("DEBUG: Match found! Window: '{}'", name);
                    // Match partial name to be safe
                    return Ok(Some(*window));
                }
            }
        }
        Ok(None)
    }

    pub fn get_diablo_rect() -> Option<WindowRect> {
        let (conn, _screen_num) = match x11rb::connect(None) {
            Ok(c) => c,
            Err(e) => {
                println!("DEBUG: get_diablo_rect connect failed: {}", e);
                return None;
            }
        };

        // Find window
        let window = match find_diablo_window(&conn) {
            Ok(Some(w)) => w,
            Ok(None) => {
                println!("DEBUG: get_diablo_rect: find_diablo_window returned None");
                return None;
            }
            Err(_) => {
                return None;
            }
        };

        // println!("DEBUG: get_diablo_rect working on window ID: {}", window);

        // Get geometry
        let geom_cookie = match conn.get_geometry(window) {
            Ok(c) => c,
            Err(_) => return None,
        };
        let geom = match geom_cookie.reply() {
            Ok(g) => g,
            Err(_) => return None,
        };

        // Translate coordinates to root (absolute position)
        let tree_cookie = match conn.query_tree(window) {
            Ok(c) => c,
            Err(_) => return None,
        };
        let tree = match tree_cookie.reply() {
            Ok(t) => t,
            Err(_) => return None,
        };

        let trans_cookie = match conn.translate_coordinates(window, tree.root, 0, 0) {
            Ok(c) => c,
            Err(_) => return None,
        };
        let trans = match trans_cookie.reply() {
            Ok(t) => t,
            Err(_) => return None,
        };

        Some(WindowRect {
            x: trans.dst_x as i32,
            y: trans.dst_y as i32,
            width: geom.width as i32,
            height: geom.height as i32,
        })
    }

    pub fn is_diablo_focused() -> bool {
        let (conn, screen_num) = match x11rb::connect(None) {
            Ok(c) => c,
            Err(_) => return false,
        };
        let screen = &conn.setup().roots[screen_num];
        let root = screen.root;

        let net_active_window = match get_atom(&conn, "_NET_ACTIVE_WINDOW") {
            Ok(a) => a,
            Err(_) => return false,
        };

        let active_window_prop =
            match get_property_u32(&conn, root, net_active_window, AtomEnum::WINDOW.into()) {
                Ok(Some(v)) => v,
                _ => return false,
            };

        if active_window_prop.is_empty() {
            return false;
        }

        let active_window = active_window_prop[0];

        // 1. Check if the active window belongs to THIS application (PID check)
        // This covers ALL app windows (Chat, Settings, Overlays, etc.) preventing flickering/hiding
        if let Ok(net_wm_pid) = get_atom(&conn, "_NET_WM_PID") {
            if let Ok(Some(pids)) =
                get_property_u32(&conn, active_window, net_wm_pid, AtomEnum::CARDINAL.into())
            {
                if !pids.is_empty() && pids[0] == std::process::id() {
                    return true;
                }
            }
        }

        // 2. Check if the active window is Diablo II (Name check)
        if let Ok(name) = get_window_name(&conn, active_window) {
            if name.contains("Diablo II") {
                return true;
            }
        }

        // Fallback: Check if it matches the found Diablo window ID directly
        if let Ok(Some(diablo_window)) = find_diablo_window(&conn) {
            return active_window == diablo_window;
        }

        false
    }
}

#[cfg(not(target_os = "windows"))]
pub fn get_work_area(app: &AppHandle) -> Option<WindowRect> {
    let monitor = app.primary_monitor().ok()??;
    let size = monitor.size();
    let position = monitor.position();

    Some(WindowRect {
        x: position.x,
        y: position.y,
        width: size.width as i32,
        height: size.height as i32,
    })
}

pub fn get_appropriate_window_bounds(app: &AppHandle) -> Option<WindowRect> {
    #[cfg(target_os = "windows")]
    {
        if is_diablo_focused() {
            get_diablo_rect()
        } else {
            get_work_area()
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        let d2 = get_diablo_rect(app);
        if let Some(rect) = &d2 {
            return Some(rect.clone());
        }
        let wa = get_work_area(app);
        wa
    }
}

// --- Event-driven foreground monitoring ---

#[cfg(target_os = "windows")]
static mut FOREGROUND_HOOK: Option<HWINEVENTHOOK> = None;

#[cfg(target_os = "windows")]
static CALLBACK: Mutex<Option<Box<dyn Fn() + Send>>> = Mutex::new(None);

#[cfg(target_os = "windows")]
unsafe extern "system" fn win_event_proc(
    _hWinEventHook: HWINEVENTHOOK,
    _event: u32,
    _hwnd: HWND,
    _idObject: i32,
    _idChild: i32,
    _dwEventThread: u32,
    _dwmsEventTime: u32,
) {
    if let Some(cb) = &*CALLBACK.lock().unwrap() {
        cb();
    }
}

#[cfg(target_os = "windows")]
pub fn initialize_foreground_monitoring<F: Fn() + Send + 'static>(callback: F) {
    unsafe {
        let hook = SetWinEventHook(
            EVENT_SYSTEM_FOREGROUND,
            EVENT_SYSTEM_FOREGROUND,
            0,
            Some(win_event_proc),
            0,
            0,
            WINEVENT_OUTOFCONTEXT,
        );
        FOREGROUND_HOOK = Some(hook);
        *CALLBACK.lock().unwrap() = Some(Box::new(callback));
    }
}

#[cfg(target_os = "windows")]
static DIABLO_FOCUS_STATE: Mutex<Option<bool>> = Mutex::new(None);

#[cfg(target_os = "windows")]
pub fn initialize_diablo_focus_monitoring(
    app_handle: AppHandle,
    on_focus_change: Option<Box<dyn Fn(bool) + Send + 'static>>,
) {
    let initial_focus_state = is_diablo_focused();

    // Store initial state
    *DIABLO_FOCUS_STATE.lock().unwrap() = Some(initial_focus_state);

    // Emit initial state
    let _ = app_handle.emit("diablo-focus-changed", initial_focus_state);

    // Call optional callback with initial state
    if let Some(ref callback) = on_focus_change {
        callback(initial_focus_state);
    }

    initialize_foreground_monitoring(move || {
        let current_focus_state = is_diablo_focused();
        let mut last_state = DIABLO_FOCUS_STATE.lock().unwrap();

        if let Some(last) = *last_state {
            if current_focus_state != last {
                *last_state = Some(current_focus_state);
                let _ = app_handle.emit("diablo-focus-changed", current_focus_state);

                // Call optional callback when focus changes
                if let Some(callback) = &on_focus_change {
                    callback(current_focus_state);
                }
            }
        } else {
            *last_state = Some(current_focus_state);
            let _ = app_handle.emit("diablo-focus-changed", current_focus_state);

            // Call optional callback
            if let Some(callback) = &on_focus_change {
                callback(current_focus_state);
            }
        }
    });
}

#[cfg(not(target_os = "windows"))]
pub fn initialize_diablo_focus_monitoring(
    app_handle: AppHandle,
    on_focus_change: Option<Box<dyn Fn(bool) + Send + 'static>>,
) {
    let initial_focus_state = is_diablo_focused();
    let _ = app_handle.emit("diablo-focus-changed", initial_focus_state);
    if let Some(ref callback) = on_focus_change {
        callback(initial_focus_state);
    }

    // State tracking to prevent duplicate events
    // We use Arc<Mutex<>> because the closure must be 'static
    use std::sync::{Arc, Mutex};
    let last_state = Arc::new(Mutex::new(Some(initial_focus_state)));

    // Use our new event-driven foreground monitoring, mirroring Windows structure
    initialize_foreground_monitoring(move || {
        let current_state = is_diablo_focused();

        let mut last_state_guard = last_state.lock().unwrap();
        // Only emit if state has changed
        if last_state_guard.unwrap_or(!current_state) != current_state {
            *last_state_guard = Some(current_state);
            let _ = app_handle.emit("diablo-focus-changed", current_state);
            if let Some(ref callback) = on_focus_change {
                callback(current_state);
            }
        }
    });
}

#[cfg(not(target_os = "windows"))]
pub fn initialize_foreground_monitoring<F: Fn() + Send + 'static>(callback: F) {
    std::thread::spawn(move || {
        let (conn, screen_num) = match x11rb::connect(None) {
            Ok(c) => c,
            Err(e) => {
                println!("Error connecting to X11 for foreground monitoring: {}", e);
                return;
            }
        };

        let screen = &conn.setup().roots[screen_num];
        let root = screen.root;

        // Subscribe to PropertyChange events on the root window
        use x11rb::connection::Connection;
        use x11rb::protocol::xproto::{ConnectionExt, EventMask, Property};
        if let Err(e) = conn.change_window_attributes(
            root,
            &x11rb::protocol::xproto::ChangeWindowAttributesAux::new()
                .event_mask(EventMask::PROPERTY_CHANGE),
        ) {
            println!("Error setting event mask: {}", e);
            return;
        }

        if let Err(e) = conn.flush() {
            println!("Error flushing connection: {}", e);
            return;
        }

        let net_active_window = match linux_x11::get_atom(&conn, "_NET_ACTIVE_WINDOW") {
            Ok(a) => a,
            Err(e) => {
                println!("Error getting _NET_ACTIVE_WINDOW atom: {}", e);
                return;
            }
        };

        loop {
            match conn.wait_for_event() {
                Ok(event) => {
                    use x11rb::protocol::Event;
                    if let Event::PropertyNotify(event) = event {
                        if event.atom == net_active_window && event.state == Property::NEW_VALUE {
                            callback();
                        }
                    }
                }
                Err(e) => {
                    println!("Error waiting for X11 event: {}", e);
                    // Prevent tight loop in case of repeated errors
                    std::thread::sleep(std::time::Duration::from_millis(1000));
                }
            }
        }
    });
}

#[cfg(target_os = "windows")]
pub fn cleanup_foreground_monitoring() {
    unsafe {
        if let Some(hook) = FOREGROUND_HOOK {
            UnhookWinEvent(hook);
            FOREGROUND_HOOK = None;
        }
        *CALLBACK.lock().unwrap() = None;
    }
}

#[cfg(not(target_os = "windows"))]
pub fn cleanup_foreground_monitoring() {
    // No-op on Linux
}
