//! Scene renderer — gauges (annular sector), bars (rounded rect), text.
//!
//! Mirrors render.ts from the Electron app. The pixel-perfect arc filling uses
//! the same per-pixel angle test the JS code does (simple and accurate; no
//! bezier approximation needed at 640×640).

use crate::render::fonts::{draw_text, draw_text_centered, font, measure};
use crate::types::{
    hex_to_rgb, resolve_text, BarElement, DisplayConfig, DisplayElement, GaugeElement, MetricId,
    TextElement, Temperatures, LCD_SIZE,
};
use anyhow::Result;
use std::f32::consts::PI;
use tiny_skia::{Pixmap, PremultipliedColorU8};

// ============================================================================
// Public API
// ============================================================================

/// Render a scene to RGBA (640*640*4 bytes) with alpha forced to 0x00.
/// This is the format the Kraken firmware accepts on the bulk endpoint.
pub fn render_for_device(config: &DisplayConfig, temps: Temperatures) -> Result<Vec<u8>> {
    let pixmap = render_scene(config, temps)?;
    Ok(pixmap_to_device_rgba(&pixmap))
}

/// Render a scene to a PNG byte stream (for the WYSIWYG preview).
pub fn render_preview_png(config: &DisplayConfig, temps: Temperatures) -> Result<Vec<u8>> {
    let pixmap = render_scene(config, temps)?;
    let png = pixmap.encode_png().map_err(|e| anyhow::anyhow!("PNG encode: {e}"))?;
    Ok(png)
}

// ============================================================================
// Top-level rendering
// ============================================================================

fn render_scene(config: &DisplayConfig, temps: Temperatures) -> Result<Pixmap> {
    let mut pixmap = Pixmap::new(LCD_SIZE, LCD_SIZE)
        .ok_or_else(|| anyhow::anyhow!("Pixmap allocation failed"))?;

    // Fill background.
    let (br, bg, bb) = hex_to_rgb(&config.background);
    fill_solid(&mut pixmap, br, bg, bb);

    // Ensure font is loaded once (lazy init in fonts.rs). Errors are surfaced
    // only when text elements try to draw — we don't abort on missing font.
    let _ = font();

    let decimals = config.decimals.min(2);
    for el in &config.elements {
        match el {
            DisplayElement::Gauge(g) => {
                if let Err(e) = draw_gauge(&mut pixmap, g, temps, decimals) {
                    log::warn!("gauge draw error: {e}");
                }
            }
            DisplayElement::Bar(b) => {
                if let Err(e) = draw_bar(&mut pixmap, b, temps, decimals) {
                    log::warn!("bar draw error: {e}");
                }
            }
            DisplayElement::Text(t) => {
                if let Err(e) = draw_text_element(&mut pixmap, t, temps, decimals) {
                    log::warn!("text draw error: {e}");
                }
            }
        }
    }
    Ok(pixmap)
}

fn pixmap_to_device_rgba(pm: &Pixmap) -> Vec<u8> {
    // tiny-skia stores premultiplied alpha; we want straight RGB with alpha=0.
    let src = pm.pixels();
    let mut out = vec![0u8; src.len() * 4];
    for (i, p) in src.iter().enumerate() {
        let a = p.alpha();
        let (r, g, b) = if a == 0 {
            (0, 0, 0)
        } else if a == 255 {
            (p.red(), p.green(), p.blue())
        } else {
            // Un-premultiply.
            let inv = 255.0 / a as f32;
            (
                (p.red() as f32 * inv).min(255.0) as u8,
                (p.green() as f32 * inv).min(255.0) as u8,
                (p.blue() as f32 * inv).min(255.0) as u8,
            )
        };
        out[i * 4] = r;
        out[i * 4 + 1] = g;
        out[i * 4 + 2] = b;
        out[i * 4 + 3] = 0; // firmware requirement
    }
    out
}

// ============================================================================
// Primitives
// ============================================================================

fn fill_solid(pm: &mut Pixmap, r: u8, g: u8, b: u8) {
    let color = tiny_skia::Color::from_rgba8(r, g, b, 255);
    pm.fill(color);
}

fn put_pixel(pm: &mut Pixmap, x: i32, y: i32, r: u8, g: u8, b: u8) {
    let w = pm.width() as i32;
    let h = pm.height() as i32;
    if x < 0 || y < 0 || x >= w || y >= h {
        return;
    }
    let idx = (y * w + x) as usize;
    pm.pixels_mut()[idx] = PremultipliedColorU8::from_rgba(r, g, b, 255)
        .unwrap_or_else(|| PremultipliedColorU8::from_rgba(0, 0, 0, 255).unwrap());
}

/// Filled rounded rectangle. (x, y) is the top-left corner.
fn fill_round_rect(pm: &mut Pixmap, x: f32, y: f32, w: f32, h: f32, color: (u8, u8, u8)) {
    if w <= 0.0 || h <= 0.0 {
        return;
    }
    let rad = (h.min(w)) / 2.0;
    let (r, g, b) = color;
    let x0 = x.floor() as i32;
    let y0 = y.floor() as i32;
    let wi = w.ceil() as i32;
    let hi = h.ceil() as i32;

    for yy in 0..hi {
        for xx in 0..wi {
            let fx = xx as f32;
            let fy = yy as f32;
            let inside = if fx < rad && fy < rad {
                ((fx - rad).powi(2) + (fy - rad).powi(2)).sqrt() <= rad
            } else if fx > w - rad && fy < rad {
                ((fx - (w - rad)).powi(2) + (fy - rad).powi(2)).sqrt() <= rad
            } else if fx < rad && fy > h - rad {
                ((fx - rad).powi(2) + (fy - (h - rad)).powi(2)).sqrt() <= rad
            } else if fx > w - rad && fy > h - rad {
                ((fx - (w - rad)).powi(2) + (fy - (h - rad)).powi(2)).sqrt() <= rad
            } else {
                true
            };
            if inside {
                put_pixel(pm, x0 + xx, y0 + yy, r, g, b);
            }
        }
    }
}

// ============================================================================
// Gauge — annular sector with pixel test
// ============================================================================

fn metric_value(metric: MetricId, t: Temperatures) -> f64 {
    metric.value_from(t)
}

fn clamp01(v: f64) -> f64 {
    v.max(0.0).min(1.0)
}

fn draw_gauge(
    pm: &mut Pixmap,
    el: &GaugeElement,
    temps: Temperatures,
    decimals: u8,
) -> Result<()> {
    let v = metric_value(el.metric, temps);
    let frac = clamp01(v / el.max.max(0.0001)) as f32;
    let warn = v >= el.warn_at;
    let fill_rgb = hex_to_rgb(if warn { &el.warn_color } else { &el.color });
    let track_rgb = hex_to_rgb(&el.track_color);

    let r_out = el.radius;
    let r_in = (el.radius - el.thickness).max(0.0);
    let start = (el.start_angle * PI) / 180.0;
    let sweep = el.sweep.max(1.0) * (PI / 180.0);

    let w = pm.width() as i32;
    let h = pm.height() as i32;
    let y0 = ((el.y - r_out).floor().max(0.0) as i32).min(h - 1);
    let y1 = ((el.y + r_out).ceil().max(0.0) as i32).min(h - 1);
    let x0 = ((el.x - r_out).floor().max(0.0) as i32).min(w - 1);
    let x1 = ((el.x + r_out).ceil().max(0.0) as i32).min(w - 1);

    for y in y0..=y1 {
        for x in x0..=x1 {
            let dx = x as f32 - el.x;
            let dy = y as f32 - el.y;
            let d = (dx * dx + dy * dy).sqrt();
            if d < r_in || d > r_out {
                continue;
            }
            // atan2(dx, -dy): 0 at top, sweeping clockwise.
            let mut a = dx.atan2(-dy);
            if a < 0.0 {
                a += PI * 2.0;
            }
            let mut rel = a - start;
            if rel < 0.0 {
                rel += PI * 2.0;
            }
            if rel > sweep {
                continue;
            }
            let t = rel / sweep;
            let (r, g, b) = if t <= frac { fill_rgb } else { track_rgb };
            put_pixel(pm, x, y, r, g, b);
        }
    }

    // Centered label + value stack.
    let mut lines: Vec<(String, f32, (u8, u8, u8))> = Vec::new();
    if el.show_label && !el.label.is_empty() {
        let size = (el.value_size * 0.42).max(12.0);
        lines.push((el.label.clone(), size, (0x9a, 0xa0, 0xb4)));
    }
    if el.show_value {
        let txt = format!("{}{}", crate::types::format_metric(v, decimals), el.metric.unit());
        let color = if warn { hex_to_rgb(&el.warn_color) } else { hex_to_rgb(&el.color) };
        lines.push((txt, el.value_size, color));
    }
    if !lines.is_empty() {
        draw_centered_stack(pm, el.x, el.y, &lines)?;
    }
    Ok(())
}

fn draw_centered_stack(
    pm: &mut Pixmap,
    cx: f32,
    cy: f32,
    lines: &[(String, f32, (u8, u8, u8))],
) -> Result<()> {
    let gap = 4.0;
    let measured: Vec<_> = lines
        .iter()
        .map(|(s, sz, _)| measure(s, *sz).map(|m| (m, *sz)))
        .collect::<Result<Vec<_>>>()?;
    let total: f32 = measured.iter().map(|(m, _)| m.height).sum::<f32>()
        + gap * (lines.len().saturating_sub(1) as f32);
    let mut cur = cy - total / 2.0;
    for ((text, _, color), (m, sz)) in lines.iter().zip(measured.iter()) {
        let x = cx - m.width / 2.0;
        let y = cur;
        draw_text(pm, x, y, text, *sz, *color)?;
        cur += m.height + gap;
    }
    Ok(())
}

// ============================================================================
// Bar — rounded rect track + filled portion + label/value row above
// ============================================================================

fn draw_bar(pm: &mut Pixmap, el: &BarElement, temps: Temperatures, decimals: u8) -> Result<()> {
    let v = metric_value(el.metric, temps);
    let frac = clamp01(v / el.max.max(0.0001)) as f32;
    let warn = v >= el.warn_at;
    let fill_rgb = hex_to_rgb(if warn { &el.warn_color } else { &el.color });
    let track_rgb = hex_to_rgb(&el.track_color);

    let left = el.x - el.width / 2.0;
    let top = el.y - el.height / 2.0;
    fill_round_rect(pm, left, top, el.width, el.height, track_rgb);
    if frac > 0.0 {
        let fw = (el.width * frac).max(el.height); // ensure rounded end shows
        fill_round_rect(pm, left, top, fw, el.height, fill_rgb);
    }

    // Label (left) + value (right) on a row above the bar.
    let row_y = top - el.value_size * 1.05;
    if el.show_label && !el.label.is_empty() {
        draw_text(pm, left, row_y, &el.label, el.value_size, (0x9a, 0xa0, 0xb4))?;
    }
    if el.show_value {
        let s = format!("{}{}", crate::types::format_metric(v, decimals), el.metric.unit());
        let m = measure(&s, el.value_size)?;
        let x = left + el.width - m.width;
        draw_text(pm, x, row_y, &s, el.value_size, (0xff, 0xff, 0xff))?;
    }
    Ok(())
}

// ============================================================================
// Text element
// ============================================================================

fn draw_text_element(
    pm: &mut Pixmap,
    el: &TextElement,
    temps: Temperatures,
    decimals: u8,
) -> Result<()> {
    let text = resolve_text(&el.text, temps, decimals);
    if text.is_empty() {
        return Ok(());
    }
    let m = measure(&text, el.size)?;
    use crate::types::TextAlign;
    let x = match el.align {
        TextAlign::Left => el.x,
        TextAlign::Center => el.x - m.width / 2.0,
        TextAlign::Right => el.x - m.width,
    };
    let y = el.y - m.height / 2.0;
    let color = hex_to_rgb(&el.color);
    draw_text(pm, x, y, &text, el.size, color)?;
    Ok(())
}

// ============================================================================
// Convenience: convert pixmap to base64 data URL (used by the preview command).
// ============================================================================

pub fn pixmap_to_data_url(pm: &Pixmap) -> Result<String> {
    let png = pm.encode_png().map_err(|e| anyhow::anyhow!("PNG encode: {e}"))?;
    use base64::Engine;
    let b64 = base64::engine::general_purpose::STANDARD.encode(&png);
    Ok(format!("data:image/png;base64,{}", b64))
}

#[allow(dead_code)]
fn draw_centered(
    pm: &mut Pixmap,
    cx: f32,
    cy: f32,
    text: &str,
    size: f32,
    color: (u8, u8, u8),
) -> Result<()> {
    draw_text_centered(pm, cx, cy, text, size, color)
}
