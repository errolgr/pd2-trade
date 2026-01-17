use rdev::{listen, Event, EventType, Key};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{Emitter, Manager};

const DOUBLE_TAP_TIMEOUT: Duration = Duration::from_millis(300);

struct DoubleShiftState {
    last_shift_press: Option<Instant>,
    is_listening: bool,
}

impl DoubleShiftState {
    fn new() -> Self {
        Self {
            last_shift_press: None,
            is_listening: false,
        }
    }
}

static STATE: Mutex<Option<DoubleShiftState>> = Mutex::new(None);

pub fn start_listening(app_handle: tauri::AppHandle) -> Result<(), String> {
    let mut state = STATE.lock().map_err(|e| format!("Failed to lock state: {}", e))?;

    if state.is_some() && state.as_ref().unwrap().is_listening {
        return Ok(()); // Already listening
    }

    *state = Some(DoubleShiftState::new());
    let app_handle_for_thread = app_handle.clone();

    std::thread::spawn(move || {
        let app_handle_for_callback = app_handle_for_thread.clone();
        let callback = move |event: Event| {
            if let EventType::KeyPress(key) = event.event_type {
                if key == Key::ShiftLeft || key == Key::ShiftRight {
                    let mut state = match STATE.lock() {
                        Ok(s) => s,
                        Err(_) => return,
                    };

                    if let Some(ref mut state) = *state {
                        let now = Instant::now();

                        if let Some(last_press) = state.last_shift_press {
                            if now.duration_since(last_press) < DOUBLE_TAP_TIMEOUT {
                                // Double tap detected!
                                state.last_shift_press = None;
                                
                                // Emit event to frontend
                                let _ = app_handle_for_callback.emit("double-shift-detected", ());
                            } else {
                                // First tap, record the time
                                state.last_shift_press = Some(now);
                            }
                        } else {
                            // First tap, record the time
                            state.last_shift_press = Some(now);
                        }
                    }
                }
            }
        };

        if let Err(error) = listen(callback) {
            eprintln!("Error listening for keyboard events: {:?}", error);
        }
    });

    if let Some(ref mut s) = *state {
        s.is_listening = true;
    }

    Ok(())
}

pub fn stop_listening() -> Result<(), String> {
    let mut state = STATE.lock().map_err(|e| format!("Failed to lock state: {}", e))?;
    
    if let Some(ref mut s) = *state {
        s.is_listening = false;
        s.last_shift_press = None;
    }

    Ok(())
}

