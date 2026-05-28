//! Font loading + glyph rasterization on top of tiny-skia pixmaps.
//!
//! We embed Inter (Bold + Regular) into the binary so the app works without any
//! system font dependency. If the embedded files are missing at compile time
//! (e.g. fresh checkout), we fall back to common Linux system font paths so the
//! crate still builds.

use ab_glyph::{Font, FontVec, PxScale, ScaleFont};
use anyhow::{anyhow, Result};
use once_cell::sync::OnceCell;
use tiny_skia::{Pixmap, PremultipliedColorU8};

/// System font fallback search paths (tried in order).
const SYSTEM_FALLBACKS: &[&str] = &[
    "/usr/share/fonts/inter/Inter-Bold.ttf",
    "/usr/share/fonts/TTF/Inter-Bold.ttf",
    "/usr/share/fonts/inter/Inter-Regular.ttf",
    "/usr/share/fonts/TTF/Inter-Regular.ttf",
    "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/TTF/DejaVuSans.ttf",
    "/usr/share/fonts/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/noto/NotoSans-Regular.ttf",
    "/usr/share/fonts/TTF/NotoSans-Regular.ttf",
];

static FONT_CACHE: OnceCell<FontVec> = OnceCell::new();

/// Get the global font, loading it from disk on first call.
pub fn font() -> Result<&'static FontVec> {
    if let Some(f) = FONT_CACHE.get() {
        return Ok(f);
    }
    let bytes = load_font_bytes()?;
    let font = FontVec::try_from_vec(bytes).map_err(|e| anyhow!("Font parse: {e}"))?;
    let _ = FONT_CACHE.set(font);
    Ok(FONT_CACHE.get().unwrap())
}

fn load_font_bytes() -> Result<Vec<u8>> {
    // First, try a resource bundled next to the executable / project root.
    let candidates: Vec<std::path::PathBuf> = bundled_font_candidates();
    for p in &candidates {
        if let Ok(bytes) = std::fs::read(p) {
            log::info!("Loaded font: {}", p.display());
            return Ok(bytes);
        }
    }
    // Then system fonts.
    for p in SYSTEM_FALLBACKS {
        if let Ok(bytes) = std::fs::read(p) {
            log::info!("Loaded system font: {}", p);
            return Ok(bytes);
        }
    }
    Err(anyhow!(
        "Aucune police trouvée — installez ttf-inter, ttf-dejavu ou noto-fonts \
         (Arch : `pacman -S ttf-inter` ou `ttf-dejavu`)"
    ))
}

fn bundled_font_candidates() -> Vec<std::path::PathBuf> {
    let mut v = Vec::new();
    // Resource folder relative to current exe (Tauri-packaged build).
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            v.push(dir.join("resources/fonts/Inter-Bold.ttf"));
            v.push(dir.join("../resources/fonts/Inter-Bold.ttf"));
            v.push(dir.join("../share/nzxtcam-archlinux-rust/fonts/Inter-Bold.ttf"));
        }
    }
    // Dev-tree path relative to CARGO_MANIFEST_DIR (set at build time).
    let manifest = env!("CARGO_MANIFEST_DIR");
    v.push(std::path::Path::new(manifest).join("resources/fonts/Inter-Bold.ttf"));
    v.push(std::path::Path::new(manifest).join("resources/fonts/Inter-Regular.ttf"));
    v
}

#[derive(Debug, Clone, Copy)]
pub struct TextMetrics {
    pub width: f32,
    pub height: f32,
    pub ascent: f32,
}

pub fn measure(text: &str, size_px: f32) -> Result<TextMetrics> {
    let font = font()?;
    let scale = PxScale::from(size_px);
    let scaled = font.as_scaled(scale);

    let mut width: f32 = 0.0;
    let mut prev = None;
    for c in text.chars() {
        let glyph_id = scaled.glyph_id(c);
        if let Some(prev_id) = prev {
            width += scaled.kern(prev_id, glyph_id);
        }
        width += scaled.h_advance(glyph_id);
        prev = Some(glyph_id);
    }
    let ascent = scaled.ascent();
    let height = scaled.ascent() - scaled.descent();
    Ok(TextMetrics {
        width,
        height,
        ascent,
    })
}

/// Draw `text` so its top-left corner is at (x, y), with the given color.
pub fn draw_text(pixmap: &mut Pixmap, x: f32, y: f32, text: &str, size_px: f32, color: (u8, u8, u8)) -> Result<f32> {
    let font = font()?;
    let scale = PxScale::from(size_px);
    let scaled = font.as_scaled(scale);

    let baseline_y = y + scaled.ascent();
    let mut cursor_x = x;
    let mut prev = None;

    let (r, g, b) = color;
    let pm_w = pixmap.width() as i32;
    let pm_h = pixmap.height() as i32;
    let data = pixmap.pixels_mut();

    for ch in text.chars() {
        let glyph_id = scaled.glyph_id(ch);
        if let Some(prev_id) = prev {
            cursor_x += scaled.kern(prev_id, glyph_id);
        }
        let glyph = glyph_id.with_scale_and_position(scale, ab_glyph::point(cursor_x, baseline_y));
        if let Some(outlined) = font.outline_glyph(glyph) {
            let bb = outlined.px_bounds();
            outlined.draw(|gx, gy, coverage| {
                let px = bb.min.x as i32 + gx as i32;
                let py = bb.min.y as i32 + gy as i32;
                if px < 0 || py < 0 || px >= pm_w || py >= pm_h {
                    return;
                }
                let idx = (py * pm_w + px) as usize;
                let cov = coverage.clamp(0.0, 1.0);
                blend_pixel(&mut data[idx], r, g, b, cov);
            });
        }
        cursor_x += scaled.h_advance(glyph_id);
        prev = Some(glyph_id);
    }
    Ok(cursor_x - x)
}

/// Draw `text` centered around (cx, cy).
pub fn draw_text_centered(
    pixmap: &mut Pixmap,
    cx: f32,
    cy: f32,
    text: &str,
    size_px: f32,
    color: (u8, u8, u8),
) -> Result<()> {
    let m = measure(text, size_px)?;
    let x = cx - m.width / 2.0;
    let y = cy - m.height / 2.0;
    draw_text(pixmap, x, y, text, size_px, color)?;
    Ok(())
}

/// Source-over blend of (r,g,b,coverage) onto a premultiplied pixel.
fn blend_pixel(dst: &mut PremultipliedColorU8, r: u8, g: u8, b: u8, cov: f32) {
    let a_src = cov; // 0..1
    let a_dst = dst.alpha() as f32 / 255.0;
    let inv = 1.0 - a_src;
    // Pre-multiplied dst components are already (R*a, G*a, B*a) where a is alpha.
    let dr = dst.red() as f32 / 255.0;
    let dg = dst.green() as f32 / 255.0;
    let db = dst.blue() as f32 / 255.0;
    let sr = r as f32 / 255.0 * a_src;
    let sg = g as f32 / 255.0 * a_src;
    let sb = b as f32 / 255.0 * a_src;
    let out_r = sr + dr * inv;
    let out_g = sg + dg * inv;
    let out_b = sb + db * inv;
    let out_a = a_src + a_dst * inv;
    *dst = PremultipliedColorU8::from_rgba(
        (out_r * 255.0).round().min(255.0) as u8,
        (out_g * 255.0).round().min(255.0) as u8,
        (out_b * 255.0).round().min(255.0) as u8,
        (out_a * 255.0).round().min(255.0) as u8,
    )
    .unwrap_or_else(|| PremultipliedColorU8::from_rgba(0, 0, 0, 0).unwrap());
}
