use serde::Serialize;

#[derive(Serialize, Clone, Copy, Debug)]
#[serde(rename_all = "camelCase")]
pub struct WindowRect {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

#[derive(Serialize, serde::Deserialize, Clone, Copy, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PopupRect {
    pub left: f64,
    pub top: f64,
    pub right: f64,
    pub bottom: f64,
}

#[cfg(not(target_os = "windows"))]
mod linux;
#[cfg(not(target_os = "windows"))]
pub use linux::*;

#[cfg(target_os = "windows")]
mod windows;
#[cfg(target_os = "windows")]
pub use windows::*;

mod focus;
pub use focus::*;
