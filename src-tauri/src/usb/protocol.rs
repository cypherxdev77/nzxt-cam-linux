//! NZXT Kraken USB protocol constants — kept in sync with liquidctl's krakenz3.py.

pub const NZXT_VID: u16 = 0x1e71;

pub const KRAKEN_PIDS: &[u16] = &[0x3008, 0x3009, 0x300c, 0x300e, 0x3012];

pub fn product_name(pid: u16) -> &'static str {
    match pid {
        0x3008 => "Kraken Elite 280",
        0x3009 => "Kraken Elite 360",
        0x300c => "Kraken Elite RGB 280",
        0x300e => "Kraken Elite RGB 360",
        0x3012 => "Kraken Elite V2",
        _ => "Kraken (unknown)",
    }
}

/// Interrupt OUT/IN packet size (commands + ACKs).
pub const PKT_SIZE: usize = 512;

/// Magic prefix for bulk transfers.
pub const MAGIC: [u8; 12] = [
    0x12, 0xfa, 0x01, 0xe8, 0xab, 0xcd, 0xef, 0x98, 0x76, 0x54, 0x32, 0x10,
];

/// Bulk chunk size used by liquidctl for Kraken Elite (0x3012).
pub const BULK_CHUNK: usize = 2 * 1024 * 1024;

/// Total LCD memory in units of 1024 bytes (cf. liquidctl _LCD_TOTAL_MEMORY).
pub const LCD_TOTAL_MEMORY: u32 = 24320;

/// USB endpoints — typical NZXT Kraken layout. Discovered dynamically when
/// possible; these are sane fallbacks.
pub const BULK_OUT_EP: u8 = 0x02;
pub const INTR_OUT_EP: u8 = 0x01;
pub const INTR_IN_EP: u8 = 0x81;

/// USB interface indexes.
pub const IFACE_BULK: u8 = 0;
pub const IFACE_INTERRUPT: u8 = 1;

/// Encode a u32 size as 4 little-endian bytes (used in bulk_info headers).
pub fn to_le_bytes_u32(n: u32) -> [u8; 4] {
    n.to_le_bytes()
}

/// Build the bulk_info preamble for a static RGBA frame.
/// Format: [0x02, 0x00, 0x00, 0x00, size_LE_4bytes]
pub fn bulk_info_rgba(size: u32) -> [u8; 8] {
    let s = to_le_bytes_u32(size);
    [0x02, 0x00, 0x00, 0x00, s[0], s[1], s[2], s[3]]
}

/// Build the bulk_info preamble for a native GIF.
/// Format: [0x01, 0x00, 0x00, 0x00, size_LE_4bytes]
pub fn bulk_info_gif(size: u32) -> [u8; 8] {
    let s = to_le_bytes_u32(size);
    [0x01, 0x00, 0x00, 0x00, s[0], s[1], s[2], s[3]]
}
