use super::{Foreground, WindowRect};
use std::sync::atomic::{AtomicIsize, Ordering};
use std::sync::Mutex;
use std::{ffi::OsStr, iter, os::windows::prelude::OsStrExt, ptr};
use tauri::AppHandle;

use windows_sys::Win32::{
    Foundation::{HWND, POINT, RECT},
    Graphics::Gdi::{
        GetMonitorInfoW, MonitorFromPoint, MonitorFromWindow, HMONITOR, MONITORINFO,
        MONITOR_DEFAULTTONEAREST, MONITOR_DEFAULTTOPRIMARY,
    },
    System::Threading::{AttachThreadInput, GetCurrentThreadId},
    UI::Accessibility::{SetWinEventHook, UnhookWinEvent, HWINEVENTHOOK},
    UI::WindowsAndMessaging::{
        BringWindowToTop, FindWindowW, GetForegroundWindow, GetWindowRect,
        GetWindowThreadProcessId, IsIconic, SetForegroundWindow, ShowWindow,
        EVENT_SYSTEM_FOREGROUND, SW_RESTORE, WINEVENT_OUTOFCONTEXT,
    },
};

fn to_wide(s: &str) -> Vec<u16> {
    OsStr::new(s).encode_wide().chain(iter::once(0)).collect()
}

fn find_diablo_hwnd() -> Option<HWND> {
    let title_w = to_wide("Diablo II");
    let hwnd: HWND = unsafe { FindWindowW(ptr::null(), title_w.as_ptr()) };
    (hwnd != 0).then_some(hwnd)
}

pub fn get_diablo_rect(_app: &AppHandle) -> Option<WindowRect> {
    let hwnd = find_diablo_hwnd()?;
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

/// The overlay window (Main), the only one of ours that counts as `Foreground::OwnWindow`.
static OVERLAY_WINDOW: AtomicIsize = AtomicIsize::new(0);

pub fn set_overlay_window(hwnd: HWND) {
    OVERLAY_WINDOW.store(hwnd, Ordering::SeqCst);
}

pub fn foreground() -> Foreground {
    let mut window = unsafe { GetForegroundWindow() };
    if window == 0 {
        // Mid-activation Windows reports no foreground window; the hook already named the one activating.
        window = LAST_FOREGROUND_EVENT.load(Ordering::SeqCst);
    }
    let mut pid: u32 = 0;
    if window != 0 {
        unsafe { GetWindowThreadProcessId(window, &mut pid) };
    }
    classify(
        window,
        OVERLAY_WINDOW.load(Ordering::SeqCst),
        find_diablo_hwnd(),
        pid == std::process::id(),
    )
}

/// Foreground owner of `window`. Our windows other than the overlay carry no information, like no window at all:
/// the tray menu's owner window takes the foreground while the menu is open, which isn't the overlay.
fn classify(window: HWND, overlay: HWND, diablo: Option<HWND>, ours: bool) -> Foreground {
    if window == 0 {
        Foreground::Unknown
    } else if diablo == Some(window) {
        Foreground::Diablo
    } else if window == overlay {
        Foreground::OwnWindow
    } else if ours {
        Foreground::Unknown
    } else {
        Foreground::Other
    }
}

pub fn diablo_running() -> bool {
    find_diablo_hwnd().is_some()
}

/// Gives keyboard focus back to the Diablo II window.
pub fn focus_diablo() -> bool {
    let Some(hwnd) = find_diablo_hwnd() else {
        return false;
    };
    unsafe {
        if IsIconic(hwnd) != 0 {
            ShowWindow(hwnd, SW_RESTORE);
        }
        SetForegroundWindow(hwnd) != 0
    }
}

/// Brings `hwnd` to the foreground; true when it got there. Windows only lets the process that produced the
/// last input do that, and after a global hotkey or our injected Ctrl+C that is the game, so a plain
/// SetForegroundWindow is refused. Attaching to the foreground thread's input queue for the call gets past it.
pub fn bring_to_foreground(hwnd: HWND) -> bool {
    unsafe {
        let foreground = GetForegroundWindow();
        if foreground == hwnd {
            return true;
        }
        if SetForegroundWindow(hwnd) != 0 && GetForegroundWindow() == hwnd {
            return true;
        }

        let this_thread = GetCurrentThreadId();
        let foreground_thread = if foreground == 0 {
            0
        } else {
            GetWindowThreadProcessId(foreground, ptr::null_mut())
        };
        let attached = foreground_thread != 0
            && foreground_thread != this_thread
            && AttachThreadInput(this_thread, foreground_thread, 1) != 0;
        BringWindowToTop(hwnd);
        SetForegroundWindow(hwnd);
        if attached {
            AttachThreadInput(this_thread, foreground_thread, 0);
        }
        GetForegroundWindow() == hwnd
    }
}

fn work_area(monitor: HMONITOR) -> Option<WindowRect> {
    if monitor == 0 {
        return None;
    }
    let mut info: MONITORINFO = unsafe { std::mem::zeroed() };
    info.cbSize = std::mem::size_of::<MONITORINFO>() as u32;
    if unsafe { GetMonitorInfoW(monitor, &mut info) } == 0 {
        return None;
    }
    let r = info.rcWork;
    Some(WindowRect {
        x: r.left,
        y: r.top,
        width: r.right - r.left,
        height: r.bottom - r.top,
    })
}

/// Work area (monitor minus taskbar) of the monitor containing Diablo II, else the primary monitor. Not the full
/// monitor rect: an always-on-top window covering the taskbar makes Windows draw it greyed out, as if behind a
/// fullscreen app.
pub fn get_appropriate_window_bounds(_app: &AppHandle) -> Option<WindowRect> {
    let monitor = match find_diablo_hwnd() {
        Some(hwnd) => unsafe { MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST) },
        None => unsafe { MonitorFromPoint(POINT { x: 0, y: 0 }, MONITOR_DEFAULTTOPRIMARY) },
    };
    work_area(monitor)
}

// --- Event-driven foreground monitoring ---

static mut FOREGROUND_HOOK: Option<HWINEVENTHOOK> = None;

static CALLBACK: Mutex<Option<Box<dyn Fn() + Send>>> = Mutex::new(None);

/// Window named by the last EVENT_SYSTEM_FOREGROUND.
static LAST_FOREGROUND_EVENT: AtomicIsize = AtomicIsize::new(0);

unsafe extern "system" fn win_event_proc(
    _hook: HWINEVENTHOOK,
    _event: u32,
    hwnd: HWND,
    _id_object: i32,
    _id_child: i32,
    _event_thread: u32,
    _event_time: u32,
) {
    LAST_FOREGROUND_EVENT.store(hwnd, Ordering::SeqCst);
    if let Some(cb) = &*CALLBACK.lock().unwrap() {
        cb();
    }
}

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

pub fn cleanup_foreground_monitoring() {
    unsafe {
        if let Some(hook) = FOREGROUND_HOOK {
            UnhookWinEvent(hook);
            FOREGROUND_HOOK = None;
        }
        *CALLBACK.lock().unwrap() = None;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const OVERLAY: HWND = 10;
    const DIABLO: HWND = 20;
    const TRAY_MENU_OWNER: HWND = 30;
    const BROWSER: HWND = 40;

    #[test]
    fn only_the_overlay_counts_as_our_window() {
        assert_eq!(
            classify(OVERLAY, OVERLAY, Some(DIABLO), true),
            Foreground::OwnWindow
        );
        // The tray menu briefly takes the foreground: not the overlay, so no information
        assert_eq!(
            classify(TRAY_MENU_OWNER, OVERLAY, Some(DIABLO), true),
            Foreground::Unknown
        );
    }

    #[test]
    fn classifies_the_game_other_apps_and_no_window() {
        assert_eq!(
            classify(DIABLO, OVERLAY, Some(DIABLO), false),
            Foreground::Diablo
        );
        assert_eq!(
            classify(BROWSER, OVERLAY, Some(DIABLO), false),
            Foreground::Other
        );
        assert_eq!(classify(BROWSER, OVERLAY, None, false), Foreground::Other);
        assert_eq!(
            classify(0, OVERLAY, Some(DIABLO), false),
            Foreground::Unknown
        );
    }

    #[test]
    fn the_overlay_is_ours_even_without_the_game() {
        assert_eq!(
            classify(OVERLAY, OVERLAY, None, true),
            Foreground::OwnWindow
        );
    }
}
