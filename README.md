# nzxt-cam-linux

LCD & RGB controller for the **NZXT Kraken Elite V2** on Linux.
Native alternative to NZXT CAM (Windows only) — built with Tauri 2 + Rust.

## Features

- LCD display: image, GIF, real-time temperatures
- RGB Ring AIO + fan control
- CPU / GPU / liquid / pump monitoring
- Saveable profiles with Hyprland autostart support
- Native dark UI, zero cloud, zero telemetry

## Installation

### Prerequisites

```bash
# Arch / Manjaro
sudo pacman -S --needed rust nodejs npm webkit2gtk-4.1 base-devel

# Debian / Ubuntu
sudo apt install -y cargo nodejs npm libwebkit2gtk-4.1-dev build-essential
```

### Install

```bash
git clone https://github.com/cypherxdev77/nzxt-cam-linux.git
cd nzxt-cam-linux
./install.sh
```

The script compiles the binary (~1-2 min), installs the app to `~/.local/bin/`,
adds a desktop entry, and configures USB access without sudo.

Then launch from your app launcher by searching **nzxt-cam-linux**, or via:

```bash
nzxtcam-v1
```

### Uninstall

```bash
./uninstall.sh
```

## Supported devices

| Model | PID | Status |
|-------|-----|--------|
| NZXT Kraken Elite V2 (2024) | `0x3012` | Tested |
| NZXT Kraken Elite 360 | `0x3009` | Untested |
| NZXT Kraken Elite RGB 360 | `0x300e` | Untested |
| NZXT Kraken 2023 Elite | `0x300c` | Untested |

To request support for another model, open an issue or use the "Request support" button in Settings.

## Project structure

```
nzxt-cam-linux/
├── src/                       # React + TypeScript frontend
│   ├── App.tsx                # Root layout
│   ├── components/            # UI components
│   │   └── display/           # WYSIWYG scene editor
│   ├── hooks/                 # useDevice / useTemperatures / useIPC
│   ├── i18n/                  # EN / FR translations + LangContext
│   ├── lib/api.ts             # invoke() / listen() wrappers
│   ├── shared/                # Shared types (DisplayConfig, presets)
│   └── styles/
└── src-tauri/                 # Rust backend
    ├── Cargo.toml
    ├── tauri.conf.json
    ├── capabilities/          # Tauri 2 permissions
    └── src/
        ├── main.rs / lib.rs   # Entry point + bootstrap
        ├── commands.rs        # #[tauri::command]s exposed to frontend
        ├── usb/
        │   ├── driver.rs      # KrakenDriver (nusb)
        │   └── protocol.rs    # Protocol constants + helpers
        ├── render/
        │   ├── scene.rs       # tiny-skia rendering (gauges, bars, text)
        │   └── fonts.rs       # ab_glyph + font loading
        ├── sensors/
        │   ├── cpu.rs         # /sys/class/hwmon — k10temp, coretemp...
        │   └── gpu.rs         # /sys/class/hwmon — amdgpu, nvidia, i915
        ├── image_io.rs        # image + gif crates (resize, RGBA)
        ├── config.rs          # Persistence ~/.config/nzxt-cam-linux/
        └── types.rs           # Shared types (serde rename_all=camelCase)
```

## Technical details

### USB protocol

The Kraken Elite firmware expects a very specific sequence:

1. FW query (interrupt OUT) → ACK FW version (interrupt IN)
2. Init `[0x36, 0x03]` → ACK `[0x37, 0x03]`
3. Switch to liquid mode (releases active bucket)
4. Delete bucket loop until code=1
5. Setup bucket with dimensions
6. Start transfer
7. **Bulk write header** (12 bytes MAGIC + 8 bytes bulk_info)
8. **Bulk write image data** — *separate* from step 7 (otherwise silent corruption)
9. End transfer
10. Switch to activated bucket

### Why nusb instead of rusb?

- **Zero system dependency** (rusb requires libusb installed)
- Native async (Tokio integration)
- Direct Linux backend (ioctls on `/dev/bus/usb`)
- Same udev permissions as libusb

### LCD rendering

`tiny-skia` rasterizes a 640×640 RGBA scene:
- Gauges: annular sector via pixel test (angle + radius)
- Bars: filled rounded rectangles
- Text: `ab_glyph` loads a TTF (Inter / DejaVu) and composites glyphs with blending

Alpha is forced to `0x00` in the final buffer (firmware requirement).

### Anti-flicker diff-skip

On every tick of Temperature mode, a *visual key* is computed BEFORE rendering:

```
"{configVersion}|{cpu:.d}|{gpu:.d}|{liquid:.d}|{pump}"
```

If it hasn't changed → no render, no USB push, no `switchBucket`. Result: zero animation jump on the physical LCD as long as the displayed value doesn't change at the configured precision.

## Troubleshooting

**"No Kraken Elite found"**
→ Check that the udev rule is installed and the user is in the `plugdev` group. Test with `lsusb | grep 1e71`.

**Device not detected after app crash**
→ The USB kernel driver remained detached. Reattach it:
```bash
python3 -c "import usb.core; d=usb.core.find(idVendor=0x1e71,idProduct=0x3012); d.attach_kernel_driver(1)"
```

**No font found**
→ Install a TTF font:
```bash
sudo pacman -S ttf-inter      # Arch (preferred)
sudo pacman -S ttf-dejavu     # or
```

## Known limitations

| Limitation | Detail |
|---|---|
| **Liquid temperature** | Fixed at 30 °C — USB read from Kraken not yet implemented |
| **Pump RPM** | Displayed as 0 — same reason |
| **"nzxt-cam" preset** | Not ported from the Electron version (used a Chromium canvas for the conic gradient) |
| **Single device** | No simultaneous multi-AIO support |
| **File drag-drop** | Replaced by a native dialog (Tauri webview blocks `file://` drag-drop) |

## Support the project

nzxt-cam-linux is free and open-source, and will always remain so.

If you like the project, the best way to support it is to **share it** and **star the repo**.

Crypto donations are also welcome:

| Network | Address |
|---------|---------|
| **Bitcoin** | `bc1qxz8ctth9h296dz95v43kerhrlajfqgnt4j9umc` |
| **ERC-20** (ETH, USDT, USDC…) | `0xdB6B57BE02dbb5Baa7f1013207ACEdB2E70b879c` |
| **Solana** | `7nA4q7dDXujLe6SbBX6hx91dMkwTMKcttCX1SNP1bc2v` |

Every star and share counts as much as a donation.

## License

MIT — free to use, modify and redistribute.

## Credits

- [liquidctl](https://github.com/liquidctl/liquidctl) — reverse engineering of the NZXT Kraken protocol
- [Tauri](https://tauri.app) — framework
- [tiny-skia](https://github.com/RazrFalcon/tiny-skia) — pure Rust 2D rasterizer
- [nusb](https://github.com/kevinmehall/nusb) — pure Rust async USB

---

Built by **Cypher** for the Linux community 🐧
