use serde::Serialize;
use std::{ffi::OsStr, iter, os::windows::prelude::OsStrExt, ptr};
use windows_sys::Win32::{Foundation::{HWND, RECT}, UI::WindowsAndMessaging::{FindWindowW, GetWindowRect, GetForegroundWindow}};

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

pub fn is_diablo_focused() -> bool {
    let title_w = to_wide("Diablo II");
    let hwnd: HWND = unsafe { FindWindowW(ptr::null(), title_w.as_ptr()) };
    if hwnd == 0 {
        return false;
    }

    let foreground = unsafe { GetForegroundWindow() };
    hwnd == foreground
} 