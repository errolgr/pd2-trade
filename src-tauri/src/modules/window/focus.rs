//! Game focus context, shared by every platform.
//!
//! Overlays (chat button, ticker, open tool windows), global hotkeys and the toast anchor follow the
//! *game context* rather than raw OS focus:
//! - Diablo II in the foreground starts the game context.
//! - Focus moving from Diablo onto one of our windows keeps it, so clicking an overlay doesn't hide the rest.
//! - Any other application in the foreground ends it. One of our windows focused from outside the game
//!   (sign-in or What's New at startup, Settings opened from the tray) is therefore not game context:
//!   overlays stay hidden and toasts anchor to the user's screen instead of a background Diablo window.
//! - No foreground window at all (Windows reports this mid-activation) is ignored instead of being read
//!   as a focus loss, which used to bounce every listener false -> true.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};

use super::{
    foreground, get_diablo_rect, get_work_area, initialize_foreground_monitoring, WindowRect,
};

/// Webview event carrying the game context (`bool`); `is_diablo_focused` returns the same value.
pub const FOCUS_EVENT: &str = "diablo-focus-changed";

/// Who owns the OS foreground, as far as the game context cares.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Foreground {
    /// The Diablo II window.
    Diablo,
    /// One of our own windows while Diablo II is running.
    OwnWindow,
    /// Another application, or one of our windows while Diablo II isn't running.
    Other,
    /// No foreground window; carries no information.
    Unknown,
}

/// Game context after `foreground` takes the OS foreground while the context is `current`.
pub fn next_game_context(current: bool, foreground: Foreground) -> bool {
    match foreground {
        Foreground::Diablo => true,
        Foreground::Other => false,
        Foreground::OwnWindow | Foreground::Unknown => current,
    }
}

static GAME_CONTEXT: AtomicBool = AtomicBool::new(false);
/// Serializes read-update-emit so concurrent foreground callbacks can't emit out of order.
static TRANSITION: Mutex<()> = Mutex::new(());

/// True while the user is in the game: Diablo II is in front, or one of our windows was focused from it.
pub fn is_game_context() -> bool {
    GAME_CONTEXT.load(Ordering::SeqCst)
}

/// Anchor area for overlay windows: the Diablo window in game context, otherwise the work area
/// of the screen the user is on.
pub fn get_appropriate_window_bounds(app: &AppHandle) -> Option<WindowRect> {
    if is_game_context() {
        if let Some(rect) = get_diablo_rect(app) {
            return Some(rect);
        }
    }
    get_work_area(app)
}

/// Seeds the game context from the current foreground, emits it, then re-evaluates on every
/// foreground change; `on_change` runs after each emitted value (initial one included).
pub fn initialize_diablo_focus_monitoring(
    app_handle: AppHandle,
    on_change: Box<dyn Fn(bool) + Send + 'static>,
) {
    let update = move |force_emit: bool| {
        let _transition = TRANSITION
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        let current = GAME_CONTEXT.load(Ordering::SeqCst);
        let next = next_game_context(current, foreground());
        if next == current && !force_emit {
            return;
        }
        GAME_CONTEXT.store(next, Ordering::SeqCst);
        let _ = app_handle.emit(FOCUS_EVENT, next);
        on_change(next);
    };

    update(true);
    initialize_foreground_monitoring(move || update(false));
}

#[cfg(test)]
mod tests {
    use super::Foreground::*;
    use super::*;

    fn run(start: bool, steps: &[Foreground]) -> Vec<bool> {
        steps
            .iter()
            .scan(start, |ctx, fg| {
                *ctx = next_game_context(*ctx, *fg);
                Some(*ctx)
            })
            .collect()
    }

    #[test]
    fn own_window_focused_from_the_game_keeps_the_game_context() {
        assert_eq!(
            run(false, &[Diablo, OwnWindow, OwnWindow, Diablo]),
            [true, true, true, true]
        );
    }

    #[test]
    fn own_window_focused_from_outside_the_game_is_not_game_context() {
        // Startup sign-in / What's New, or Settings opened from the tray while in another app
        assert_eq!(run(false, &[OwnWindow]), [false]);
        assert_eq!(
            run(false, &[Diablo, Other, OwnWindow]),
            [true, false, false]
        );
    }

    #[test]
    fn leaving_to_another_app_ends_the_game_context() {
        assert_eq!(run(false, &[Diablo, OwnWindow, Other]), [true, true, false]);
    }

    #[test]
    fn missing_foreground_window_does_not_flip_the_context() {
        assert_eq!(run(false, &[Diablo, Unknown, Diablo]), [true, true, true]);
        assert_eq!(run(false, &[Other, Unknown]), [false, false]);
    }
}
