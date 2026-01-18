use rdev::{listen, Event, EventType, Key};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::Emitter;

const DOUBLE_TAP_TIMEOUT: Duration = Duration::from_millis(300);

struct DoubleShiftState {
    last_shift_press: Option<Instant>,
    is_listening: bool,
    is_shift_pressed: bool,
}

impl DoubleShiftState {
    fn new() -> Self {
        Self {
            last_shift_press: None,
            is_listening: false,
            is_shift_pressed: false,
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
            let is_shift_key = matches!(event.event_type, 
                EventType::KeyPress(Key::ShiftLeft) | EventType::KeyPress(Key::ShiftRight) |
                EventType::KeyRelease(Key::ShiftLeft) | EventType::KeyRelease(Key::ShiftRight)
            );

            if is_shift_key {
                let mut state = match STATE.lock() {
                    Ok(s) => s,
                    Err(_) => return,
                };

                if let Some(ref mut state) = *state {
                    match event.event_type {
                        EventType::KeyPress(_) => {
                            // Only process press if the key was previously released
                            // This prevents key repeat from triggering multiple presses
                            if !state.is_shift_pressed {
                                state.is_shift_pressed = true;
                                let now = Instant::now();

                                if let Some(last_press) = state.last_shift_press {
                                    if now.duration_since(last_press) < DOUBLE_TAP_TIMEOUT {
                                        // Double tap detected!
                                        // Reset state completely to allow fresh detection
                                        state.last_shift_press = None;
                                        state.is_shift_pressed = false; // Reset immediately so next press is counted
                                        
                                        // Emit event to frontend
                                        let _ = app_handle_for_callback.emit("double-shift-detected", ());
                                    } else {
                                        // Too much time passed, start fresh
                                        state.last_shift_press = Some(now);
                                    }
                                } else {
                                    // First tap, record the time
                                    state.last_shift_press = Some(now);
                                }
                            }
                            // If key is already pressed, ignore (key repeat)
                        }
                        EventType::KeyRelease(_) => {
                            // Mark key as released so the next press will be counted
                            state.is_shift_pressed = false;
                            // Only reset last_shift_press if enough time has passed (timeout expired)
                            // This allows the second press to be detected if user presses quickly
                            if let Some(last_press) = state.last_shift_press {
                                let now = Instant::now();
                                if now.duration_since(last_press) >= DOUBLE_TAP_TIMEOUT {
                                    // Timeout expired, reset to allow fresh sequence
                                    state.last_shift_press = None;
                                }
                            }
                        }
                        _ => {}
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
        s.is_shift_pressed = false;
    }

    Ok(())
}

