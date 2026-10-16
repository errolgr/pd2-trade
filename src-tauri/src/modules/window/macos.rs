use super::WindowRect;
use std::ffi::c_void;
use std::ptr::NonNull;
use std::sync::atomic::{AtomicI32, Ordering};
use std::sync::Once;

use block2::RcBlock;
use objc2_app_kit::{NSWorkspace, NSWorkspaceDidActivateApplicationNotification};
use objc2_core_foundation::{
    CFArray, CFDictionary, CFNumber, CFRetained, CFString, CFType, CGPoint, CGRect, CGSize,
};
use objc2_core_graphics::{
    kCGNullWindowID, kCGWindowBounds, kCGWindowLayer, kCGWindowName, kCGWindowOwnerPID,
    CGRectMakeWithDictionaryRepresentation, CGWindowListCopyWindowInfo, CGWindowListOption,
};
use objc2_foundation::NSNotification;
use parking_lot::Mutex;
use tauri::{AppHandle, Emitter};

/// Diablo II runs through a Wine wrapper (CrossOver, Whisky, ...) on macOS; the wrapper keeps the
/// Windows title on the native window.
const DIABLO_TITLE: &str = "Diablo II";

// Accessibility API (HIServices). CGWindowList only exposes other apps' window titles with the
// Screen Recording permission; Accessibility, which global key listening and key simulation
// already require, exposes them as well.
type AXUIElementRef = *const c_void;
const AX_ERROR_SUCCESS: i32 = 0;
const AX_VALUE_CGPOINT: u32 = 1;
const AX_VALUE_CGSIZE: u32 = 2;
/// Bounds how long an unresponsive app can stall a lookup.
const AX_MESSAGING_TIMEOUT_SECS: f32 = 0.25;

#[link(name = "ApplicationServices", kind = "framework")]
extern "C" {
    fn AXUIElementCreateApplication(pid: i32) -> AXUIElementRef;
    fn AXUIElementCopyAttributeValue(
        element: AXUIElementRef,
        attribute: *const CFString,
        value: *mut *const CFType,
    ) -> i32;
    fn AXUIElementSetMessagingTimeout(element: AXUIElementRef, timeout_seconds: f32) -> i32;
    fn AXValueGetValue(value: *const CFType, value_type: u32, value_ptr: *mut c_void) -> bool;
}

fn ax_ref(element: &CFType) -> AXUIElementRef {
    element as *const CFType as AXUIElementRef
}

fn ax_attribute(element: &CFType, attribute: &str) -> Option<CFRetained<CFType>> {
    let attribute = CFString::from_str(attribute);
    let mut value: *const CFType = std::ptr::null();
    let err = unsafe { AXUIElementCopyAttributeValue(ax_ref(element), &*attribute, &mut value) };
    if err != AX_ERROR_SUCCESS {
        return None;
    }
    // Copy rule: the returned value is owned by the caller.
    NonNull::new(value as *mut CFType).map(|value| unsafe { CFRetained::from_raw(value) })
}

fn ax_window_frame(window: &CFType) -> Option<CGRect> {
    let position = ax_attribute(window, "AXPosition")?;
    let size = ax_attribute(window, "AXSize")?;
    let mut origin = CGPoint::new(0.0, 0.0);
    let mut extent = CGSize::new(0.0, 0.0);
    let ok = unsafe {
        AXValueGetValue(&*position, AX_VALUE_CGPOINT, (&mut origin as *mut CGPoint).cast())
            && AXValueGetValue(&*size, AX_VALUE_CGSIZE, (&mut extent as *mut CGSize).cast())
    };
    ok.then(|| CGRect::new(origin, extent))
}

/// Frame (in points) of the first window of `pid` whose title contains the Diablo title.
fn ax_find_diablo_window(pid: i32) -> Option<CGRect> {
    let app = NonNull::new(unsafe { AXUIElementCreateApplication(pid) } as *mut CFType)
        .map(|app| unsafe { CFRetained::from_raw(app) })?;
    unsafe { AXUIElementSetMessagingTimeout(ax_ref(&app), AX_MESSAGING_TIMEOUT_SECS) };

    let windows = ax_attribute(&app, "AXWindows")?.downcast::<CFArray>().ok()?;
    // SAFETY: AXWindows is an array of AXUIElements, which are CFTypes.
    let windows: CFRetained<CFArray<CFType>> = unsafe { CFRetained::cast_unchecked(windows) };
    (0..windows.len())
        .filter_map(|i| windows.get(i))
        .find(|window| {
            ax_attribute(window, "AXTitle")
                .and_then(|title| title.downcast::<CFString>().ok())
                .is_some_and(|title| title.to_string().contains(DIABLO_TITLE))
        })
        .and_then(|window| ax_window_frame(&window))
}

struct OnScreenWindow {
    pid: i32,
    /// `None` when the title is hidden (no Screen Recording permission).
    title: Option<String>,
    bounds: CGRect,
}

/// Normal-level on-screen windows, front to back.
fn on_screen_windows() -> Vec<OnScreenWindow> {
    let options =
        CGWindowListOption::OptionOnScreenOnly | CGWindowListOption::ExcludeDesktopElements;
    let Some(list) = CGWindowListCopyWindowInfo(options, kCGNullWindowID) else {
        return Vec::new();
    };
    // SAFETY: CGWindowListCopyWindowInfo returns an array of CFDictionary<CFString, CFType>.
    let list: CFRetained<CFArray<CFDictionary<CFString, CFType>>> =
        unsafe { CFRetained::cast_unchecked(list) };

    let number = |info: &CFDictionary<CFString, CFType>, key: &CFString| {
        info.get(key)?.downcast::<CFNumber>().ok()?.as_i64()
    };

    (0..list.len())
        .filter_map(|i| list.get(i))
        .filter_map(|info| {
            if number(&info, unsafe { kCGWindowLayer })? != 0 {
                return None;
            }
            let pid = i32::try_from(number(&info, unsafe { kCGWindowOwnerPID })?).ok()?;
            let title = info
                .get(unsafe { kCGWindowName })
                .and_then(|name| name.downcast::<CFString>().ok())
                .map(|name| name.to_string());
            let bounds_dict = info
                .get(unsafe { kCGWindowBounds })?
                .downcast::<CFDictionary>()
                .ok()?;
            let mut bounds = CGRect::new(CGPoint::new(0.0, 0.0), CGSize::new(0.0, 0.0));
            unsafe { CGRectMakeWithDictionaryRepresentation(Some(&bounds_dict), &mut bounds) }
                .then_some(OnScreenWindow { pid, title, bounds })
        })
        .collect()
}

/// Last process that owned the Diablo window; checked first on the Accessibility path.
static LAST_DIABLO_PID: AtomicI32 = AtomicI32::new(0);

/// Owner pid and frame (in points, top-left origin) of the on-screen Diablo II window.
fn find_diablo_window() -> Option<(i32, CGRect)> {
    let windows = on_screen_windows();

    if let Some(window) = windows
        .iter()
        .find(|w| w.title.as_deref().is_some_and(|t| t.contains(DIABLO_TITLE)))
    {
        return Some((window.pid, window.bounds));
    }

    // Titles are hidden without Screen Recording; ask the owners of untitled windows via
    // Accessibility, starting with the previous owner.
    let own_pid = std::process::id() as i32;
    let last_pid = LAST_DIABLO_PID.load(Ordering::Relaxed);
    let mut candidates: Vec<i32> = Vec::new();
    if windows.iter().any(|w| w.pid == last_pid) {
        candidates.push(last_pid);
    }
    for window in &windows {
        if window.title.is_none() && window.pid != own_pid && !candidates.contains(&window.pid) {
            candidates.push(window.pid);
        }
    }

    candidates.into_iter().find_map(|pid| {
        let frame = ax_find_diablo_window(pid)?;
        LAST_DIABLO_PID.store(pid, Ordering::Relaxed);
        Some((pid, frame))
    })
}

/// Scale factor of the monitor containing the point (in points), else the primary monitor's.
fn scale_factor_at(app: &AppHandle, x: f64, y: f64) -> f64 {
    let containing = app.available_monitors().ok().and_then(|monitors| {
        monitors.into_iter().find_map(|monitor| {
            let scale = monitor.scale_factor();
            let left = monitor.position().x as f64 / scale;
            let top = monitor.position().y as f64 / scale;
            let width = monitor.size().width as f64 / scale;
            let height = monitor.size().height as f64 / scale;
            (x >= left && x < left + width && y >= top && y < top + height).then_some(scale)
        })
    });
    containing
        .or_else(|| app.primary_monitor().ok().flatten().map(|m| m.scale_factor()))
        .unwrap_or(1.0)
}

pub fn get_diablo_rect(app: &AppHandle) -> Option<WindowRect> {
    let (_, frame) = find_diablo_window()?;
    let scale = scale_factor_at(
        app,
        frame.origin.x + frame.size.width / 2.0,
        frame.origin.y + frame.size.height / 2.0,
    );
    // Callers expect physical pixels, like the Windows and X11 backends report.
    Some(WindowRect {
        x: (frame.origin.x * scale).round() as i32,
        y: (frame.origin.y * scale).round() as i32,
        width: (frame.size.width * scale).round() as i32,
        height: (frame.size.height * scale).round() as i32,
    })
}

pub fn is_diablo_focused() -> bool {
    let Some(frontmost) = NSWorkspace::sharedWorkspace().frontmostApplication() else {
        return false;
    };
    let frontmost_pid = frontmost.processIdentifier();

    // Our own overlay windows count as focused, so interacting with them doesn't hide them.
    if frontmost_pid == std::process::id() as i32 {
        return true;
    }

    find_diablo_window().is_some_and(|(pid, _)| pid == frontmost_pid)
}

pub fn get_work_area(app: &AppHandle) -> Option<WindowRect> {
    let monitor = app.primary_monitor().ok()??;
    let area = monitor.work_area();
    Some(WindowRect {
        x: area.position.x,
        y: area.position.y,
        width: area.size.width as i32,
        height: area.size.height as i32,
    })
}

pub fn get_appropriate_window_bounds(app: &AppHandle) -> Option<WindowRect> {
    if is_diablo_focused() {
        get_diablo_rect(app).or_else(|| get_work_area(app))
    } else {
        get_work_area(app)
    }
}

// --- Event-driven foreground monitoring ---

static CALLBACK: Mutex<Option<Box<dyn Fn() + Send>>> = Mutex::new(None);
static OBSERVER: Once = Once::new();

pub fn initialize_foreground_monitoring<F: Fn() + Send + 'static>(callback: F) {
    *CALLBACK.lock() = Some(Box::new(callback));

    OBSERVER.call_once(|| {
        let block = RcBlock::new(|_notification: NonNull<NSNotification>| {
            if let Some(cb) = &*CALLBACK.lock() {
                cb();
            }
        });
        let center = NSWorkspace::sharedWorkspace().notificationCenter();
        // No queue: delivered on the posting thread, the main thread for workspace notifications.
        let observer = unsafe {
            center.addObserverForName_object_queue_usingBlock(
                Some(NSWorkspaceDidActivateApplicationNotification),
                None,
                None,
                &block,
            )
        };
        // Lives as long as the app; cleanup only clears the callback.
        std::mem::forget(observer);
    });
}

static DIABLO_FOCUS_STATE: Mutex<Option<bool>> = Mutex::new(None);

pub fn initialize_diablo_focus_monitoring(
    app_handle: AppHandle,
    on_focus_change: Option<Box<dyn Fn(bool) + Send + 'static>>,
) {
    let initial_focus_state = is_diablo_focused();
    *DIABLO_FOCUS_STATE.lock() = Some(initial_focus_state);
    let _ = app_handle.emit("diablo-focus-changed", initial_focus_state);
    if let Some(callback) = &on_focus_change {
        callback(initial_focus_state);
    }

    initialize_foreground_monitoring(move || {
        let current_focus_state = is_diablo_focused();
        let mut last_state = DIABLO_FOCUS_STATE.lock();
        if *last_state != Some(current_focus_state) {
            *last_state = Some(current_focus_state);
            let _ = app_handle.emit("diablo-focus-changed", current_focus_state);
            if let Some(callback) = &on_focus_change {
                callback(current_focus_state);
            }
        }
    });
}

pub fn cleanup_foreground_monitoring() {
    *CALLBACK.lock() = None;
}
