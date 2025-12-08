use serde::Serialize;

use tauri::Emitter;

#[cfg(target_os = "windows")]
use std::sync::Mutex;

#[cfg(target_os = "windows")]
use std::{ffi::OsStr, iter, os::windows::prelude::OsStrExt, ptr};

#[cfg(target_os = "windows")]
use windows_sys::Win32::{
    Foundation::{HWND, RECT},
    UI::WindowsAndMessaging::{FindWindowW, GetForegroundWindow, GetWindowRect, SystemParametersInfoW, SPI_GETWORKAREA, EVENT_SYSTEM_FOREGROUND, WINEVENT_OUTOFCONTEXT},
    UI::Accessibility::{SetWinEventHook, UnhookWinEvent, HWINEVENTHOOK},
};

#[cfg(not(target_os = "windows"))]
use std::fs;

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

#[cfg(not(target_os = "windows"))]
pub fn get_diablo_rect(app: &AppHandle) -> Option<WindowRect> {
    get_work_area(app)
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
    return true;
}

#[cfg(target_os = "windows")]
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

use tauri::{AppHandle, Manager};

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppConfig {
    pd2_install_dir: Option<String>,
}

#[cfg(not(target_os = "windows"))]
pub fn get_work_area(app: &AppHandle) -> Option<WindowRect> {
    let config_dir = app.path().app_config_dir().ok()?;
    let config_path = config_dir.join("settings.json");
    
    if !config_path.exists() {
        println!("Config file not found at {:?}", config_path);
        return None;
    }

    let config_content = fs::read_to_string(&config_path).ok()?;
    let config: AppConfig = serde_json::from_str(&config_content).ok()?;
    
    let install_dir = config.pd2_install_dir?;
    let d2gl_path = std::path::Path::new(&install_dir).join("d2gl.json");
    
    if !d2gl_path.exists() {
        let _ = app.emit("error", format!("d2gl.json not found at {:?}. Overlay positioning may be incorrect.", d2gl_path));
        return None;
    }

    let contents = fs::read_to_string(&d2gl_path).ok()?;
    
    let json: serde_json::Value = serde_json::from_str(&contents).ok()?;
    let width = json["screen"]["window_size_width"].as_i64()? as f64;
    let height = json["screen"]["window_size_height"].as_i64()? as f64;
    let mut x = 0.0;
    let mut y = 0.0;
    if !json["screen"]["window_centered"].as_bool()? {
        x = json["screen"]["window_position_x"].as_f64()?;
        y = json["screen"]["window_position_y"].as_f64()?;
    }
    Some(WindowRect {
        x: x as i32,
        y: y as i32,
        width: width as i32,
        height: height as i32,
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
        if is_diablo_focused() {
            get_diablo_rect(app)
        } else {
            get_work_area(app)
        }
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
