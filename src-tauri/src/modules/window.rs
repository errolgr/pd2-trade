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
        FindWindowW, GetForegroundWindow, GetWindowRect, SystemParametersInfoW,
        EVENT_SYSTEM_FOREGROUND, SPI_GETWORKAREA, WINEVENT_OUTOFCONTEXT,
    },
};

#[cfg(not(target_os = "windows"))]
#[derive(Serialize)]
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
    if hwnd == 0 {
        return false;
    }
    let foreground = unsafe { GetForegroundWindow() };
    hwnd == foreground
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

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppConfig {
    pd2_install_dir: Option<String>,
}

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

    pub fn find_diablo_window() -> Result<Option<Window>, Box<dyn Error>> {
        let (conn, screen_num) = x11rb::connect(None)?;
        let screen = &conn.setup().roots[screen_num];
        let root = screen.root;

        let net_client_list = get_atom(&conn, "_NET_CLIENT_LIST")?;

        let clients = get_property_u32(&conn, root, net_client_list, AtomEnum::WINDOW.into())?
            .unwrap_or_default();

        for window in clients {
            if let Ok(name) = get_window_name(&conn, window) {
                if name.contains("Diablo II") {
                    // Match partial name to be safe
                    return Ok(Some(window));
                }
            }
        }

        Ok(None)
    }

    pub fn get_diablo_rect() -> Option<WindowRect> {
        let (conn, _screen_num) = x11rb::connect(None).ok()?;

        // Find window
        let window = find_diablo_window().ok()??;

        // Get geometry
        let geom = conn.get_geometry(window).ok()?.reply().ok()?;

        // Translate coordinates to root (absolute position)
        // geom.x/y might be relative to parent.
        let tree = conn.query_tree(window).ok()?.reply().ok()?;
        let trans = conn
            .translate_coordinates(window, tree.root, 0, 0)
            .ok()?
            .reply()
            .ok()?;

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

        if let Ok(Some(diablo_window)) = find_diablo_window() {
            // In some WMs, the active window might be a child or frame.
            // But usually _NET_ACTIVE_WINDOW points to the client window.
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
        get_diablo_rect(app).or_else(|| get_work_area(app))
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
    // On Linux, use the actual focus state
    let initial_focus_state = is_diablo_focused();
    let _ = app_handle.emit("diablo-focus-changed", initial_focus_state);
    if let Some(callback) = &on_focus_change {
        callback(initial_focus_state);
    }
    // No event-driven monitoring for now, so focus state won't update dynamically.
    // This would require X11 event loop integration.
}

#[cfg(not(target_os = "windows"))]
pub fn initialize_foreground_monitoring<F: Fn() + Send + 'static>(_callback: F) {
    // No-op on Linux
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
