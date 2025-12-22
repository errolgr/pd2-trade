use once_cell::sync::Lazy;
use serde::Deserialize;

#[derive(Deserialize, Debug)]
#[allow(non_snake_case)]
pub struct WindowLabels {
    pub Main: String,
    pub Chat: String,
    pub ChatButton: String,
    pub TradeMessages: String,
    pub QuickList: String,
    pub ItemSearch: String,
    pub Settings: String,
    pub Currency: String,
    pub Toast: String,
}

#[derive(Deserialize, Debug)]
#[allow(non_snake_case)]
pub struct WindowTitles {
    pub Main: String,
    pub Chat: String,
    pub ChatButton: String,
    pub TradeMessages: String,
    pub QuickList: String,
    pub ItemSearch: String,
    pub Settings: String,
    pub Currency: String,
    pub Toast: String,
    pub PREFIX: String,
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
