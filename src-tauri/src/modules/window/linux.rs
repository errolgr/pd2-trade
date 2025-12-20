use super::{PopupRect, WindowRect};
use std::collections::HashMap;
use std::error::Error;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::Manager; // Ensure Manager is imported for get_webview_window
use tauri::{AppHandle, Emitter};
use x11rb::connection::Connection;
use x11rb::protocol::xproto::{AtomEnum, ConnectionExt, Window};

// Use a persistent connection to avoid reconnecting on every call
use once_cell::sync::Lazy;
use std::sync::Mutex;
use x11rb::rust_connection::RustConnection;

// We use a Lazy Mutex to hold the connection.
static X11_CONNECTION: Lazy<Mutex<Option<(RustConnection, usize)>>> =
    Lazy::new(|| Mutex::new(x11rb::connect(None).ok()));

// Helper to get access to the connection
fn with_connection<F, T>(f: F) -> Option<T>
where
    F: FnOnce(&RustConnection, usize) -> T,
{
    // Try to lock the global connection
    if let Ok(mut guard) = X11_CONNECTION.lock() {
        // Initialize if empty (retry connect) - simple retry logic
        if guard.is_none() {
            *guard = x11rb::connect(None).ok();
        }

        if let Some((conn, screen_num)) = &*guard {
            return Some(f(conn, *screen_num));
        }
    }
    None
}

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

pub fn get_window_name(conn: &impl Connection, window: Window) -> Result<String, Box<dyn Error>> {
    // Optimization: Pipelining here would be good but for now let's rely on persistent connection
    let net_wm_name_cookie = conn.intern_atom(false, b"_NET_WM_NAME")?;
    let utf8_string_cookie = conn.intern_atom(false, b"UTF8_STRING")?;

    // Blocking waits for atoms
    let net_wm_name = net_wm_name_cookie.reply()?.atom;
    let utf8_string = utf8_string_cookie.reply()?.atom;

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

    let clients =
        get_property_u32(conn, root, net_client_list, AtomEnum::WINDOW.into())?.unwrap_or_default();

    for window in &clients {
        if let Ok(name) = get_window_name(conn, *window) {
            if name.contains("Diablo II") {
                return Ok(Some(*window));
            }
        }
    }
    Ok(None)
}

pub fn get_diablo_rect(_app: &AppHandle) -> Option<WindowRect> {
    with_connection(|conn, _screen_num| {
        // Find window
        let window = match find_diablo_window(conn) {
            Ok(Some(w)) => w,
            _ => {
                return None;
            }
        };

        // Get geometry
        let geom = conn.get_geometry(window).ok()?.reply().ok()?;

        // Translate coordinates to root (absolute position)
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
    })
    .flatten()
}

pub fn is_diablo_focused() -> bool {
    with_connection(|conn, screen_num| {
        let screen = &conn.setup().roots[screen_num];
        let root = screen.root;

        // Pipeline atom requests
        let net_active_window_cookie = conn.intern_atom(false, b"_NET_ACTIVE_WINDOW");
        let net_wm_pid_cookie = conn.intern_atom(false, b"_NET_WM_PID");
        let net_wm_name_cookie = conn.intern_atom(false, b"_NET_WM_NAME");
        let utf8_string_cookie = conn.intern_atom(false, b"UTF8_STRING");

        let net_active_window = net_active_window_cookie
            .ok()
            .and_then(|c| c.reply().ok())
            .map(|r| r.atom)
            .unwrap_or(0);
        let net_wm_pid = net_wm_pid_cookie
            .ok()
            .and_then(|c| c.reply().ok())
            .map(|r| r.atom)
            .unwrap_or(0);
        let net_wm_name = net_wm_name_cookie
            .ok()
            .and_then(|c| c.reply().ok())
            .map(|r| r.atom)
            .unwrap_or(0);
        let utf8_string = utf8_string_cookie
            .ok()
            .and_then(|c| c.reply().ok())
            .map(|r| r.atom)
            .unwrap_or(0);

        if net_active_window == 0 {
            return false;
        }

        // Get Active Window Property
        let active_window =
            match get_property_u32(conn, root, net_active_window, AtomEnum::WINDOW.into()) {
                Ok(Some(v)) if !v.is_empty() => v[0],
                _ => return false,
            };

        // 1. Check PID (Own process check)
        if net_wm_pid != 0 {
            if let Ok(Some(pids)) =
                get_property_u32(conn, active_window, net_wm_pid, AtomEnum::CARDINAL.into())
            {
                if !pids.is_empty() && pids[0] == std::process::id() {
                    return true;
                }
            }
        }

        // 2. Check Name (Diablo II check)
        let check_name = |atom: u32, type_: u32| -> bool {
            if atom == 0 {
                return false;
            }
            if let Ok(reply) = conn.get_property(false, active_window, atom, type_, 0, 1024) {
                if let Ok(reply) = reply.reply() {
                    if reply.format == 8 && reply.value_len > 0 {
                        let name = String::from_utf8_lossy(&reply.value);
                        // Whitelist our own windows (via prefix) + Diablo II
                        // See src/lib/window-titles.ts for the common prefix
                        return name.contains("Diablo II") || name.contains("PD2Trade:");
                    }
                }
            }
            false
        };

        if check_name(net_wm_name, utf8_string) {
            return true;
        }
        if check_name(AtomEnum::WM_NAME.into(), AtomEnum::STRING.into()) {
            return true;
        }

        // Fallback
        match find_diablo_window(conn) {
            Ok(Some(dw)) => active_window == dw,
            _ => false,
        }
    })
    .unwrap_or(false)
}

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
    let d2 = get_diablo_rect(app);
    if let Some(rect) = &d2 {
        return Some(rect.clone());
    }
    let wa = get_work_area(app);
    wa
}

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

pub fn initialize_foreground_monitoring<F: Fn() + Send + 'static>(callback: F) {
    std::thread::spawn(move || {
        let (conn, screen_num) = match x11rb::connect(None) {
            Ok(c) => c,
            Err(e) => {
                eprintln!("Error connecting to X11 for foreground monitoring: {}", e);
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
            eprintln!("Error setting event mask: {}", e);
            return;
        }

        if let Err(e) = conn.flush() {
            eprintln!("Error flushing connection: {}", e);
            return;
        }

        let net_active_window = match get_atom(&conn, "_NET_ACTIVE_WINDOW") {
            Ok(a) => a,
            Err(e) => {
                eprintln!("Error getting _NET_ACTIVE_WINDOW atom: {}", e);
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
                    eprintln!("Error waiting for X11 event: {}", e);
                    // Prevent tight loop in case of repeated errors
                    std::thread::sleep(std::time::Duration::from_millis(1000));
                }
            }
        }
    });
}

pub fn cleanup_foreground_monitoring() {
    // No-op on Linux, as the thread will die with the app
    // or we could implement a kill signal but this is acceptable for now
}

static POPUP_RECTS: Lazy<Mutex<HashMap<String, Vec<PopupRect>>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));
static MONITORING_STARTED: AtomicBool = AtomicBool::new(false);

pub fn update_popup_rects(window_label: String, rects: Vec<PopupRect>) {
    if let Ok(mut guard) = POPUP_RECTS.lock() {
        guard.insert(window_label, rects);
    }
}

pub fn start_cursor_monitoring(app_handle: AppHandle) {
    if MONITORING_STARTED.swap(true, Ordering::SeqCst) {
        return; // Already started
    }

    std::thread::spawn(move || {
        let (conn, screen_num) = match x11rb::connect(None) {
            Ok(c) => c,
            Err(e) => {
                eprintln!("Error connecting to X11 for cursor monitoring: {}", e);
                return;
            }
        };

        let root = conn.setup().roots[screen_num].root;
        let mut last_states: HashMap<String, bool> = HashMap::new(); // label -> is_ignoring

        loop {
            // Poll at 20Hz (50ms)
            std::thread::sleep(std::time::Duration::from_millis(50));

            // Get cursor position
            let pointer = match conn.query_pointer(root) {
                Ok(cookie) => match cookie.reply() {
                    Ok(r) => r,
                    Err(_) => continue,
                },
                Err(_) => continue,
            };

            let cursor_x = pointer.root_x as f64;
            let cursor_y = pointer.root_y as f64;

            // Check each window
            let windows_to_check: Vec<(String, Vec<PopupRect>)> = {
                match POPUP_RECTS.lock() {
                    Ok(guard) => guard.iter().map(|(k, v)| (k.clone(), v.clone())).collect(),
                    Err(_) => continue,
                }
            };

            for (label, rects) in windows_to_check {
                if let Some(window) = app_handle.get_webview_window(&label) {
                    // Skip if window is not visible to avoid unnecessary work/IPC
                    if let Ok(false) = window.is_visible() {
                        continue;
                    }

                    // Get window position
                    if let Ok(pos) = window.outer_position() {
                        let win_x = pos.x as f64;
                        let win_y = pos.y as f64;

                        let rel_x = cursor_x - win_x;
                        let rel_y = cursor_y - win_y;

                        let is_over_popup = rects.iter().any(|r| {
                            rel_x >= r.left
                                && rel_x <= r.right
                                && rel_y >= r.top
                                && rel_y <= r.bottom
                        });

                        // If over popup, we want INTERACTIVE (ignore = false)
                        // If NOT over popup, we want CLICK-THROUGH (ignore = true)
                        let should_ignore = !is_over_popup;

                        // Check if state changed
                        let current_ignore = last_states.get(&label).copied().unwrap_or(false);

                        // Force update if not tracked yet (first run) or changed
                        let is_first_run = !last_states.contains_key(&label);

                        if is_first_run || current_ignore != should_ignore {
                            match window.set_ignore_cursor_events(should_ignore) {
                                Ok(_) => {
                                    last_states.insert(label, should_ignore);
                                }
                                Err(e) => {
                                    eprintln!(
                                        "Failed to set ignore cursor events for {}: {}",
                                        label, e
                                    );
                                }
                            }
                        }
                    }
                }
            }
        }
    });
}
