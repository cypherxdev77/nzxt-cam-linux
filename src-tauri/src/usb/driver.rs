//! NZXT Kraken USB driver — port of kraken-driver.ts to Rust + nusb 0.2.
//!
//! Critical rules (learned the hard way on the Electron version):
//! 1. Header (MAGIC + bulk_info) must be a SEPARATE bulk transfer from the
//!    image data — concatenating them silently corrupts firmware decoding
//!    (ACKs still come back as code=1).
//! 2. RGBA pixels must have alpha = 0x00 when sent to the device, else colors
//!    are mangled.
//! 3. The host must drain stale interrupt responses before starting a new
//!    transaction, otherwise our `read_until` matches the previous ACK.
//! 4. Bucket memory offsets must be computed to avoid overlapping previously
//!    written buckets — `get_bucket_memory_offset` mirrors liquidctl's logic.

use crate::types::{DeviceStatus, DisplayConfig, Temperatures, LCD_HEIGHT, LCD_WIDTH};
use crate::usb::protocol::*;
use anyhow::{anyhow, bail, Result};
use nusb::transfer::{Buffer, Bulk, In, Interrupt, Out, TransferError};
use nusb::{Device, Endpoint, Interface};
use parking_lot::{Mutex as PlMutex, RwLock};
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, AtomicU32, AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::{mpsc, oneshot, Mutex as AsyncMutex};

// ============================================================================
// Hardware bundle — populated on connect, dropped on disconnect
// ============================================================================
struct Hardware {
    _device: Device,
    _iface0: Interface,
    _iface1: Interface,
    bulk_out: Endpoint<Bulk, Out>,
    intr_out: Endpoint<Interrupt, Out>,
    /// Polling task shutdown signal.
    poll_shutdown: Option<oneshot::Sender<()>>,
    /// Receiver fed by the polling task with raw interrupt-in packets.
    intr_rx: mpsc::UnboundedReceiver<Vec<u8>>,
}

// ============================================================================
// Driver
// ============================================================================
pub type StatusCallback = Arc<dyn Fn(&DeviceStatus) + Send + Sync>;
pub type TempsCallback = Arc<dyn Fn(&Temperatures) + Send + Sync>;

struct Inner {
    status: RwLock<DeviceStatus>,
    display_config: RwLock<DisplayConfig>,
    config_version: AtomicU32,

    temp_loop_active: AtomicBool,
    temp_gen: AtomicU32,
    temp_poll_ms: AtomicU64,
    temp_min_push_ms: AtomicU64,

    /// When false, skip emitting IPC events to the webview (window hidden).
    window_visible: AtomicBool,

    /// Hardware state — async mutex because operations span awaits.
    hw: AsyncMutex<Option<Hardware>>,

    /// External callbacks (set by the Tauri commands layer at startup).
    on_status_change: PlMutex<Option<StatusCallback>>,
    on_temps_update: PlMutex<Option<TempsCallback>>,
}

#[derive(Clone)]
pub struct KrakenDriver(Arc<Inner>);

impl KrakenDriver {
    pub fn new() -> Self {
        Self(Arc::new(Inner {
            status: RwLock::new(DeviceStatus::disconnected()),
            display_config: RwLock::new(DisplayConfig::default()),
            config_version: AtomicU32::new(0),
            temp_loop_active: AtomicBool::new(false),
            temp_gen: AtomicU32::new(0),
            temp_poll_ms: AtomicU64::new(500),
            temp_min_push_ms: AtomicU64::new(200),
            window_visible: AtomicBool::new(true),
            hw: AsyncMutex::new(None),
            on_status_change: PlMutex::new(None),
            on_temps_update: PlMutex::new(None),
        }))
    }

    pub fn set_status_callback(&self, cb: StatusCallback) {
        *self.0.on_status_change.lock() = Some(cb);
    }

    pub fn set_temps_callback(&self, cb: TempsCallback) {
        *self.0.on_temps_update.lock() = Some(cb);
    }

    pub fn get_status(&self) -> DeviceStatus {
        self.0.status.read().clone()
    }

    pub fn get_display_config(&self) -> DisplayConfig {
        self.0.display_config.read().clone()
    }

    pub fn set_display_config(&self, cfg: DisplayConfig) {
        *self.0.display_config.write() = cfg;
        self.0.config_version.fetch_add(1, Ordering::Release);
    }

    pub fn set_window_visible(&self, visible: bool) {
        self.0.window_visible.store(visible, Ordering::Relaxed);
    }

    pub fn set_temp_timing(&self, poll_ms: u64, min_push_ms: u64) {
        self.0
            .temp_poll_ms
            .store(poll_ms.clamp(50, 60_000), Ordering::Relaxed);
        self.0
            .temp_min_push_ms
            .store(min_push_ms.clamp(0, 10_000), Ordering::Relaxed);
    }

    fn emit_status(&self, status: &DeviceStatus) {
        if let Some(cb) = self.0.on_status_change.lock().clone() {
            cb(status);
        }
    }

    fn update_status(&self, mutate: impl FnOnce(&mut DeviceStatus)) {
        let mut s = self.0.status.write();
        mutate(&mut s);
        let snap = s.clone();
        drop(s);
        self.emit_status(&snap);
    }

    // ========================================================================
    // Connect / disconnect
    // ========================================================================

    pub async fn connect(&self) -> Result<()> {
        let mut hw_guard = self.0.hw.lock().await;
        if hw_guard.is_some() {
            return Ok(());
        }

        // Find a Kraken device by VID + any known PID.
        let devices = nusb::list_devices()
            .await
            .map_err(|e| anyhow!("list_devices: {e}"))?;
        let info = devices
            .into_iter()
            .find(|d| d.vendor_id() == NZXT_VID && KRAKEN_PIDS.contains(&d.product_id()))
            .ok_or_else(|| anyhow!("Aucun Kraken Elite trouvé"))?;
        let pid = info.product_id();

        let device = info.open().await.map_err(|e| anyhow!("Open USB: {e}"))?;
        log::debug!("Device: 0x{:04x}", pid);

        // Claim interfaces — detach kernel driver first.
        let iface0 = device
            .detach_and_claim_interface(IFACE_BULK)
            .await
            .map_err(|e| anyhow!("Claim iface0: {e}"))?;
        let iface1 = device
            .detach_and_claim_interface(IFACE_INTERRUPT)
            .await
            .map_err(|e| anyhow!("Claim iface1: {e}"))?;

        // Open endpoints. NZXT Kraken Elite layout: bulk OUT 0x02, intr OUT 0x01, intr IN 0x81.
        let bulk_out = iface0
            .endpoint::<Bulk, Out>(BULK_OUT_EP)
            .map_err(|e| anyhow!("Open bulk OUT {:#x}: {e}", BULK_OUT_EP))?;
        let intr_out = iface1
            .endpoint::<Interrupt, Out>(INTR_OUT_EP)
            .map_err(|e| anyhow!("Open intr OUT {:#x}: {e}", INTR_OUT_EP))?;
        let intr_in = iface1
            .endpoint::<Interrupt, In>(INTR_IN_EP)
            .map_err(|e| anyhow!("Open intr IN {:#x}: {e}", INTR_IN_EP))?;

        // Always use PKT_SIZE (512 bytes) — the NZXT firmware expects full 512-byte
        // interrupt frames (Electron version uses Buffer.alloc(512) for every write).
        let in_packet_size = PKT_SIZE;

        // Start the interrupt-in polling task.
        let (intr_tx, intr_rx) = mpsc::unbounded_channel::<Vec<u8>>();
        let (shutdown_tx, shutdown_rx) = oneshot::channel::<()>();
        tokio::spawn(poll_interrupt_in(intr_in, in_packet_size, intr_tx, shutdown_rx));

        // Brief settle, then drain pre-existing packets.
        tokio::time::sleep(Duration::from_millis(200)).await;
        let mut hw = Hardware {
            _device: device,
            _iface0: iface0,
            _iface1: iface1,
            bulk_out,
            intr_out,
            poll_shutdown: Some(shutdown_tx),
            intr_rx,
        };
        drain_rx(&mut hw.intr_rx, Duration::from_millis(300)).await;
        *hw_guard = Some(hw);

        self.update_status(|s| {
            *s = DeviceStatus {
                connected: true,
                product_name: product_name(pid).into(),
                pid: Some(pid),
                error: None,
                lcd_controllable: true,
            };
        });
        log::info!("Connecté ✓");
        Ok(())
    }

    pub async fn disconnect(&self) {
        self.stop_current_mode();
        let mut g = self.0.hw.lock().await;
        if let Some(mut hw) = g.take() {
            if let Some(sd) = hw.poll_shutdown.take() {
                let _ = sd.send(());
            }
            // Dropping Interface re-attaches the kernel driver automatically.
        }
        self.update_status(|s| *s = DeviceStatus::disconnected());
        crate::sensors::clear_device_temps();
    }

    pub fn stop_current_mode(&self) {
        self.0.temp_loop_active.store(false, Ordering::Release);
        self.0.temp_gen.fetch_add(1, Ordering::Release);
    }

    /// Send pump speed profile to the Kraken firmware.
    /// `points` is a list of (temp_celsius, duty_percent) pairs from the UI curve.
    /// The firmware expects 40 duty values for temps 20°C..=59°C interpolated linearly.
    pub async fn set_pump_speed_profile(&self, points: Vec<(u8, u8)>) -> Result<()> {
        let mut hw_guard = self.0.hw.lock().await;
        let hw = hw_guard.as_mut().ok_or_else(|| anyhow!("Non connecté"))?;

        // Interpolate duty for each integer temp 20..=59 (40 values).
        let mut duties = [20u8; 40];
        for (i, temp) in (20u8..=59u8).enumerate() {
            duties[i] = interp_duty(&points, temp).clamp(20, 100);
        }

        // Packet: [0x72, 0x01, 0x00, 0x00, d0..d39] padded to 64 bytes.
        let mut pkt = vec![0u8; 64];
        pkt[0] = 0x72;
        pkt[1] = 0x01;
        pkt[2] = 0x00;
        pkt[3] = 0x00;
        pkt[4..44].copy_from_slice(&duties);

        hw.intr_out.submit(Buffer::from(pkt));
        let comp = hw.intr_out.next_complete().await;
        comp.status.map_err(|e| anyhow!("pump profile write failed: {e:?}"))?;
        log::info!("Pump speed profile envoyé ({} points)", points.len());
        Ok(())
    }

    // ========================================================================
    // Public actions
    // ========================================================================

    pub async fn send_color(&self, r: u8, g: u8, b: u8) -> Result<()> {
        self.stop_current_mode();
        let pixels = (LCD_WIDTH * LCD_HEIGHT) as usize;
        let mut rgba = vec![0u8; pixels * 4];
        for i in 0..pixels {
            rgba[i * 4] = r;
            rgba[i * 4 + 1] = g;
            rgba[i * 4 + 2] = b;
            rgba[i * 4 + 3] = 0x00;
        }
        let bulk_info = bulk_info_rgba(rgba.len() as u32);
        let mut g = self.0.hw.lock().await;
        let hw = g.as_mut().ok_or_else(|| anyhow!("Pas connecté"))?;
        send_data_native(hw, &rgba, &bulk_info).await
    }

    pub async fn send_rgba_image(&self, rgba: Vec<u8>) -> Result<()> {
        self.stop_current_mode();
        let bulk_info = bulk_info_rgba(rgba.len() as u32);
        let mut g = self.0.hw.lock().await;
        let hw = g.as_mut().ok_or_else(|| anyhow!("Pas connecté"))?;
        send_data_native(hw, &rgba, &bulk_info).await
    }

    pub async fn send_gif(&self, gif_bytes: Vec<u8>) -> Result<()> {
        self.stop_current_mode();
        let bulk_info = bulk_info_gif(gif_bytes.len() as u32);
        let mut g = self.0.hw.lock().await;
        let hw = g.as_mut().ok_or_else(|| anyhow!("Pas connecté"))?;
        send_data_native(hw, &gif_bytes, &bulk_info).await
    }

    // ========================================================================
    // Ring LED lighting
    // ========================================================================

    pub async fn send_ring_lighting(
        &self,
        channel: crate::types::RingChannel,
        mode: crate::types::RingMode,
    ) -> Result<()> {
        let mut g = self.0.hw.lock().await;
        let hw = g.as_mut().ok_or_else(|| anyhow!("Pas connecté"))?;
        let cmd = build_ring_cmd(channel, mode);
        write_cmd(hw, &cmd).await
    }

    // ========================================================================
    // Temperature mode — internal animation loop
    // ========================================================================

    pub fn start_temp_mode<F>(&self, render_fn: F) -> Result<()>
    where
        F: Fn(&DisplayConfig, Temperatures) -> Result<Vec<u8>> + Send + Sync + 'static,
    {
        self.stop_current_mode();
        let my_gen = self.0.temp_gen.load(Ordering::Acquire);
        self.0.temp_loop_active.store(true, Ordering::Release);

        let driver = self.clone();
        let render = Arc::new(render_fn);
        tokio::spawn(async move {
            driver.temp_loop(my_gen, render).await;
        });
        Ok(())
    }

    async fn temp_loop(
        &self,
        my_gen: u32,
        render_fn: Arc<dyn Fn(&DisplayConfig, Temperatures) -> Result<Vec<u8>> + Send + Sync>,
    ) {
        let mut last_visual_key: Option<String> = None;
        let mut last_push_at: Option<Instant> = None;

        loop {
            if !self.0.temp_loop_active.load(Ordering::Acquire)
                || self.0.temp_gen.load(Ordering::Acquire) != my_gen
            {
                break;
            }

            let tick_start = Instant::now();
            let temps = crate::sensors::read_temperatures();

            // Only push IPC events when the window is actually visible.
            if self.0.window_visible.load(Ordering::Relaxed) {
                if let Some(cb) = self.0.on_temps_update.lock().clone() {
                    cb(&temps);
                }
            }

            let cfg_snapshot = self.0.display_config.read().clone();
            let decimals = cfg_snapshot.decimals.min(2);
            let config_version = self.0.config_version.load(Ordering::Acquire);
            let key = visual_key(temps, decimals, config_version);

            let cooldown_ok = last_push_at
                .map(|t| {
                    Instant::now().duration_since(t)
                        >= Duration::from_millis(self.0.temp_min_push_ms.load(Ordering::Relaxed))
                })
                .unwrap_or(true);

            if Some(&key) != last_visual_key.as_ref() && cooldown_ok {
                match render_fn(&cfg_snapshot, temps) {
                    Ok(rgba) => {
                        let bulk_info = bulk_info_rgba(rgba.len() as u32);
                        let mut g = self.0.hw.lock().await;
                        if let Some(hw) = g.as_mut() {
                            if self.0.temp_loop_active.load(Ordering::Acquire)
                                && self.0.temp_gen.load(Ordering::Acquire) == my_gen
                            {
                                if let Err(e) = send_data_native(hw, &rgba, &bulk_info).await {
                                    log::warn!("temp push failed: {e}");
                                } else {
                                    last_visual_key = Some(key);
                                    last_push_at = Some(Instant::now());
                                }
                            }
                        }
                    }
                    Err(e) => log::warn!("render error: {e}"),
                }
            }

            // Sleep — interruptible-friendly (small slices).
            let elapsed = tick_start.elapsed();
            let target = Duration::from_millis(self.0.temp_poll_ms.load(Ordering::Relaxed));
            let remaining = target.checked_sub(elapsed).unwrap_or(Duration::ZERO);
            let mut left = remaining;
            while !left.is_zero() {
                if !self.0.temp_loop_active.load(Ordering::Acquire)
                    || self.0.temp_gen.load(Ordering::Acquire) != my_gen
                {
                    return;
                }
                let slice = left.min(Duration::from_millis(50));
                tokio::time::sleep(slice).await;
                left = left.checked_sub(slice).unwrap_or(Duration::ZERO);
            }
        }
        log::debug!("temp loop {} terminé", my_gen);
    }
}

// ============================================================================
// Visual key — stable representation of what the LCD will display
// ============================================================================
fn visual_key(t: Temperatures, decimals: u8, config_version: u32) -> String {
    let d = decimals.min(2) as usize;
    format!(
        "{}|{:.*}|{:.*}|{:.*}|{}",
        config_version,
        d,
        t.cpu,
        d,
        t.gpu,
        d,
        t.liquid,
        t.pump_rpm.round() as i64
    )
}

// ============================================================================
// Interrupt IN polling task
// ============================================================================
async fn poll_interrupt_in(
    mut ep: Endpoint<Interrupt, In>,
    pkt_size: usize,
    tx: mpsc::UnboundedSender<Vec<u8>>,
    mut shutdown: oneshot::Receiver<()>,
) {
    // Pre-submit 2 reads so we never miss a packet.
    for _ in 0..2 {
        ep.submit(Buffer::new(pkt_size));
    }
    loop {
        tokio::select! {
            _ = &mut shutdown => break,
            comp = ep.next_complete() => {
                match comp.status {
                    Ok(()) => {
                        let data: Vec<u8> = comp.buffer.into_vec();
                        parse_device_status(&data);
                        if tx.send(data).is_err() {
                            break;
                        }
                    }
                    Err(TransferError::Cancelled) => break,
                    Err(e) => {
                        log::warn!("intr_in poll error: {e:?}");
                    }
                }
                ep.submit(Buffer::new(pkt_size));
            }
        }
    }
    ep.cancel_all();
    log::debug!("interrupt-in poller stopped");
}

/// Parse NZXT Kraken status packets (byte[0] = 0x75).
/// Format (Kraken Elite / KrakenX3 firmware):
///   [0]     = 0x75  (status message ID)
///   [15]    = liquid temp integer part (°C)
///   [16]    = liquid temp fractional part (tenths, 0–9)
///   [17:19] = pump speed big-endian u16 (RPM)
fn parse_device_status(data: &[u8]) {
    if data.len() < 20 || data[0] != 0x75 {
        return;
    }
    let liquid = data[15] as f64 + data[16] as f64 / 10.0;
    let pump = u16::from_le_bytes([data[17], data[18]]) as f64;
    // Sanity-check: liquid must be in a plausible range (1–59 °C)
    if liquid >= 1.0 && liquid <= 59.0 {
        crate::sensors::update_device_temps(liquid, pump);
        log::trace!("device status: liquid={liquid:.1}°C pump={pump:.0}RPM");
    }
}

// ============================================================================
// Low-level I/O helpers
// ============================================================================

async fn write_cmd(hw: &mut Hardware, data: &[u8]) -> Result<()> {
    // Firmware expects fixed 512-byte interrupt OUT frames (same as Electron's
    // Buffer.alloc(PKT, 0) where PKT=512). Command bytes go at offset 0, rest is zeros.
    let mut buf = vec![0u8; PKT_SIZE];
    let n = data.len().min(PKT_SIZE);
    buf[..n].copy_from_slice(&data[..n]);
    hw.intr_out.submit(Buffer::from(buf));
    let comp = hw.intr_out.next_complete().await;
    comp.status
        .map_err(|e| anyhow!("interrupt_out failed: {e:?}"))?;
    Ok(())
}

async fn read_one(hw: &mut Hardware, timeout: Duration) -> Option<Vec<u8>> {
    match tokio::time::timeout(timeout, hw.intr_rx.recv()).await {
        Ok(Some(v)) => Some(v),
        _ => None,
    }
}

async fn drain_rx(rx: &mut mpsc::UnboundedReceiver<Vec<u8>>, total: Duration) {
    let deadline = Instant::now() + total;
    let mut n = 0;
    loop {
        let now = Instant::now();
        if now >= deadline {
            break;
        }
        let remain = deadline - now;
        match tokio::time::timeout(remain.min(Duration::from_millis(50)), rx.recv()).await {
            Ok(Some(_)) => {
                n += 1;
            }
            _ => break,
        }
    }
    if n > 0 {
        log::debug!("drained {} stale responses", n);
    }
}

async fn read_until(
    hw: &mut Hardware,
    prefix: &[u8],
    max_attempts: u32,
    per_read_ms: u64,
) -> Option<Vec<u8>> {
    for _ in 0..max_attempts {
        let pkt = read_one(hw, Duration::from_millis(per_read_ms)).await;
        if let Some(buf) = pkt {
            if buf.len() >= prefix.len() && buf[..prefix.len()] == *prefix {
                return Some(buf);
            }
        }
    }
    log::warn!(
        "TIMEOUT [{}]",
        prefix
            .iter()
            .map(|b| format!("{:02x}", b))
            .collect::<Vec<_>>()
            .join("")
    );
    None
}

async fn write_read(
    hw: &mut Hardware,
    data: &[u8],
    expected_prefix: &[u8],
) -> Option<Vec<u8>> {
    if let Err(e) = write_cmd(hw, data).await {
        log::warn!("write_cmd failed: {e}");
        return None;
    }
    read_until(hw, expected_prefix, 25, 800).await
}

async fn bulk_write(hw: &mut Hardware, data: Vec<u8>) -> Result<()> {
    hw.bulk_out.submit(Buffer::from(data));
    let comp = hw.bulk_out.next_complete().await;
    comp.status
        .map_err(|e| anyhow!("bulk_out failed: {e:?}"))?;
    Ok(())
}

async fn bulk_write_all(hw: &mut Hardware, data: &[u8]) -> Result<()> {
    let mut sent = 0;
    while sent < data.len() {
        let end = (sent + BULK_CHUNK).min(data.len());
        let chunk = data[sent..end].to_vec();
        bulk_write(hw, chunk).await?;
        sent = end;
        log::trace!("bulk: {}/{}", sent, data.len());
    }
    Ok(())
}

// ============================================================================
// sendFw3 — static RGBA frame (full reset → setup → bulk → switch)
// ============================================================================
#[allow(dead_code)]
async fn send_fw3(hw: &mut Hardware, image: &[u8], bulk_info: &[u8]) -> Result<()> {
    let data_size = ((MAGIC.len() + bulk_info.len() + image.len()) as u32).div_ceil(1024);
    let dsz = [(data_size & 0xff) as u8, ((data_size >> 8) & 0xff) as u8];

    drain_rx(&mut hw.intr_rx, Duration::from_millis(300)).await;
    tokio::time::sleep(Duration::from_millis(50)).await;

    // FW query — wakes the protocol.
    write_cmd(hw, &[0x10, 0x01]).await?;
    if let Some(r) = read_until(hw, &[0x11, 0x01], 20, 800).await {
        if r.len() >= 5 {
            log::debug!("FW: {}.{}.{}", r[2], r[3], r[4]);
        }
    }
    drain_rx(&mut hw.intr_rx, Duration::from_millis(200)).await;
    tokio::time::sleep(Duration::from_millis(50)).await;

    // Init.
    let init_r = write_read(hw, &[0x36, 0x03], &[0x37, 0x03]).await;
    log::debug!("Init: code={}", init_r.as_ref().and_then(|b| b.get(14).copied()).unwrap_or(0xff));
    tokio::time::sleep(Duration::from_millis(30)).await;

    // Switch to liquid mode (releases any currently-active bucket → deletable).
    write_cmd(hw, &[0x38, 0x01, 0x02, 0x00]).await?;
    let liq_r = read_until(hw, &[0x39, 0x01], 10, 500).await;
    log::debug!("Liquid reset: code={}", liq_r.as_ref().and_then(|b| b.get(14).copied()).unwrap_or(0xff));
    tokio::time::sleep(Duration::from_millis(100)).await;

    // Find a usable bucket: delete in order until one returns code=1.
    let mut bucket: u8 = 0;
    for b_i in 0..8u8 {
        write_cmd(hw, &[0x32, 0x02, b_i]).await?;
        let r = read_until(hw, &[0x33, 0x02], 15, 600).await;
        let code = r.as_ref().and_then(|b| b.get(14).copied()).unwrap_or(0);
        log::debug!("Delete bucket {}: code={}", b_i, code);
        if code == 1 {
            bucket = b_i;
            break;
        }
    }
    log::debug!("Using bucket {} — dsz=[{:#x},{:#x}]", bucket, dsz[0], dsz[1]);

    // Setup bucket.
    let setup_r = write_read(
        hw,
        &[0x32, 0x01, bucket, bucket + 1, 0x00, 0x00, dsz[0], dsz[1], 0x01],
        &[0x33, 0x01],
    )
    .await;
    log::debug!("Setup bucket {}: code={}", bucket, setup_r.as_ref().and_then(|b| b.get(14).copied()).unwrap_or(0xff));
    tokio::time::sleep(Duration::from_millis(30)).await;

    // Start transfer.
    write_cmd(hw, &[0x36, 0x01, bucket]).await?;
    let start_r = read_until(hw, &[0x37, 0x01], 20, 800).await;
    log::debug!("Start transfer: code={}", start_r.as_ref().and_then(|b| b.get(14).copied()).unwrap_or(0xff));
    tokio::time::sleep(Duration::from_millis(30)).await;

    // CRITICAL: header (MAGIC + bulk_info) must be a SEPARATE bulk transfer.
    let mut header = Vec::with_capacity(MAGIC.len() + bulk_info.len());
    header.extend_from_slice(&MAGIC);
    header.extend_from_slice(bulk_info);
    log::debug!("Bulk write: header {}B + image {}B", header.len(), image.len());
    bulk_write(hw, header).await?;
    bulk_write_all(hw, image).await?;
    log::debug!("Bulk write done");

    // End transfer.
    write_cmd(hw, &[0x36, 0x02]).await?;
    tokio::time::sleep(Duration::from_millis(100)).await;

    // Activate.
    let act_r = write_read(hw, &[0x38, 0x01, 0x04, bucket], &[0x39, 0x01]).await;
    log::debug!("Activate bucket {}: code={}", bucket, act_r.as_ref().and_then(|b| b.get(14).copied()).unwrap_or(0xff));
    tokio::time::sleep(Duration::from_millis(100)).await;
    log::debug!("sendFw3 done (bucket {})", bucket);
    Ok(())
}

// ============================================================================
// Native data send (GIF or RGBA with smart bucket placement)
// ============================================================================
async fn send_data_native(
    hw: &mut Hardware,
    data: &[u8],
    bulk_info: &[u8],
) -> Result<()> {
    drain_rx(&mut hw.intr_rx, Duration::from_millis(200)).await;

    // 1. Preamble.
    let preamble_r = write_read(hw, &[0x36, 0x03], &[0x37, 0x03]).await;
    log::debug!("Preamble: code={}", preamble_r.as_ref().and_then(|b| b.get(14).copied()).unwrap_or(0xff));

    // 2. Query buckets + pick.
    let buckets = query_buckets(hw).await;
    log::debug!("Buckets trouvés: {}", buckets.len());
    let free = find_next_unoccupied_bucket(&buckets);
    let mut bucket_index = prepare_bucket(
        hw,
        if free != -1 { free as u8 } else { 0 },
        free == -1,
    )
    .await?;
    log::debug!("Native: bucket={} (free={})", bucket_index, free);

    // 3. Header + size.
    let header = {
        let mut h = Vec::with_capacity(MAGIC.len() + bulk_info.len());
        h.extend_from_slice(&MAGIC);
        h.extend_from_slice(bulk_info);
        h
    };
    let data_size = ((header.len() + data.len()) as u32).div_ceil(1024);
    let dsz = [(data_size & 0xff) as u8, ((data_size >> 8) & 0xff) as u8];

    // 4. Memory offset.
    let mem_start = match get_bucket_memory_offset(&buckets, bucket_index, data_size) {
        Some(off) => off,
        None => {
            log::warn!("Mémoire saturée — reset complet de tous les buckets");
            delete_all_buckets(hw).await;
            bucket_index = 0;
            [0, 0]
        }
    };
    log::debug!("Native: bucket={} memStart={:?} dataSize={} dsz={:?}", bucket_index, mem_start, data_size, dsz);

    // 5. Setup bucket.
    let setup_ok = setup_bucket(hw, bucket_index, bucket_index + 1, mem_start, dsz).await;
    log::debug!("Setup bucket {}: ok={}", bucket_index, setup_ok);

    // 6. Start transfer.
    let start_r = write_read(hw, &[0x36, 0x01, bucket_index], &[0x37, 0x01]).await;
    log::debug!("Start transfer: code={}", start_r.as_ref().and_then(|b| b.get(14).copied()).unwrap_or(0xff));

    // 7. Bulk write — header separate from data (critical rule #1).
    log::debug!("Bulk: header={}B data={}B", header.len(), data.len());
    bulk_write(hw, header).await?;
    bulk_write_all(hw, data).await?;
    log::debug!("Bulk done");

    // 8. End.
    write_cmd(hw, &[0x36, 0x02]).await?;
    tokio::time::sleep(Duration::from_millis(100)).await;

    // 9. Activate.
    let act_ok = switch_bucket(hw, bucket_index, 0x04).await;
    log::debug!("Activate bucket {}: ok={}", bucket_index, act_ok);
    log::debug!("send_data_native done (bucket {})", bucket_index);
    Ok(())
}

// ============================================================================
// Bucket helpers
// ============================================================================
async fn query_buckets(hw: &mut Hardware) -> HashMap<u8, Vec<u8>> {
    let mut out = HashMap::new();
    for b_i in 0..16u8 {
        if write_cmd(hw, &[0x30, 0x04, b_i]).await.is_err() {
            continue;
        }
        if let Some(r) = read_until(hw, &[0x31, 0x04], 10, 400).await {
            out.insert(b_i, r);
        }
    }
    out
}

fn find_next_unoccupied_bucket(buckets: &HashMap<u8, Vec<u8>>) -> i32 {
    for (&b_i, info) in buckets {
        let mut occupied = false;
        for j in 15..info.len() {
            if info[j] != 0 {
                occupied = true;
                break;
            }
        }
        if !occupied {
            return b_i as i32;
        }
    }
    -1
}

async fn delete_bucket(hw: &mut Hardware, b_i: u8) -> bool {
    if write_cmd(hw, &[0x32, 0x02, b_i]).await.is_err() {
        return false;
    }
    let r = read_until(hw, &[0x33, 0x02], 12, 500).await;
    matches!(r.as_ref().and_then(|b| b.get(14).copied()), Some(0x01))
}

async fn prepare_bucket(hw: &mut Hardware, bucket_index: u8, bucket_filled: bool) -> Result<u8> {
    let mut idx = bucket_index;
    let mut filled = bucket_filled;
    loop {
        if idx >= 16 {
            bail!("reached max bucket");
        }
        let ok = delete_bucket(hw, idx).await;
        if !ok {
            idx += 1;
            filled = true;
            continue;
        }
        if filled {
            filled = false;
            continue;
        }
        return Ok(idx);
    }
}

fn get_bucket_memory_offset(
    buckets: &HashMap<u8, Vec<u8>>,
    bucket_index: u8,
    data_size: u32,
) -> Option<[u8; 2]> {
    let cur = match buckets.get(&bucket_index) {
        Some(b) => b,
        None => return Some([0x00, 0x00]),
    };
    if cur.len() < 21 {
        return Some([0x00, 0x00]);
    }
    let cur_offset = (cur[17] as u32) | ((cur[18] as u32) << 8);
    let cur_size = (cur[19] as u32) | ((cur[20] as u32) << 8);

    if data_size <= cur_size {
        return Some([cur[17], cur[18]]);
    }

    let mut min_occupied = cur_offset;
    let mut max_occupied: u32 = 0;
    let mut overlap = false;
    for (&b_i, b) in buckets {
        if b.len() < 21 {
            continue;
        }
        let start = (b[17] as u32) | ((b[18] as u32) << 8);
        let end = start + ((b[19] as u32) | ((b[20] as u32) << 8));
        if end > max_occupied {
            max_occupied = end;
        }
        if start < min_occupied {
            min_occupied = start;
        }
        let cur_end = cur_offset + data_size;
        if (start > cur_offset && start < cur_end)
            || (start < cur_offset && end > start)
            || (start == cur_offset && b_i != bucket_index)
        {
            overlap = true;
        }
    }
    if !overlap {
        return Some([cur[17], cur[18]]);
    }
    if max_occupied + data_size < LCD_TOTAL_MEMORY {
        return Some([(max_occupied & 0xff) as u8, ((max_occupied >> 8) & 0xff) as u8]);
    }
    if data_size < min_occupied {
        return Some([0x00, 0x00]);
    }
    None
}

async fn setup_bucket(
    hw: &mut Hardware,
    start_b: u8,
    end_b: u8,
    mem_start: [u8; 2],
    mem_size: [u8; 2],
) -> bool {
    let r = write_read(
        hw,
        &[
            0x32, 0x01, start_b, end_b, mem_start[0], mem_start[1], mem_size[0], mem_size[1], 0x01,
        ],
        &[0x33, 0x01],
    )
    .await;
    matches!(r.as_ref().and_then(|b| b.get(14).copied()), Some(0x01))
}

async fn switch_bucket(hw: &mut Hardware, bucket_index: u8, mode: u8) -> bool {
    let r = write_read(hw, &[0x38, 0x01, mode, bucket_index], &[0x39, 0x01]).await;
    matches!(r.as_ref().and_then(|b| b.get(14).copied()), Some(0x01))
}

async fn delete_all_buckets(hw: &mut Hardware) {
    let _ = switch_bucket(hw, 0, 0x02).await;
    for b_i in 0..16u8 {
        let _ = delete_bucket(hw, b_i).await;
    }
}

// ============================================================================
// Ring LED command builder  (liquidctl KrakenX3 / KrakenZ3 protocol)
// Ring channel ID = 0b010 = 2 ;  static value for 0b010 = 8
// Colors on the wire are GRB (not RGB).
// ============================================================================

/// Speed timing bytes: (speed_scale, speed_index) → [lo, hi]
fn ring_speed(scale: u8, idx: usize) -> [u8; 2] {
    const TABLE: &[&[[u8; 2]]] = &[
        &[[0x32,0x00],[0x32,0x00],[0x32,0x00],[0x32,0x00],[0x32,0x00]], // 0
        &[[0x50,0x00],[0x3C,0x00],[0x28,0x00],[0x14,0x00],[0x0A,0x00]], // 1
        &[[0x5E,0x01],[0x2C,0x01],[0xFA,0x00],[0x96,0x00],[0x50,0x00]], // 2
        &[[0x40,0x06],[0x14,0x05],[0xE8,0x03],[0x20,0x03],[0x58,0x02]], // 3
        &[[0x20,0x03],[0xBC,0x02],[0xF4,0x01],[0x90,0x01],[0x2C,0x01]], // 4
        &[[0x19,0x00],[0x14,0x00],[0x0F,0x00],[0x07,0x00],[0x04,0x00]], // 5
        &[[0x28,0x00],[0x1E,0x00],[0x14,0x00],[0x0A,0x00],[0x04,0x00]], // 6
    ];
    let row = TABLE.get(scale as usize).unwrap_or(&TABLE[0]);
    row[idx.min(4)]
}

fn build_ring_cmd(channel: crate::types::RingChannel, mode: crate::types::RingMode) -> Vec<u8> {
    use crate::types::RingMode::*;

    let cid = channel.byte();
    let static_val = channel.static_val();

    let (mval, speed_scale, mode_rel, backward, rgb_colors, speed_idx, led_size_override) =
        match &mode {
            Off => (0x00u8, 0u8, 0x00u8, 0x00u8, vec![[0u8,0,0]], 2usize, None),
            Fixed { r, g, b } =>
                (0x00, 0, 0x00, 0x00, vec![[*r,*g,*b]], 2, None),
            Breathing { r, g, b, speed } =>
                (0x07, 6, 0x08, 0x00, vec![[*r,*g,*b]], speed.idx(), None),
            Pulse { r, g, b, speed } =>
                (0x06, 5, 0x08, 0x00, vec![[*r,*g,*b]], speed.idx(), None),
            Fading { colors, speed } => {
                let c: Vec<[u8;3]> = colors.iter().take(8).cloned().collect();
                (0x01, 1, 0x08, 0x00, c, speed.idx(), None)
            }
            SpectrumWave { speed } =>
                (0x02, 2, 0x00, 0x00, vec![], speed.idx(), None),
            RainbowFlow { speed } =>
                (0x0B, 2, 0x00, 0x00, vec![], speed.idx(), None),
            RainbowPulse { speed } =>
                (0x0D, 2, 0x00, 0x00, vec![], speed.idx(), None),
            SuperRainbow { speed } =>
                (0x0C, 2, 0x00, 0x00, vec![], speed.idx(), None),
            Marquee { r, g, b, speed } =>
                (0x04, 2, 0x00, 0x00, vec![[*r,*g,*b]], speed.idx(), Some(0x03u8)),
            StaryNight { r, g, b, speed } =>
                (0x09, 5, 0x01, 0x00, vec![[*r,*g,*b]], speed.idx(), None),
        };

    let spd = ring_speed(speed_scale, speed_idx);
    let color_count = rgb_colors.len() as u8;

    // Header: opcode(2) + cid×2(2) + mval(1) + speed(2) = 7 bytes
    let mut cmd: Vec<u8> = vec![0x2A, 0x04, cid, cid, mval, spd[0], spd[1]];

    // Color data: up to 16 colours × 3 bytes, in GRB order
    // Apply sRGB→linear gamma correction (^2.2) so LED output matches UI swatch perception.
    // LEDs are linear devices; without correction they appear much brighter than expected.
    let mut color_bytes = [0u8; 48];
    for (i, &[r, g, b]) in rgb_colors.iter().enumerate().take(16) {
        let gc = |v: u8| -> u8 { ((v as f64 / 255.0).powf(2.2) * 255.0).round() as u8 };
        color_bytes[i * 3]     = gc(g); // GRB!
        color_bytes[i * 3 + 1] = gc(r);
        color_bytes[i * 3 + 2] = gc(b);
    }
    cmd.extend_from_slice(&color_bytes);

    // Footer: backward(1) + count(1) + mode_rel(1) + static(1) + led_size(1)
    let led_size = led_size_override.unwrap_or(0x03);
    cmd.extend_from_slice(&[backward, color_count, mode_rel, static_val, led_size]);

    cmd
}

/// Linear interpolation of duty% for a given temperature, from a sorted list of (temp, duty) pairs.
fn interp_duty(points: &[(u8, u8)], temp: u8) -> u8 {
    if points.is_empty() { return 20; }
    if temp <= points[0].0 { return points[0].1; }
    if temp >= points[points.len() - 1].0 { return points[points.len() - 1].1; }
    for i in 0..points.len() - 1 {
        let (t0, s0) = points[i];
        let (t1, s1) = points[i + 1];
        if temp >= t0 && temp <= t1 {
            if t1 == t0 { return s0; }
            let ratio = (temp - t0) as f32 / (t1 - t0) as f32;
            return (s0 as f32 + ratio * (s1 as f32 - s0 as f32)).round() as u8;
        }
    }
    points[points.len() - 1].1
}
