//! Wayland: the Main overlay as a wlr-layer-shell surface.
//!
//! A regular toplevel can't be the overlay there: the compositor places it (positions are ignored), keeps it
//! below fullscreen windows, and some compositors (niri) activate a window on any click inside its bounds,
//! ignoring the input region, so it is never click-through. A layer surface on the overlay layer covers a whole
//! monitor above everything and only takes input inside the region set by `region::apply_region`.

use crate::modules::window::WindowRect;
use gtk::prelude::*;
use gtk_layer_shell::{Edge, KeyboardMode, Layer, LayerShell};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Mutex, OnceLock};
use std::time::Duration;
use tauri::WebviewWindow;

/// Origin (logical px) of the monitor the overlay covers, once Main is a layer surface. Wayland doesn't report
/// window positions, so the frontend sees Main at 0,0 and screen rects must be made relative to this.
static ORIGIN: Mutex<Option<(i32, i32)>> = Mutex::new(None);

/// Whether the layer surface holds the keyboard. X11's _NET_ACTIVE_WINDOW only shows "none" then, the same as for
/// any other Wayland app, so this is what tells our overlay apart (see window::foreground).
static FOCUSED: AtomicBool = AtomicBool::new(false);
static ON_FOCUS_CHANGE: OnceLock<Box<dyn Fn() + Send + Sync>> = OnceLock::new();

/// How long a foreground change settles before it's read: the X11 active-window change and the Wayland keyboard
/// focus of the overlay arrive in no fixed order, and reading in between would end the game context.
pub const FOCUS_SETTLE: Duration = Duration::from_millis(150);

pub fn has_focus() -> bool {
    FOCUSED.load(Ordering::SeqCst)
}

/// Runs `callback` (after FOCUS_SETTLE, off the main thread) whenever the overlay gains or loses the keyboard;
/// leaving it for a Wayland app changes nothing on X11, so the foreground hook alone would miss that.
pub fn on_focus_change(callback: Box<dyn Fn() + Send + Sync>) {
    let _ = ON_FOCUS_CHANGE.set(callback);
}

fn set_focused(focused: bool) {
    FOCUSED.store(focused, Ordering::SeqCst);
    std::thread::spawn(|| {
        std::thread::sleep(FOCUS_SETTLE);
        if let Some(callback) = ON_FOCUS_CHANGE.get() {
            callback();
        }
    });
}

/// Turns Main into a layer surface; false (window untouched) when not running on Wayland. Main thread only.
pub fn init(window: &WebviewWindow) -> bool {
    if !gtk_layer_shell::is_supported() {
        return false;
    }
    let Ok(gtk_window) = window.gtk_window() else {
        return false;
    };
    // The layer role has to be set before the window is realized; tao realizes it on creation.
    gtk_window.hide();
    gtk_window.unrealize();
    gtk_window.init_layer_shell();
    gtk_window.set_layer(Layer::Overlay);
    gtk_window.set_namespace("pd2trader");
    for edge in [Edge::Top, Edge::Bottom, Edge::Left, Edge::Right] {
        gtk_window.set_anchor(edge, true);
    }
    gtk_window.set_exclusive_zone(-1);
    // Clicks only reach the panels (the input region), so the keyboard follows a click into a panel and goes
    // back to the game on a click outside, without the overlay taking focus on its own.
    gtk_window.set_keyboard_mode(KeyboardMode::OnDemand);
    gtk_window.connect_focus_in_event(|_, _| {
        set_focused(true);
        gtk::glib::Propagation::Proceed
    });
    gtk_window.connect_focus_out_event(|_, _| {
        set_focused(false);
        gtk::glib::Propagation::Proceed
    });
    gtk_window.set_resizable(true);
    gtk_window.show();
    // The compositor picked the monitor; fit to it (and record its origin) like move_to does.
    let monitor = gtk_window
        .window()
        .and_then(|gdk_window| gtk_window.display().monitor_at_window(&gdk_window));
    match monitor {
        Some(monitor) => fit(&gtk_window, &monitor),
        None => {
            if let Ok(mut origin) = ORIGIN.lock() {
                *origin = Some((0, 0));
            }
        }
    }
    true
}

/// Pins the surface to `monitor`, sized to cover it, and records the monitor's origin for `to_overlay`.
fn fit(gtk_window: &gtk::ApplicationWindow, monitor: &gtk::gdk::Monitor) {
    let g = monitor.geometry();
    if let Ok(mut origin) = ORIGIN.lock() {
        *origin = Some((g.x(), g.y()));
    }
    gtk_window.set_monitor(monitor);
    gtk_window.resize(g.width(), g.height());
}

pub fn is_active() -> bool {
    ORIGIN
        .lock()
        .map(|origin| origin.is_some())
        .unwrap_or(false)
}

/// Moves the overlay to the monitor containing the center of `bounds` (global logical px).
pub fn move_to(window: &WebviewWindow, bounds: WindowRect) {
    let target = window.clone();
    let _ = window.run_on_main_thread(move || {
        let Ok(gtk_window) = target.gtk_window() else {
            return;
        };
        let display = gtk_window.display();
        let (cx, cy) = (bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
        let monitor = (0..display.n_monitors())
            .filter_map(|i| display.monitor(i))
            .find(|m| {
                let g = m.geometry();
                cx >= g.x() && cx < g.x() + g.width() && cy >= g.y() && cy < g.y() + g.height()
            });
        let Some(monitor) = monitor else {
            return;
        };
        let g = monitor.geometry();
        if ORIGIN
            .lock()
            .is_ok_and(|origin| *origin == Some((g.x(), g.y())))
        {
            return;
        }
        fit(&gtk_window, &monitor);
    });
}

/// Screen rect relative to the overlay's monitor, so the frontend's `rect - outerPosition` (0,0 here) holds.
pub fn to_overlay(rect: WindowRect) -> WindowRect {
    let (ox, oy) = ORIGIN
        .lock()
        .ok()
        .and_then(|origin| *origin)
        .unwrap_or((0, 0));
    WindowRect {
        x: rect.x - ox,
        y: rect.y - oy,
        ..rect
    }
}
