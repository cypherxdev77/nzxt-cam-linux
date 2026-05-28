//! Profile storage — ~/.config/nzxtcam-archlinux-rust/profiles/<name>.json

use crate::config::config_dir;
use crate::types::{DisplayConfig, RingChannel, RingMode};
use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use std::fs;

// ============================================================================
// Profile data
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", tag = "type")]
pub enum ProfileLcd {
    Color { r: u8, g: u8, b: u8 },
    Image { path: String },
    Gif { path: String },
    Temperatures,
    None,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileRing {
    pub channel: RingChannel,
    pub mode: RingMode,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Profile {
    pub name: String,
    pub lcd: ProfileLcd,
    pub ring: Option<ProfileRing>,
    pub display_config: Option<DisplayConfig>,
}

// Summary returned to the frontend (no heavy display_config)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileSummary {
    pub name: String,
    pub lcd_type: String,
}

impl Profile {
    pub fn summary(&self) -> ProfileSummary {
        let lcd_type = match &self.lcd {
            ProfileLcd::Color { .. }   => "color",
            ProfileLcd::Image { .. }   => "image",
            ProfileLcd::Gif { .. }     => "gif",
            ProfileLcd::Temperatures   => "temperatures",
            ProfileLcd::None           => "none",
        }
        .to_string();
        ProfileSummary { name: self.name.clone(), lcd_type }
    }
}

// ============================================================================
// Storage helpers
// ============================================================================

fn profiles_dir() -> std::path::PathBuf {
    config_dir().join("profiles")
}

fn profile_path(name: &str) -> std::path::PathBuf {
    profiles_dir().join(format!("{}.json", sanitize(name)))
}

/// Strip everything that isn't alphanumeric, dash, or underscore.
fn sanitize(name: &str) -> String {
    name.chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '_' })
        .collect::<String>()
        .to_lowercase()
}

fn ensure_profiles_dir() {
    let _ = fs::create_dir_all(profiles_dir());
}

pub fn save_profile(profile: &Profile) -> Result<()> {
    ensure_profiles_dir();
    if profile.name.trim().is_empty() {
        return Err(anyhow!("Le nom du profil ne peut pas être vide"));
    }
    let json = serde_json::to_string_pretty(profile)?;
    fs::write(profile_path(&profile.name), json)?;
    Ok(())
}

pub fn load_profile(name: &str) -> Result<Profile> {
    let path = profile_path(name);
    let s = fs::read_to_string(&path)
        .map_err(|_| anyhow!("Profil introuvable : {name}"))?;
    let p: Profile = serde_json::from_str(&s)
        .map_err(|e| anyhow!("Profil corrompu : {e}"))?;
    Ok(p)
}

pub fn delete_profile(name: &str) -> Result<()> {
    let path = profile_path(name);
    if path.exists() {
        fs::remove_file(path)?;
    }
    Ok(())
}

pub fn list_profiles() -> Vec<ProfileSummary> {
    ensure_profiles_dir();
    let Ok(entries) = fs::read_dir(profiles_dir()) else { return vec![] };
    let mut out: Vec<ProfileSummary> = entries
        .flatten()
        .filter(|e| e.path().extension().and_then(|x| x.to_str()) == Some("json"))
        .filter_map(|e| {
            let s = fs::read_to_string(e.path()).ok()?;
            let p: Profile = serde_json::from_str(&s).ok()?;
            Some(p.summary())
        })
        .collect();
    out.sort_by(|a, b| a.name.cmp(&b.name));
    out
}
