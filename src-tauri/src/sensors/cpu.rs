//! CPU temperature via /sys/class/hwmon.
//!
//! Label priority for AMD (k10temp): Tccd1/Tccd2 (real die CCD temp, matches btop)
//! > Tdie > Package > Tctl (has +27°C offset on some Ryzen) > first input.
//! For Intel (coretemp): "Package id 0" > first input.

use once_cell::sync::OnceCell;
use parking_lot::Mutex;
use std::fs;
use std::path::PathBuf;

const HWMON_DIR: &str = "/sys/class/hwmon";
const CPU_NAMES: &[&str] = &["k10temp", "zenpower", "coretemp", "cpu_thermal"];

#[derive(Debug, Clone)]
struct CpuSensor {
    preferred: PathBuf,
}

static SENSOR_CACHE: OnceCell<Mutex<Option<CpuSensor>>> = OnceCell::new();

fn cache() -> &'static Mutex<Option<CpuSensor>> {
    SENSOR_CACHE.get_or_init(|| Mutex::new(pick_cpu_sensor()))
}

/// Score a label — lower score = higher priority.
fn label_priority(label: &str) -> u8 {
    if label == "Tccd1" || label == "Tccd2" { return 0; }  // AMD real CCD temp (btop)
    if label == "Tdie"                       { return 1; }  // AMD Tdie (some models)
    if label.starts_with("Package")          { return 2; }  // Intel Package
    if label == "Tctl"                       { return 3; }  // AMD Tctl (has offset)
    10
}

fn pick_cpu_sensor() -> Option<CpuSensor> {
    let dirs = fs::read_dir(HWMON_DIR).ok()?;
    let mut best: Option<(u8, PathBuf)> = None; // (priority_score, path)

    for entry in dirs.flatten() {
        let base = entry.path();
        let name = match fs::read_to_string(base.join("name")) {
            Ok(s) => s.trim().to_string(),
            Err(_) => continue,
        };
        if !CPU_NAMES.contains(&name.as_str()) {
            continue;
        }

        let mut fallback: Option<PathBuf> = None;
        for i in 1..=12 {
            let p = base.join(format!("temp{}_input", i));
            if !p.exists() { continue; }
            if fallback.is_none() { fallback = Some(p.clone()); }

            let label = fs::read_to_string(base.join(format!("temp{}_label", i)))
                .map(|s| s.trim().to_string())
                .unwrap_or_default();
            let score = label_priority(&label);
            if best.as_ref().map_or(true, |(b, _)| score < *b) {
                best = Some((score, p));
            }
        }
        // If no labelled sensor won, use the fallback (first input of this driver)
        if best.is_none() {
            if let Some(fb) = fallback {
                best = Some((10, fb));
            }
        }
    }

    best.map(|(_, path)| {
        log::info!("CPU sensor: {}", path.display());
        CpuSensor { preferred: path }
    })
}

/// Read a tempN_input file (millidegrees → °C, rounded to integer).
pub fn read_milli_temp(path: &std::path::Path) -> Option<f64> {
    let raw = fs::read_to_string(path).ok()?;
    let milli: i64 = raw.trim().parse().ok()?;
    Some((milli as f64 / 1000.0).round())
}

pub fn read_cpu_temp() -> Option<f64> {
    let guard = cache().lock();
    let sensor = guard.as_ref()?;
    read_milli_temp(&sensor.preferred)
}
