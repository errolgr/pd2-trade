use super::{Foreground, WindowRect};
use std::error::Error;
use tauri::AppHandle;
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

    let mut clients =
        get_property_u32(conn, root, net_client_list, AtomEnum::WINDOW.into())?.unwrap_or_default();
    // Some X servers don't keep a client list (xwayland-satellite); fall back to the mapped top-level windows.
    if clients.is_empty() {
        use x11rb::protocol::xproto::MapState;
        let children = conn.query_tree(root)?.reply()?.children;
        let attributes: Vec<_> = children
            .iter()
            .map(|&window| conn.get_window_attributes(window))
            .collect();
        clients = children
            .into_iter()
            .zip(attributes)
            .filter_map(|(window, cookie)| {
                let viewable = cookie.ok()?.reply().ok()?.map_state == MapState::VIEWABLE;
                viewable.then_some(window)
            })
            .collect();
    }

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

pub fn foreground() -> Foreground {
    with_connection(|conn, screen_num| {
        let root = conn.setup().roots[screen_num].root;

        let active_window = match get_atom(conn, "_NET_ACTIVE_WINDOW").ok().and_then(|atom| {
            get_property_u32(conn, root, atom, AtomEnum::WINDOW.into())
                .ok()
                .flatten()
        }) {
            Some(v) if !v.is_empty() && v[0] != 0 => v[0],
            // No X11 window active: a Wayland surface has the keyboard, possibly our layer-shell overlay
            _ if crate::modules::layer_shell::has_focus() => return Foreground::OwnWindow,
            _ => return Foreground::Other,
        };

        // Own window: same PID, or our title prefix (see src/lib/window-titles.ts)
        let own_pid = get_atom(conn, "_NET_WM_PID")
            .ok()
            .and_then(|atom| {
                get_property_u32(conn, active_window, atom, AtomEnum::CARDINAL.into())
                    .ok()
                    .flatten()
            })
            .is_some_and(|pids| pids.first() == Some(&std::process::id()));
        let name = get_window_name(conn, active_window).unwrap_or_default();

        if own_pid || name.starts_with("PD2Trader") {
            return Foreground::OwnWindow;
        }
        let diablo = find_diablo_window(conn).ok().flatten();
        if name.contains("Diablo II") || diablo == Some(active_window) {
            Foreground::Diablo
        } else {
            Foreground::Other
        }
    })
    .unwrap_or(Foreground::Other)
}

pub fn diablo_running() -> bool {
    with_connection(|conn, _| find_diablo_window(conn).ok().flatten().is_some()).unwrap_or(false)
}

/// Windows only (D2GL fullscreen hiding the overlay, see windows.rs): never reported here, so panels never take
/// the foreground just to be seen.
pub fn diablo_fullscreen() -> bool {
    false
}

/// Work area (monitor minus panels/taskbar) of the monitor containing the Diablo II window (by its center), else
/// the primary monitor's. Matches Windows, where covering the taskbar greys it out.
pub fn get_appropriate_window_bounds(app: &AppHandle) -> Option<WindowRect> {
    let work_area = |monitor: &tauri::Monitor| {
        let area = monitor.work_area();
        WindowRect {
            x: area.position.x,
            y: area.position.y,
            width: area.size.width as i32,
            height: area.size.height as i32,
        }
    };
    let contains = |monitor: &tauri::Monitor, x: i32, y: i32| {
        let (position, size) = (monitor.position(), monitor.size());
        x >= position.x
            && x < position.x + size.width as i32
            && y >= position.y
            && y < position.y + size.height as i32
    };

    if let Some(d2) = get_diablo_rect(app) {
        let (cx, cy) = (d2.x + d2.width / 2, d2.y + d2.height / 2);
        let containing = app.available_monitors().ok().and_then(|monitors| {
            monitors.iter().find(|m| contains(m, cx, cy)).map(work_area)
        });
        if containing.is_some() {
            return containing;
        }
    }

    app.primary_monitor().ok().flatten().as_ref().map(work_area)
}

/// Best-effort: activate, raise and focus the Diablo II window (EWMH + core X11).
pub fn focus_diablo() -> bool {
    use x11rb::protocol::xproto::{
        ClientMessageEvent, ConfigureWindowAux, EventMask, InputFocus, StackMode,
    };

    with_connection(|conn, screen_num| -> Result<bool, Box<dyn Error>> {
        let Some(window) = find_diablo_window(conn)? else {
            return Ok(false);
        };
        let root = conn.setup().roots[screen_num].root;

        // EWMH activation request (source indication 2 = pager, honoured by most WMs).
        let net_active_window = get_atom(conn, "_NET_ACTIVE_WINDOW")?;
        let activate = ClientMessageEvent::new(
            32,
            window,
            net_active_window,
            [2, x11rb::CURRENT_TIME, 0, 0, 0],
        );
        conn.send_event(
            false,
            root,
            EventMask::SUBSTRUCTURE_REDIRECT | EventMask::SUBSTRUCTURE_NOTIFY,
            activate,
        )?;

        // Fallback for WMs that ignore the request.
        conn.configure_window(window, &ConfigureWindowAux::new().stack_mode(StackMode::ABOVE))?;
        conn.set_input_focus(InputFocus::PARENT, window, x11rb::CURRENT_TIME)?;
        conn.flush()?;
        Ok(true)
    })
    .and_then(Result::ok)
    .unwrap_or(false)
}

pub fn initialize_foreground_monitoring<F: Fn() + Send + 'static>(callback: F) {
    let callback = std::sync::Arc::new(Mutex::new(callback));
    let layer_shell = crate::modules::layer_shell::is_active();
    if layer_shell {
        let on_focus = callback.clone();
        crate::modules::layer_shell::on_focus_change(Box::new(move || {
            if let Ok(callback) = on_focus.lock() {
                callback();
            }
        }));
    }
    let callback = move || {
        if layer_shell {
            std::thread::sleep(crate::modules::layer_shell::FOCUS_SETTLE);
        }
        if let Ok(callback) = callback.lock() {
            callback();
        }
    };
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
