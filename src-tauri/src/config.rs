//! Persistence — ~/.config/nzxtcam-archlinux-rust/config.json
//!
//! Single JSON blob that holds AppSettings, the last-used DisplayConfig, the
//! last image/GIF path, etc. Loaded once at startup, written on every change.

use crate::types::{AppSettings, DisplayConfig};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

const APP_DIRNAME: &str = "nzxtcam-archlinux-rust";

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct ConfigFile {
    pub settings: Option<AppSettings>,
    pub display_config: Option<DisplayConfig>,
    pub last_mode: Option<String>,
    pub last_image_path: Option<String>,
    pub last_gif_path: Option<String>,
    pub last_color: Option<LastColor>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LastColor {
    pub r: u8,
    pub g: u8,
    pub b: u8,
}

pub fn config_dir() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("/tmp"))
        .join(APP_DIRNAME)
}

pub fn config_file_path() -> PathBuf {
    config_dir().join("config.json")
}

pub fn ensure_config_dir() {
    let dir = config_dir();
    if !dir.exists() {
        let _ = fs::create_dir_all(&dir);
    }
}

pub fn load() -> ConfigFile {
    let path = config_file_path();
    match fs::read_to_string(&path) {
        Ok(s) => serde_json::from_str(&s).unwrap_or_default(),
        Err(_) => ConfigFile::default(),
    }
}

pub fn save(cfg: &ConfigFile) -> anyhow::Result<()> {
    ensure_config_dir();
    let json = serde_json::to_string_pretty(cfg)?;
    fs::write(config_file_path(), json)?;
    Ok(())
}

/// Merge-style save: load → mutate → write.
pub fn update<F>(f: F) -> anyhow::Result<ConfigFile>
where
    F: FnOnce(&mut ConfigFile),
{
    let mut cfg = load();
    f(&mut cfg);
    save(&cfg)?;
    Ok(cfg)
}

pub fn load_settings() -> AppSettings {
    let cfg = load();
    let mut s = cfg.settings.unwrap_or_default();
    s.clamp();
    s
}

pub fn load_display_config() -> Option<DisplayConfig> {
    load().display_config
}
