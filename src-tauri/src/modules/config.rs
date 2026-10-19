use once_cell::sync::Lazy;
use serde::Deserialize;

// Label and title of the single overlay window (`Main`), read from src/common/window-config.json.
#[derive(Deserialize, Debug)]
#[allow(non_snake_case)]
pub struct WindowLabels {
    pub Main: String,
}

#[derive(Deserialize, Debug)]
#[allow(non_snake_case)]
pub struct WindowTitles {
    pub Main: String,
}

#[derive(Deserialize, Debug)]
pub struct WindowConfig {
    pub labels: WindowLabels,
    pub titles: WindowTitles,
}

pub static WINDOW_CONFIG: Lazy<WindowConfig> = Lazy::new(|| {
    let config_str = include_str!("../../../src/common/window-config.json");
    serde_json::from_str(config_str).expect("Failed to parse window-config.json")
});
