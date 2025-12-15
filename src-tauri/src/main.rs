// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    #[cfg(target_os = "linux")]
    unsafe {
        std::env::set_var("GDK_BACKEND", "x11");
        // Initialize X11 threading support to prevent crashes when using multiple threads
        x11::xlib::XInitThreads();
    }

    dmg_meter_widget_lib::run()
}
