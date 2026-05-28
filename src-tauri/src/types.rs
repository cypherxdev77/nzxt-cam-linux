//! Shared types — mirror the TypeScript shared/display.ts plus driver/sensor types.
//! All structs serialize as camelCase for direct Tauri ↔ React JSON exchange.

use serde::{Deserialize, Serialize};

// ============================================================================
// LCD constants — single source of truth (kept in sync with frontend constants)
// ============================================================================
pub const LCD_SIZE: u32 = 640;
pub const LCD_WIDTH: u32 = 640;
pub const LCD_HEIGHT: u32 = 640;

// ============================================================================
// Temperatures / device status
// ============================================================================

#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Temperatures {
    pub cpu: f64,
    pub gpu: f64,
    pub liquid: f64,
    pub pump_rpm: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceStatus {
    pub connected: bool,
    pub product_name: String,
    pub pid: Option<u16>,
    pub error: Option<String>,
    pub lcd_controllable: bool,
}

impl DeviceStatus {
    pub fn disconnected() -> Self {
        Self {
            connected: false,
            product_name: "Non détecté".into(),
            pid: None,
            error: None,
            lcd_controllable: false,
        }
    }
}

// ============================================================================
// GPU sources (hwmon detection result)
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GpuSource {
    pub id: String,       // PCI address, stable
    pub label: String,    // human-readable
    pub pci: String,
    pub temp_path: String,
    pub discrete: bool,
}

// ============================================================================
// App settings — clamped on save
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub gpu_source: Option<String>,
    pub selected_device: String,
    pub poll_interval_ms: u64,
    pub lcd_poll_ms: u64,
    pub lcd_min_push_ms: u64,
    pub decimals: u8,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            gpu_source: None,
            selected_device: "nzxt-kraken-elite-v2".into(),
            poll_interval_ms: 1000,
            lcd_poll_ms: 500,
            lcd_min_push_ms: 200,
            decimals: 0,
        }
    }
}

impl AppSettings {
    pub fn clamp(&mut self) {
        self.poll_interval_ms = self.poll_interval_ms.clamp(100, 60_000);
        self.lcd_poll_ms = self.lcd_poll_ms.clamp(50, 60_000);
        self.lcd_min_push_ms = self.lcd_min_push_ms.clamp(0, 10_000);
        self.decimals = self.decimals.min(2);
    }
}

// ============================================================================
// Display "scene" — 1:1 with TypeScript shared/display.ts
// ============================================================================

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum MetricId {
    Cpu,
    Gpu,
    Liquid,
    Pump,
}

impl MetricId {
    pub fn label(&self) -> &'static str {
        match self {
            MetricId::Cpu => "CPU",
            MetricId::Gpu => "GPU",
            MetricId::Liquid => "Liquide",
            MetricId::Pump => "Pompe",
        }
    }
    pub fn unit(&self) -> &'static str {
        match self {
            MetricId::Cpu | MetricId::Gpu | MetricId::Liquid => "°",
            MetricId::Pump => "",
        }
    }
    pub fn value_from(&self, t: Temperatures) -> f64 {
        match self {
            MetricId::Cpu => t.cpu,
            MetricId::Gpu => t.gpu,
            MetricId::Liquid => t.liquid,
            MetricId::Pump => t.pump_rpm,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GaugeElement {
    pub id: String,
    pub x: f32,
    pub y: f32,
    pub metric: MetricId,
    pub radius: f32,
    pub thickness: f32,
    pub max: f64,
    pub color: String,
    pub track_color: String,
    pub start_angle: f32,
    pub sweep: f32,
    pub warn_color: String,
    pub warn_at: f64,
    pub show_value: bool,
    pub show_label: bool,
    pub label: String,
    pub value_size: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BarElement {
    pub id: String,
    pub x: f32,
    pub y: f32,
    pub metric: MetricId,
    pub width: f32,
    pub height: f32,
    pub max: f64,
    pub color: String,
    pub track_color: String,
    pub warn_color: String,
    pub warn_at: f64,
    pub show_value: bool,
    pub show_label: bool,
    pub label: String,
    pub value_size: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TextElement {
    pub id: String,
    pub x: f32,
    pub y: f32,
    pub text: String,
    pub color: String,
    pub size: f32,
    pub align: TextAlign,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TextAlign {
    Left,
    Center,
    Right,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum DisplayElement {
    Gauge(GaugeElement),
    Bar(BarElement),
    Text(TextElement),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DisplayConfig {
    pub background: String,
    pub elements: Vec<DisplayElement>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub variant: Option<String>,
    #[serde(default)]
    pub decimals: u8,
}

impl Default for DisplayConfig {
    fn default() -> Self {
        // The "triple-rings" preset is the default in the TS code.
        // We can't easily call frontend code from Rust, so we provide a sane
        // server-side default; the frontend will overwrite with its preset
        // on first run via save_display_config.
        Self {
            background: "#0a0a0f".into(),
            elements: Vec::new(),
            variant: None,
            decimals: 0,
        }
    }
}

// ============================================================================
// Ring LED lighting
// ============================================================================

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RingSpeed {
    Slowest,
    Slower,
    Normal,
    Faster,
    Fastest,
}

impl RingSpeed {
    pub fn idx(self) -> usize {
        match self {
            Self::Slowest => 0,
            Self::Slower  => 1,
            Self::Normal  => 2,
            Self::Faster  => 3,
            Self::Fastest => 4,
        }
    }
}

/// Channel IDs (liquidctl KrakenX3 convention).
/// On older X3 models: external=0x01, ring=0x02, logo=0x04.
/// On newer Z3/Elite models the mapping differs — use the UI picker to discover.
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum RingChannel {
    /// 0x01 — external accessories (HUE2, strips…) OR AIO ring on some models
    Ch01,
    /// 0x02 — pump ring on X3, OR external fans on Z3/Elite
    Ch02,
    /// 0x04 — logo LED
    Ch04,
    /// 0x07 — all channels at once
    Ch07,
}

impl RingChannel {
    pub fn byte(self) -> u8 {
        match self {
            Self::Ch01 => 0x01,
            Self::Ch02 => 0x02,
            Self::Ch04 => 0x04,
            Self::Ch07 => 0x07,
        }
    }
    /// Static timing value per channel (from liquidctl _STATIC_VALUE)
    pub fn static_val(self) -> u8 {
        match self {
            Self::Ch01 => 40,
            Self::Ch02 => 8,
            Self::Ch04 => 1,
            Self::Ch07 => 40,
        }
    }
}

/// Each variant maps directly to a liquidctl KrakenX3 color mode.
/// Colors are RGB on the wire — the USB layer converts to GRB.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "mode", rename_all = "camelCase")]
pub enum RingMode {
    Off,
    Fixed { r: u8, g: u8, b: u8 },
    Breathing { r: u8, g: u8, b: u8, speed: RingSpeed },
    Pulse { r: u8, g: u8, b: u8, speed: RingSpeed },
    Fading { colors: Vec<[u8; 3]>, speed: RingSpeed },
    SpectrumWave { speed: RingSpeed },
    RainbowFlow { speed: RingSpeed },
    RainbowPulse { speed: RingSpeed },
    SuperRainbow { speed: RingSpeed },
    Marquee { r: u8, g: u8, b: u8, speed: RingSpeed },
    StaryNight { r: u8, g: u8, b: u8, speed: RingSpeed },
}

// ============================================================================
// File dialog filters (mirrors Tauri 2 dialog filter shape)
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileFilter {
    pub name: String,
    pub extensions: Vec<String>,
}

// ============================================================================
// Helpers
// ============================================================================

/// Format a metric value with N decimals (0..=2).
pub fn format_metric(v: f64, decimals: u8) -> String {
    let d = decimals.min(2) as usize;
    format!("{:.*}", d, v)
}

/// Resolve {cpu}/{gpu}/{liquid}/{pump} tokens in a free-form string.
/// Supports per-token precision override via `{cpu:1}` syntax.
pub fn resolve_text(text: &str, t: Temperatures, decimals: u8) -> String {
    let mut out = String::with_capacity(text.len() + 8);
    let bytes = text.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'{' {
            if let Some(end_rel) = bytes[i..].iter().position(|&b| b == b'}') {
                let end = i + end_rel;
                let inner = &text[i + 1..end];
                let (key, dec_override) = match inner.split_once(':') {
                    Some((k, d)) => (k, d.parse::<u8>().ok()),
                    None => (inner, None),
                };
                let metric = match key.to_ascii_lowercase().as_str() {
                    "cpu" => Some(MetricId::Cpu),
                    "gpu" => Some(MetricId::Gpu),
                    "liquid" => Some(MetricId::Liquid),
                    "pump" => Some(MetricId::Pump),
                    _ => None,
                };
                if let Some(m) = metric {
                    let d = dec_override.unwrap_or(decimals).min(2);
                    out.push_str(&format_metric(m.value_from(t), d));
                    i = end + 1;
                    continue;
                }
            }
        }
        // Push UTF-8 codepoint properly
        let ch_end = (i + 1..=text.len())
            .find(|&j| text.is_char_boundary(j))
            .unwrap_or(text.len());
        out.push_str(&text[i..ch_end]);
        i = ch_end;
    }
    out
}

/// Parse a #rrggbb / #rgb hex color into 8-bit RGB.
pub fn hex_to_rgb(hex: &str) -> (u8, u8, u8) {
    let h = hex.trim_start_matches('#').trim();
    let normalized = if h.len() == 3 {
        h.chars().flat_map(|c| [c, c]).collect::<String>()
    } else {
        h.to_string()
    };
    let n = u32::from_str_radix(&normalized, 16).unwrap_or(0);
    (((n >> 16) & 0xff) as u8, ((n >> 8) & 0xff) as u8, (n & 0xff) as u8)
}
