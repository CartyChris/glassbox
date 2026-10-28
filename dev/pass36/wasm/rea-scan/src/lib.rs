//! Byte scanners for GlassBox REA: Shannon entropy and printable-string runs.
//! No allocator, no std I/O: JS writes the file into linear memory at `buf_ptr()`,
//! calls a scanner, and reads results back from `out_ptr()`.
#![no_std]

#[panic_handler]
fn panic(_: &core::panic::PanicInfo) -> ! { loop {} }

static mut BUF: [u8; 0] = [];
const OUT_CAP: usize = 8192; // (offset,len) pairs
static mut OUT: [u32; OUT_CAP * 2] = [0; OUT_CAP * 2];

extern "C" { static __heap_base: u8; }

/// Start of free linear memory: JS grows memory and copies the file here.
#[no_mangle]
pub extern "C" fn buf_ptr() -> *mut u8 { unsafe { core::ptr::addr_of!(__heap_base) as *mut u8 } }
#[no_mangle]
pub extern "C" fn out_ptr() -> *const u32 { unsafe { core::ptr::addr_of!(OUT) as *const u32 } }

/// Shannon entropy in bits per byte of buf[start..end].
#[no_mangle]
pub extern "C" fn entropy(start: usize, end: usize) -> f64 {
    let base = buf_ptr();
    let n = end.saturating_sub(start);
    if n == 0 { return 0.0; }
    let mut f = [0u32; 256];
    let s = unsafe { core::slice::from_raw_parts(base.add(start), n) };
    for &b in s { f[b as usize] += 1; }
    let mut h = 0.0f64;
    let inv = 1.0 / n as f64;
    for &c in f.iter() {
        if c > 0 { let p = c as f64 * inv; h -= p * log2(p); }
    }
    h
}

/// Printable runs (0x20..0x7e or tab) of at least `min` bytes in buf[0..len].
/// Writes up to `cap` (offset,len) pairs to OUT and returns how many.
#[no_mangle]
pub extern "C" fn strings(len: usize, min: usize, cap: usize) -> usize {
    let s = unsafe { core::slice::from_raw_parts(buf_ptr(), len) };
    let cap = if cap > OUT_CAP { OUT_CAP } else { cap };
    let out = unsafe { &mut *core::ptr::addr_of_mut!(OUT) };
    let mut n = 0usize;
    let mut st: isize = -1;
    let mut i = 0usize;
    while i <= len {
        let ok = i < len && { let c = s[i]; (c >= 0x20 && c < 0x7f) || c == 9 };
        if ok { if st < 0 { st = i as isize; } }
        else if st >= 0 {
            let l = i - st as usize;
            if l >= min { out[n * 2] = st as u32; out[n * 2 + 1] = l as u32; n += 1; if n >= cap { return n; } }
            st = -1;
        }
        i += 1;
    }
    n
}

// log2 without libm: frexp-style split + a short polynomial (max error ~1e-7, plenty for entropy).
fn log2(x: f64) -> f64 {
    let bits = x.to_bits();
    let e = ((bits >> 52) & 0x7ff) as i64 - 1023;
    let m = f64::from_bits((bits & 0x000f_ffff_ffff_ffff) | 0x3ff0_0000_0000_0000); // [1,2)
    let t = (m - 1.0) / (m + 1.0);
    let t2 = t * t;
    let ln_m = 2.0 * t * (1.0 + t2 * (1.0 / 3.0 + t2 * (1.0 / 5.0 + t2 * (1.0 / 7.0 + t2 * (1.0 / 9.0 + t2 / 11.0)))));
    e as f64 + ln_m * core::f64::consts::LOG2_E
}
