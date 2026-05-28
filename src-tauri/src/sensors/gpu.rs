//! GPU temperature via /sys/class/hwmon — discovers all GPUs (amdgpu / nvidia /
//! radeon / i915 / xe), resolves their PCI address (stable identifier) and
//! returns the temperature for the user-selected GPU (or first discrete).

use crate::sensors::cpu::read_milli_temp;
use crate::types::GpuSource;
use once_cell::sync::OnceCell;
use parking_lot::RwLock;
use std::fs;
use std::path::PathBuf;

const HWMON_DIR: &str = "/sys/class/hwmon";
const GPU_NAMES: &[&str] = &["amdgpu", "nvidia", "radeon", "i915", "xe"];

static GPU_CACHE: OnceCell<RwLock<Vec<GpuSource>>> = OnceCell::new();

fn cache() -> &'static RwLock<Vec<GpuSource>> {
    GPU_CACHE.get_or_init(|| RwLock::new(scan_gpus()))
}

fn short_pci(s: &str) -> String {
    // Match "bb:dd.f" suffix anywhere in the string
    let re_match = s
        .rsplit('/')
        .find(|seg| seg.len() >= 7 && seg.contains(':') && seg.contains('.'));
    let candidate = re_match.unwrap_or(s);
    candidate.to_ascii_lowercase()
}

fn scan_gpus() -> Vec<GpuSource> {
    let mut sources = Vec::new();
    let entries = match fs::read_dir(HWMON_DIR) {
        Ok(d) => d,
        Err(_) => return sources,
    };
    for entry in entries.flatten() {
        let base = entry.path();
        let name = match fs::read_to_string(base.join("name")) {
            Ok(s) => s.trim().to_string(),
            Err(_) => continue,
        };
        if !GPU_NAMES.contains(&name.as_str()) {
            continue;
        }

        let mut temps: Vec<PathBuf> = Vec::new();
        for t in ["temp1_input", "temp2_input", "temp3_input"] {
            let p = base.join(t);
            if p.exists() {
                temps.push(p);
            }
        }
        if temps.is_empty() {
            continue;
        }

        // Resolve PCI address via the "device" symlink target
        let pci = match fs::canonicalize(base.join("device")) {
            Ok(real) => short_pci(real.to_string_lossy().as_ref()),
            Err(_) => entry.file_name().to_string_lossy().to_string(),
        };

        let label = format!("{} ({})", name, pci);
        sources.push(GpuSource {
            id: pci.clone(),
            label,
            pci,
            temp_path: temps[0].to_string_lossy().to_string(),
            discrete: temps.len() > 1, // discrete cards expose edge + junction + mem
        });
    }
    // Discrete first
    sources.sort_by_key(|s| !s.discrete);
    sources
}

pub fn list_gpu_sources(force: bool) -> Vec<GpuSource> {
    if force {
        let fresh = scan_gpus();
        *cache().write() = fresh.clone();
        fresh
    } else {
        cache().read().clone()
    }
}

pub fn read_gpu_temp(source_id: Option<&str>) -> Option<f64> {
    let sources = cache().read();
    if sources.is_empty() {
        return None;
    }
    let chosen = source_id
        .and_then(|id| sources.iter().find(|s| s.id == id))
        .or_else(|| sources.first())?;
    read_milli_temp(std::path::Path::new(&chosen.temp_path))
}
