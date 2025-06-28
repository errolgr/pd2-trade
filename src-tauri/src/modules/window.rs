use serde::Serialize;
use std::{ffi::OsStr, iter, os::windows::prelude::OsStrExt, ptr, sync::Mutex};
use windows_sys::Win32::{
    Foundation::{HWND, RECT},
    UI::WindowsAndMessaging::{FindWindowW, GetForegroundWindow, GetWindowRect, SystemParametersInfoW, SPI_GETWORKAREA, EVENT_SYSTEM_FOREGROUND, WINEVENT_OUTOFCONTEXT},
    UI::Accessibility::{SetWinEventHook, UnhookWinEvent, HWINEVENTHOOK},
};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowRect {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

fn to_wide(s: &str) -> Vec<u16> {
    OsStr::new(s).encode_wide().chain(iter::once(0)).collect()
}

pub fn get_diablo_rect() -> Option<WindowRect> {
    let title_w = to_wide("Diablo II");
    let hwnd: HWND = unsafe { FindWindowW(ptr::null(), title_w.as_ptr()) };
    if hwnd == 0 {
        return None;
    }
    let mut r = RECT { left: 0, top: 0, right: 0, bottom: 0 };
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
    if hwnd == 0 {
        return false;
    }
    let foreground = unsafe { GetForegroundWindow() };
    hwnd == foreground
}

pub fn get_work_area() -> Option<WindowRect> {
    let mut work_area = RECT { left: 0, top: 0, right: 0, bottom: 0 };
    let ok = unsafe {
        SystemParametersInfoW(
            SPI_GETWORKAREA,
            0,
            &mut work_area as *mut _ as *mut _,
            0,
        )
    };
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

pub fn get_appropriate_window_bounds() -> Option<WindowRect> {
    if is_diablo_focused() {
        get_diablo_rect()
    } else {
        get_work_area()
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

pub fn cleanup_foreground_monitoring() {
    unsafe {
        if let Some(hook) = FOREGROUND_HOOK {
            UnhookWinEvent(hook);
            FOREGROUND_HOOK = None;
        }
        *CALLBACK.lock().unwrap() = None;
    }
}
