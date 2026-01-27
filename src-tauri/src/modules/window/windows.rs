use super::WindowRect;
use std::sync::Mutex;
use std::{ffi::OsStr, iter, os::windows::prelude::OsStrExt, ptr};
use tauri::{AppHandle, Emitter};

use windows_sys::Win32::{
    Foundation::{HWND, POINT, RECT},
    UI::Accessibility::{SetWinEventHook, UnhookWinEvent, HWINEVENTHOOK},
    UI::WindowsAndMessaging::{
        FindWindowW, GetCursorPos, GetForegroundWindow, GetWindowRect, GetWindowThreadProcessId,
        SystemParametersInfoW, EVENT_SYSTEM_FOREGROUND, SPI_GETWORKAREA, WINEVENT_OUTOFCONTEXT,
    },
};

fn to_wide(s: &str) -> Vec<u16> {
    OsStr::new(s).encode_wide().chain(iter::once(0)).collect()
}

pub fn get_diablo_rect(_app: &AppHandle) -> Option<WindowRect> {
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

pub fn get_work_area(_app: &AppHandle) -> Option<WindowRect> {
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

pub fn get_appropriate_window_bounds(app: &AppHandle) -> Option<WindowRect> {
    if is_diablo_focused() {
        get_diablo_rect(app)
    } else {
        get_work_area(app)
    }
}

// --- Event-driven foreground monitoring ---

static mut FOREGROUND_HOOK: Option<HWINEVENTHOOK> = None;

static CALLBACK: Mutex<Option<Box<dyn Fn() + Send>>> = Mutex::new(None);

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

static DIABLO_FOCUS_STATE: Mutex<Option<bool>> = Mutex::new(None);

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
        let mut last_state: std::sync::MutexGuard<'_, Option<bool>> = DIABLO_FOCUS_STATE.lock().unwrap();

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

pub fn cleanup_foreground_monitoring() {
    unsafe {
        if let Some(hook) = FOREGROUND_HOOK {
            UnhookWinEvent(hook);
            FOREGROUND_HOOK = None;
        }
        *CALLBACK.lock().unwrap() = None;
    }
}
