// Windows-specific implementation
#[cfg(target_os = "windows")]
mod platform {
    use serde::Serialize;
    use std::{ffi::OsStr, iter, os::windows::prelude::OsStrExt, ptr, sync::Mutex};
    use windows_sys::Win32::{
        Foundation::{HWND, RECT},
        UI::WindowsAndMessaging::{FindWindowW, GetForegroundWindow, GetWindowRect, SystemParametersInfoW, SPI_GETWORKAREA, EVENT_SYSTEM_FOREGROUND, WINEVENT_OUTOFCONTEXT},
        UI::Accessibility::{SetWinEventHook, UnhookWinEvent, HWINEVENTHOOK},
    };

    #[derive(Serialize)]
    pub struct WindowRect {
        pub x: i32,
        pub y: i32,
        pub width: i32,
        pub height: i32,
    }

    fn to_wide(s: &str) -> Vec<u16> {
        OsStr::new(s).encode_wide().chain(iter::once(0)).collect()
    }

    pub fn get_diablo_rect(window_name: &str) -> Option<WindowRect> {
        let title_w = to_wide(window_name);
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

    pub fn is_diablo_focused(window_name: &str) -> bool {
        let title_w = to_wide(window_name);
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
        if is_diablo_focused("Diablo II") {
            get_diablo_rect("Diablo II")
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
}

// Non-Windows stubs
#[cfg(not(target_os = "windows"))]
mod platform {
    use serde::Serialize;

    #[derive(Serialize)]
    pub struct WindowRect {
        pub x: i32,
        pub y: i32,
        pub width: i32,
        pub height: i32,
    }

    pub fn get_diablo_rect(_window_name: &str) -> Option<WindowRect> { None }
    pub fn is_diablo_focused(_window_name: &str) -> bool { false }
    pub fn get_work_area() -> Option<WindowRect> { None }
    pub fn get_appropriate_window_bounds() -> Option<WindowRect> { None }
    pub fn initialize_foreground_monitoring<F: Fn() + Send + 'static>(_callback: F) {}
    pub fn cleanup_foreground_monitoring() {}
}

// Re-export for use elsewhere
pub use platform::*;

#[cfg(target_os = "macos")]
pub fn get_work_area() -> Option<WindowRect> {
    use cocoa::appkit::NSScreen;
    use cocoa::base::nil;
    use cocoa::foundation::NSRect;
    unsafe {
        let screen = NSScreen::mainScreen(nil);
        if screen == nil {
            return None;
        }
        let visible_frame: NSRect = NSScreen::visibleFrame(screen);
        Some(WindowRect {
            x: visible_frame.origin.x as i32,
            y: visible_frame.origin.y as i32,
            width: visible_frame.size.width as i32,
            height: visible_frame.size.height as i32,
        })
    }
}

#[cfg(target_os = "linux")]
pub fn get_work_area(width: i32, height: i32) -> Option<WindowRect> {
    Some(WindowRect {
        x: 0,
        y: 0,
        width,
        height,
    })
}

#[cfg(target_os = "macos")]
pub fn is_diablo_focused(window_name: &str) -> bool {
    use cocoa::base::nil;
    use objc::{class, msg_send, sel, sel_impl};
    use objc::runtime::{Object, BOOL, YES};
    use std::ffi::CStr;

    unsafe {
        let workspace: *mut Object = msg_send![class!(NSWorkspace), sharedWorkspace];
        let apps: *mut Object = msg_send![workspace, runningApplications];
        let count: usize = msg_send![apps, count];

        for i in 0..count {
            let app: *mut Object = msg_send![apps, objectAtIndex: i];
            let is_active: BOOL = msg_send![app, isActive];
            if is_active == YES {
                let localized_name: *mut Object = msg_send![app, localizedName];
                let cstr: *const std::os::raw::c_char = msg_send![localized_name, UTF8String];
                if !cstr.is_null() {
                    let name = CStr::from_ptr(cstr).to_string_lossy();
                    if name.contains(window_name) {
                        return true;
                    }
                }
            }
        }
    }
    false
}

#[cfg(target_os = "macos")]
pub fn get_appropriate_window_bounds() -> Option<WindowRect> {
    // Diablo focus logic can be added if needed; for now, just use work area
    get_work_area()
}
