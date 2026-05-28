//! Tauri commands — bridges the React UI to the Rust backend.
//!
//! Mirrors ipc-handlers.ts from the Electron app. All commands return
//! `Result<T, String>` so the frontend can surface errors cleanly.

use crate::config;
use crate::image_io;
use crate::profile::{self, Profile, ProfileLcd, ProfileSummary};
use crate::render;
use crate::sensors;
use crate::types::{
    AppSettings, DeviceStatus, DisplayConfig, GpuSource, RingChannel, RingMode, Temperatures,
};
use crate::usb::KrakenDriver;
use base64::Engine;
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::sync::oneshot;
use tokio::time::{interval, Duration};

// ============================================================================
// Shared state
// ============================================================================

pub struct AppState {
    pub driver: KrakenDriver,
    /// Optional shutdown signal for the periodic temp-polling task.
    pub temp_poll_shutdown: Mutex<Option<oneshot::Sender<()>>>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandResult {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl CommandResult {
    fn ok() -> Self {
        Self { success: true, error: None }
    }
    fn fail(e: impl ToString) -> Self {
        Self {
            success: false,
            error: Some(e.to_string()),
        }
    }
}

fn to_str_err<E: ToString>(e: E) -> String {
    e.to_string()
}

// ============================================================================
// Connection
// ============================================================================

#[tauri::command]
pub async fn connect_device(state: State<'_, AppState>) -> Result<CommandResult, String> {
    match state.driver.connect().await {
        Ok(_) => Ok(CommandResult::ok()),
        Err(e) => Ok(CommandResult::fail(e)),
    }
}

#[tauri::command]
pub fn get_device_status(state: State<'_, AppState>) -> DeviceStatus {
    state.driver.get_status()
}

// ============================================================================
// Modes (color / image / gif / temperatures)
// ============================================================================

#[tauri::command]
pub async fn send_color(
    r: u8,
    g: u8,
    b: u8,
    state: State<'_, AppState>,
) -> Result<CommandResult, String> {
    match state.driver.send_color(r, g, b).await {
        Ok(_) => {
            let _ = config::update(|c| {
                c.last_mode = Some("color".into());
                c.last_color = Some(config::LastColor { r, g, b });
            });
            Ok(CommandResult::ok())
        }
        Err(e) => Ok(CommandResult::fail(e)),
    }
}

#[tauri::command]
pub async fn send_image(path: String, state: State<'_, AppState>) -> Result<CommandResult, String> {
    let bytes = tokio::fs::read(&path)
        .await
        .map_err(|e| format!("Lecture fichier image: {e}"))?;
    let rgba = match image_io::image_to_device_rgba(&bytes) {
        Ok(b) => b,
        Err(e) => return Ok(CommandResult::fail(e)),
    };
    match state.driver.send_rgba_image(rgba).await {
        Ok(_) => {
            let _ = config::update(|c| {
                c.last_mode = Some("image".into());
                c.last_image_path = Some(path);
            });
            Ok(CommandResult::ok())
        }
        Err(e) => Ok(CommandResult::fail(e)),
    }
}

#[tauri::command]
pub async fn send_gif(path: String, state: State<'_, AppState>) -> Result<CommandResult, String> {
    let bytes = tokio::fs::read(&path)
        .await
        .map_err(|e| format!("Lecture fichier GIF: {e}"))?;
    // Resize GIF in a blocking task — image decoding can be heavy.
    let resized = match tokio::task::spawn_blocking(move || image_io::resize_gif(&bytes)).await {
        Ok(Ok(b)) => b,
        Ok(Err(e)) => return Ok(CommandResult::fail(e)),
        Err(e) => return Ok(CommandResult::fail(e)),
    };
    match state.driver.send_gif(resized).await {
        Ok(_) => {
            let _ = config::update(|c| {
                c.last_mode = Some("gif".into());
                c.last_gif_path = Some(path);
            });
            Ok(CommandResult::ok())
        }
        Err(e) => Ok(CommandResult::fail(e)),
    }
}

#[tauri::command]
pub async fn start_temp_mode(state: State<'_, AppState>) -> Result<CommandResult, String> {
    let result = state
        .driver
        .start_temp_mode(|cfg, temps| render::render_for_device(cfg, temps));
    let _ = config::update(|c| c.last_mode = Some("temperatures".into()));
    match result {
        Ok(_) => Ok(CommandResult::ok()),
        Err(e) => Ok(CommandResult::fail(e)),
    }
}

#[tauri::command]
pub fn stop_current_mode(state: State<'_, AppState>) -> CommandResult {
    state.driver.stop_current_mode();
    CommandResult::ok()
}

// ============================================================================
// Temperatures (UI polling)
// ============================================================================

#[tauri::command]
pub fn get_temperatures() -> Temperatures {
    sensors::read_temperatures()
}

#[tauri::command]
pub async fn start_temp_polling(
    interval_ms: Option<u64>,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<CommandResult, String> {
    let fallback = config::load_settings().poll_interval_ms;
    let ms = interval_ms.unwrap_or(fallback).clamp(100, 60_000);

    // Cancel previous polling task if any.
    if let Some(prev) = state.temp_poll_shutdown.lock().take() {
        let _ = prev.send(());
    }

    let (tx, mut rx) = oneshot::channel::<()>();
    *state.temp_poll_shutdown.lock() = Some(tx);

    let app_clone = app.clone();
    tokio::spawn(async move {
        let mut tick = interval(Duration::from_millis(ms));
        // Skip the immediate first tick to match Electron's setInterval semantics.
        tick.tick().await;
        loop {
            tokio::select! {
                _ = &mut rx => break,
                _ = tick.tick() => {
                    let temps = sensors::read_temperatures();
                    let _ = app_clone.emit("temperatures-update", temps);
                }
            }
        }
    });
    Ok(CommandResult::ok())
}

#[tauri::command]
pub fn stop_temp_polling(state: State<'_, AppState>) -> CommandResult {
    if let Some(prev) = state.temp_poll_shutdown.lock().take() {
        let _ = prev.send(());
    }
    CommandResult::ok()
}

// ============================================================================
// Display config / preview
// ============================================================================

#[tauri::command]
pub fn get_display_config(state: State<'_, AppState>) -> DisplayConfig {
    state.driver.get_display_config()
}

#[tauri::command]
pub fn save_display_config(
    config_in: DisplayConfig,
    state: State<'_, AppState>,
) -> Result<CommandResult, String> {
    state.driver.set_display_config(config_in.clone());
    let _ = config::update(|c| c.display_config = Some(config_in));
    Ok(CommandResult::ok())
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewResult {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[tauri::command]
pub fn render_display_preview(config_in: DisplayConfig) -> PreviewResult {
    let temps = sensors::read_temperatures();
    match render::render_preview_png(&config_in, temps) {
        Ok(png) => {
            let b64 = base64::engine::general_purpose::STANDARD.encode(&png);
            PreviewResult {
                success: true,
                data_url: Some(format!("data:image/png;base64,{}", b64)),
                error: None,
            }
        }
        Err(e) => PreviewResult {
            success: false,
            data_url: None,
            error: Some(e.to_string()),
        },
    }
}

// ============================================================================
// Settings
// ============================================================================

#[tauri::command]
pub fn list_gpu_sources() -> Vec<GpuSource> {
    sensors::gpu::list_gpu_sources(true)
}

#[tauri::command]
pub fn get_settings() -> AppSettings {
    config::load_settings()
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveSettingsResult {
    pub success: bool,
    pub settings: AppSettings,
}

#[tauri::command]
pub fn save_settings(
    settings: AppSettings,
    state: State<'_, AppState>,
) -> Result<SaveSettingsResult, String> {
    let previous = config::load_settings();
    let mut merged = settings;
    merged.clamp();

    // Apply runtime changes.
    sensors::set_gpu_source(merged.gpu_source.clone());
    state
        .driver
        .set_temp_timing(merged.lcd_poll_ms, merged.lcd_min_push_ms);

    // If decimals changed, re-apply to the active display config.
    if merged.decimals != previous.decimals {
        let mut cfg = state.driver.get_display_config();
        cfg.decimals = merged.decimals;
        state.driver.set_display_config(cfg);
    }

    let s = merged.clone();
    let _ = config::update(|c| c.settings = Some(s));

    Ok(SaveSettingsResult { success: true, settings: merged })
}

// ============================================================================
// Profiles
// ============================================================================

#[tauri::command]
pub fn list_profiles() -> Vec<ProfileSummary> {
    profile::list_profiles()
}

#[tauri::command]
pub fn save_profile_cmd(p: Profile) -> Result<CommandResult, String> {
    profile::save_profile(&p).map_err(|e| e.to_string())?;
    Ok(CommandResult::ok())
}

#[tauri::command]
pub fn delete_profile_cmd(name: String) -> Result<CommandResult, String> {
    profile::delete_profile(&name).map_err(|e| e.to_string())?;
    Ok(CommandResult::ok())
}

#[tauri::command]
pub fn get_profile(name: String) -> Result<Profile, String> {
    profile::load_profile(&name).map_err(|e| e.to_string())
}

/// Apply a saved profile: LCD + ring.
#[tauri::command]
pub async fn apply_profile(
    name: String,
    state: State<'_, AppState>,
) -> Result<CommandResult, String> {
    let p = profile::load_profile(&name).map_err(|e| e.to_string())?;
    apply_profile_inner(&p, &state).await
}

pub async fn apply_profile_inner(p: &Profile, state: &AppState) -> Result<CommandResult, String> {
    // Apply ring first (non-blocking, best-effort)
    if let Some(ref ring) = p.ring {
        let _ = state.driver.send_ring_lighting(ring.channel, ring.mode.clone()).await;
    }

    // Apply LCD mode
    match &p.lcd {
        ProfileLcd::None => {}
        ProfileLcd::Color { r, g, b } => {
            let (r, g, b) = (*r, *g, *b);
            match state.driver.send_color(r, g, b).await {
                Ok(_) => { let _ = config::update(|c| { c.last_mode = Some("color".into()); c.last_color = Some(config::LastColor { r, g, b }); }); }
                Err(e) => return Ok(CommandResult::fail(e)),
            }
        }
        ProfileLcd::Image { path } => {
            let bytes = tokio::fs::read(path).await.map_err(|e| e.to_string())?;
            let rgba = image_io::image_to_device_rgba(&bytes).map_err(|e| e.to_string())?;
            match state.driver.send_rgba_image(rgba).await {
                Ok(_) => { let _ = config::update(|c| { c.last_mode = Some("image".into()); c.last_image_path = Some(path.clone()); }); }
                Err(e) => return Ok(CommandResult::fail(e)),
            }
        }
        ProfileLcd::Gif { path } => {
            let bytes = tokio::fs::read(path).await.map_err(|e| e.to_string())?;
            let resized = tokio::task::spawn_blocking(move || image_io::resize_gif(&bytes))
                .await
                .map_err(|e| e.to_string())?
                .map_err(|e| e.to_string())?;
            match state.driver.send_gif(resized).await {
                Ok(_) => { let _ = config::update(|c| { c.last_mode = Some("gif".into()); c.last_gif_path = Some(path.clone()); }); }
                Err(e) => return Ok(CommandResult::fail(e)),
            }
        }
        ProfileLcd::Temperatures => {
            let result = state.driver.start_temp_mode(|cfg, temps| render::render_for_device(cfg, temps));
            let _ = config::update(|c| c.last_mode = Some("temperatures".into()));
            if let Err(e) = result { return Ok(CommandResult::fail(e)); }
        }
    }

    // Apply display config if present
    if let Some(ref dc) = p.display_config {
        state.driver.set_display_config(dc.clone());
    }

    Ok(CommandResult::ok())
}

// ============================================================================
// Ring LED
// ============================================================================

#[tauri::command]
pub async fn send_ring(
    mode: RingMode,
    channel: RingChannel,
    state: State<'_, AppState>,
) -> Result<CommandResult, String> {
    match state.driver.send_ring_lighting(channel, mode).await {
        Ok(_) => Ok(CommandResult::ok()),
        Err(e) => Ok(CommandResult::fail(e)),
    }
}

// ============================================================================
// Misc
// ============================================================================

#[tauri::command]
pub fn quit_app(app: AppHandle) {
    app.exit(0);
}

#[tauri::command]
pub fn hide_window(app: AppHandle, state: State<'_, AppState>) {
    state.driver.set_window_visible(false);
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.emit("window-visibility", false);
        let _ = win.hide();
    }
}

#[tauri::command]
pub fn show_window(app: AppHandle, state: State<'_, AppState>) {
    state.driver.set_window_visible(true);
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.emit("window-visibility", true);
        let _ = win.show();
        let _ = win.set_focus();
    }
}

#[tauri::command]
pub fn open_external(url: String, app: AppHandle) -> CommandResult {
    use tauri_plugin_shell::ShellExt;
    #[allow(deprecated)]
    match app.shell().open(&url, None) {
        Ok(_) => CommandResult::ok(),
        Err(e) => CommandResult::fail(e),
    }
}

#[tauri::command]
pub fn get_config() -> config::ConfigFile {
    config::load()
}

#[tauri::command]
pub fn save_config(data: serde_json::Value) -> Result<CommandResult, String> {
    // Merge arbitrary keys into the config file. The frontend uses this for ad-hoc state.
    config::update(|c| {
        if let serde_json::Value::Object(map) = data {
            for (k, v) in map {
                match k.as_str() {
                    "settings" => c.settings = serde_json::from_value(v).ok(),
                    "displayConfig" => c.display_config = serde_json::from_value(v).ok(),
                    "lastMode" => c.last_mode = v.as_str().map(|s| s.to_string()),
                    "lastImagePath" => c.last_image_path = v.as_str().map(|s| s.to_string()),
                    "lastGifPath" => c.last_gif_path = v.as_str().map(|s| s.to_string()),
                    "lastColor" => c.last_color = serde_json::from_value(v).ok(),
                    _ => {}
                }
            }
        }
    })
    .map_err(to_str_err)?;
    Ok(CommandResult::ok())
}

// ============================================================================
// Autostart (systemd user service + XDG fallback)
// ============================================================================

fn bin_path() -> Option<std::path::PathBuf> {
    // Running binary path, or fallback to ~/.local/bin/nzxtcam-v1
    std::env::current_exe().ok().or_else(|| {
        dirs::home_dir().map(|h| h.join(".local/bin/nzxtcam-v1"))
    })
}

#[tauri::command]
pub fn get_autostart() -> bool {
    // Enabled if systemd service exists OR XDG autostart exists
    let home = match dirs::home_dir() { Some(h) => h, None => return false };
    home.join(".config/systemd/user/nzxtcam-v1.service").exists()
        || home.join(".config/autostart/nzxtcam-v1.desktop").exists()
}

#[tauri::command]
pub fn set_autostart(enabled: bool) -> Result<(), String> {
    let home = dirs::home_dir().ok_or("Home dir introuvable")?;
    let exe = bin_path().ok_or("Binaire introuvable")?;
    let exe_str = exe.to_string_lossy();

    let service_dir  = home.join(".config/systemd/user");
    let service_path = service_dir.join("nzxtcam-v1.service");
    let xdg_dir      = home.join(".config/autostart");
    let xdg_path     = xdg_dir.join("nzxtcam-v1.desktop");

    if enabled {
        // ── systemd user service ─────────────────────────────────────────
        std::fs::create_dir_all(&service_dir).map_err(to_str_err)?;
        std::fs::write(&service_path, format!(
            "[Unit]\nDescription=NZXT CAM v1 — LCD Controller\nAfter=graphical-session.target\n\n\
             [Service]\nType=simple\nExecStart={exe_str}\nRestart=on-failure\nRestartSec=3\n\n\
             [Install]\nWantedBy=graphical-session.target\n"
        )).map_err(to_str_err)?;

        let _ = std::process::Command::new("systemctl")
            .args(["--user", "daemon-reload"])
            .output();
        let _ = std::process::Command::new("systemctl")
            .args(["--user", "enable", "nzxtcam-v1.service"])
            .output();

        // ── XDG autostart (fallback pour GNOME/KDE/autres) ───────────────
        std::fs::create_dir_all(&xdg_dir).map_err(to_str_err)?;
        std::fs::write(&xdg_path, format!(
            "[Desktop Entry]\nType=Application\nName=nzxtcam-v1\n\
             Exec={exe_str}\nIcon=nzxtcam-v1\nHidden=false\n\
             NoDisplay=false\nX-GNOME-Autostart-enabled=true\n"
        )).map_err(to_str_err)?;
    } else {
        // Désactiver le service systemd
        let _ = std::process::Command::new("systemctl")
            .args(["--user", "disable", "nzxtcam-v1.service"])
            .output();
        let _ = std::fs::remove_file(&service_path);
        let _ = std::fs::remove_file(&xdg_path);
    }
    Ok(())
}

// ============================================================================
// Bootstrap helper — wired by `lib::run()`
// ============================================================================

pub fn setup_callbacks(app: &AppHandle, driver: &KrakenDriver) {
    let app_for_status = app.clone();
    driver.set_status_callback(Arc::new(move |status: &DeviceStatus| {
        let _ = app_for_status.emit("device-status-changed", status);
    }));

    let app_for_temps = app.clone();
    driver.set_temps_callback(Arc::new(move |temps: &Temperatures| {
        let _ = app_for_temps.emit("temperatures-update", temps);
    }));
}
