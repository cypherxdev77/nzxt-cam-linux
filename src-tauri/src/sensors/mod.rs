//! /sys/class/hwmon-based sensor readings — port of temperatures.ts + gpu.ts.

pub mod cpu;
pub mod gpu;

use crate::types::Temperatures;
use once_cell::sync::Lazy;
use parking_lot::RwLock;

static SELECTED_GPU: RwLock<Option<String>> = RwLock::new(None);

/// Device-provided liquid temp (°C) and pump RPM, updated from USB status packets.
static DEVICE_TEMPS: Lazy<RwLock<Option<(f64, f64)>>> = Lazy::new(|| RwLock::new(None));

pub fn set_gpu_source(id: Option<String>) {
    *SELECTED_GPU.write() = id;
}

pub fn get_gpu_source() -> Option<String> {
    SELECTED_GPU.read().clone()
}

/// Called by the USB driver when a valid status packet (0x75) is received.
pub fn update_device_temps(liquid: f64, pump_rpm: f64) {
    *DEVICE_TEMPS.write() = Some((liquid, pump_rpm));
}

/// Clear device temps when device disconnects.
pub fn clear_device_temps() {
    *DEVICE_TEMPS.write() = None;
}

pub fn read_temperatures() -> Temperatures {
    let cpu = cpu::read_cpu_temp().unwrap_or(0.0);
    let gpu = gpu::read_gpu_temp(get_gpu_source().as_deref()).unwrap_or(0.0);
    let (liquid, pump_rpm) = DEVICE_TEMPS.read()
        .unwrap_or((0.0, 0.0));
    Temperatures { cpu, gpu, liquid, pump_rpm }
}
