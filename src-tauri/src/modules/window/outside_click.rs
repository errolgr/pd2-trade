//! Clicks outside the overlay's panels (Windows), so dismissable panels can close without the overlay ever
//! taking focus from the game (which would mute it). A low-level mouse hook runs only while such a panel is
//! open, on its own thread, and only does work on button-down.

use std::sync::atomic::{AtomicIsize, Ordering};
use std::sync::{mpsc, Mutex, OnceLock};
use std::{mem, ptr};
use tauri::{AppHandle, Emitter};
use windows_sys::Win32::{
    Foundation::{HWND, LPARAM, LRESULT, RECT, WPARAM},
    System::{LibraryLoader::GetModuleHandleW, Threading::GetCurrentThreadId},
    UI::WindowsAndMessaging::{
        CallNextHookEx, GetMessageW, GetWindowRect, PostThreadMessageW, SetWindowsHookExW,
        UnhookWindowsHookEx, HC_ACTION, MSG, MSLLHOOKSTRUCT, WH_MOUSE_LL, WM_LBUTTONDOWN,
        WM_MBUTTONDOWN, WM_QUIT, WM_RBUTTONDOWN,
    },
};

use crate::modules::region;

/// Webview event: a mouse button went down outside every panel (in the game or another app).
pub const OUTSIDE_CLICK_EVENT: &str = "overlay-outside-click";

static APP: OnceLock<AppHandle> = OnceLock::new();
static OVERLAY: AtomicIsize = AtomicIsize::new(0);
/// Thread running the hook's message loop while watching.
static HOOK_THREAD: Mutex<Option<u32>> = Mutex::new(None);

unsafe extern "system" fn mouse_proc(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
    if code == HC_ACTION as i32
        && matches!(
            wparam as u32,
            WM_LBUTTONDOWN | WM_RBUTTONDOWN | WM_MBUTTONDOWN
        )
    {
        let point = (*(lparam as *const MSLLHOOKSTRUCT)).pt;
        if !inside_overlay(point.x, point.y) {
            if let Some(app) = APP.get() {
                let _ = app.emit(OUTSIDE_CLICK_EVENT, ());
            }
        }
    }
    CallNextHookEx(0, code, wparam, lparam)
}

/// Screen point (physical pixels) on one of the overlay's panels. Pure bookkeeping, no messages to other
/// windows: the hook must answer fast or Windows drops it.
fn inside_overlay(x: i32, y: i32) -> bool {
    let overlay = OVERLAY.load(Ordering::SeqCst);
    let mut window: RECT = unsafe { mem::zeroed() };
    if overlay == 0 || unsafe { GetWindowRect(overlay, &mut window) } == 0 {
        return true;
    }
    region::contains(x - window.left, y - window.top)
}

/// Starts or stops the hook; idempotent.
pub fn set_outside_click_watch(app: &AppHandle, overlay: HWND, enabled: bool) {
    let _ = APP.set(app.clone());
    OVERLAY.store(overlay, Ordering::SeqCst);
    let mut thread = HOOK_THREAD
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    match (enabled, *thread) {
        (true, None) => {
            let (started, ready) = mpsc::channel();
            std::thread::spawn(move || unsafe {
                let hook = SetWindowsHookExW(
                    WH_MOUSE_LL,
                    Some(mouse_proc),
                    GetModuleHandleW(ptr::null()),
                    0,
                );
                let _ = started.send((hook != 0).then(|| GetCurrentThreadId()));
                if hook == 0 {
                    eprintln!("Failed to install the outside-click mouse hook");
                    return;
                }
                let mut msg: MSG = mem::zeroed();
                while GetMessageW(&mut msg, 0, 0, 0) > 0 {}
                UnhookWindowsHookEx(hook);
            });
            *thread = ready.recv().ok().flatten();
        }
        (false, Some(id)) => {
            unsafe { PostThreadMessageW(id, WM_QUIT, 0, 0) };
            *thread = None;
        }
        _ => {}
    }
}
