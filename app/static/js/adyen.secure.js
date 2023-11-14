
/*
 * Adyen Pin Reveal
 *
 * Includes:
 * * RSA(RSA_PKCS1_v1_5) and AES(ECB,CBC) in JavaScript | https://github.com/asmcrypto/
 * * PublicKey Parser | https://git.coolaj86.com/coolaj86/asn1-parser.js
 *
 * Version: 0_0_0
 * Author:  ADYEN (c)

 */

function hex_to_bytes(f) {
    var t = f.length;
    1 & t && (f = "0" + f, t++);
    for (var e = new Uint8Array(t >> 1), r = 0; r < t; r += 2) e[r >> 1] = parseInt(f.substr(r, 2), 16);
    return e
}

function bytes_to_hex(f) {
    for (var t = "", e = 0; e < f.length; e++) {
        var r = (255 & f[e]).toString(16);
        r.length < 2 && (t += "0"), t += r
    }
    return t
}

function bytes_to_string(f, t = !1) {
    for (var e = f.length, r = new Array(e), s = 0, i = 0; s < e; s++) {
        var n = f[s];
        if (!t || n < 128) r[i++] = n; else if (n >= 192 && n < 224 && s + 1 < e) r[i++] = (31 & n) << 6 | 63 & f[++s]; else if (n >= 224 && n < 240 && s + 2 < e) r[i++] = (15 & n) << 12 | (63 & f[++s]) << 6 | 63 & f[++s]; else {
            if (!(n >= 240 && n < 248 && s + 3 < e)) throw new Error("Malformed UTF8 character at byte offset " + s);
            var a = (7 & n) << 18 | (63 & f[++s]) << 12 | (63 & f[++s]) << 6 | 63 & f[++s];
            a <= 65535 ? r[i++] = a : (a ^= 65536, r[i++] = 55296 | a >> 10, r[i++] = 56320 | 1023 & a)
        }
    }
    var h = "", x = 16384;
    for (s = 0; s < i; s += x) h += String.fromCharCode.apply(String, r.slice(s, s + x <= i ? s + x : i));
    return h
}

function is_bytes(f) {
    return f instanceof Uint8Array
}

function _heap_init(f, t) {
    const e = f ? f.byteLength : t || 65536;
    if (4095 & e || e <= 0) throw new Error("heap size must be a positive integer and a multiple of 4096");
    return f = f || new Uint8Array(new ArrayBuffer(e)), f
}

function _heap_write(f, t, e, r, s) {
    const i = f.length - t, n = i < s ? i : s;
    return f.set(e.subarray(r, r + n), t), n
}

function joinBytes(...f) {
    const t = f.reduce((f, t) => f + t.length, 0), e = new Uint8Array(t);
    let r = 0;
    for (let t = 0; t < f.length; t++) e.set(f[t], r), r += f[t].length;
    return e
}

function getNonZeroRandomValues(buf) {
    getRandomValues(buf);
    for (let i = 0; i < buf.length; i++) {
        let byte = buf[i];
        while (!byte) {
            const octet = new Uint8Array(1);
            getRandomValues(octet);
            byte = octet[0];
        }
        buf[i] = byte;
    }
}

function generateAesKey() {
    var keyBuffer = new Uint8Array(32);
    getRandomValues(keyBuffer)
    return bytes_to_hex(keyBuffer);
}

function getRandomInt() {
  min = Math.ceil(1);
  max = Math.floor(9);
  return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
}

var AES_asm = function () {
    var f, t, e = !1;

    function r() {
        f = [], t = [];
        var r, s, i = 1;
        for (r = 0; r < 255; r++) f[r] = i, s = 128 & i, i <<= 1, i &= 255, 128 === s && (i ^= 27), i ^= f[r], t[f[r]] = r;
        f[255] = f[0], t[0] = 0, e = !0
    }

    function s(e, r) {
        var s = f[(t[e] + t[r]) % 255];
        return 0 !== e && 0 !== r || (s = 0), s
    }

    function i(e) {
        var r = f[255 - t[e]];
        return 0 === e && (r = 0), r
    }

    var n, a, h, x, c = !1;

    function o() {
        function f(f) {
            var t, e, r;
            for (e = r = i(f), t = 0; t < 4; t++) e = 255 & (e << 1 | e >>> 7), r ^= e;
            return r ^= 99, r
        }

        e || r(), n = [], a = [], h = [[], [], [], []], x = [[], [], [], []];
        for (var t = 0; t < 256; t++) {
            var o = f(t);
            n[t] = o, a[o] = t, h[0][t] = s(2, o) << 24 | o << 16 | o << 8 | s(3, o), x[0][o] = s(14, t) << 24 | s(9, t) << 16 | s(13, t) << 8 | s(11, t);
            for (var l = 1; l < 4; l++) h[l][t] = h[l - 1][t] >>> 8 | h[l - 1][t] << 24, x[l][o] = x[l - 1][o] >>> 8 | x[l - 1][o] << 24
        }
        c = !0
    }

    var l = function (f, t) {
        c || o();
        var e = new Uint32Array(t);
        e.set(n, 512), e.set(a, 768);
        for (var r = 0; r < 4; r++) e.set(h[r], 4096 + 1024 * r >> 2), e.set(x[r], 8192 + 1024 * r >> 2);

        function s(f, t, r, s, i, a, h, c, o) {
            var u = e.subarray(0, 60), _ = e.subarray(256, 316);
            u.set([t, r, s, i, a, h, c, o]);
            for (var g = f, b = 1; g < 4 * f + 28; g++) {
                var m = u[g - 1];
                (g % f == 0 || 8 === f && g % f == 4) && (m = n[m >>> 24] << 24 ^ n[m >>> 16 & 255] << 16 ^ n[m >>> 8 & 255] << 8 ^ n[255 & m]), g % f == 0 && (m = m << 8 ^ m >>> 24 ^ b << 24, b = b << 1 ^ (128 & b ? 27 : 0)), u[g] = u[g - f] ^ m
            }
            for (var A = 0; A < g; A += 4) for (var d = 0; d < 4; d++) {
                m = u[g - (4 + A) + (4 - d) % 4];
                _[A + d] = A < 4 || A >= g - 4 ? m : x[0][n[m >>> 24]] ^ x[1][n[m >>> 16 & 255]] ^ x[2][n[m >>> 8 & 255]] ^ x[3][n[255 & m]]
            }
            l.set_rounds(f + 5)
        }

        var i = {Uint8Array: Uint8Array, Uint32Array: Uint32Array}, l = function (f, t, e) {
            "use asm";
            var r = 0, s = 0, i = 0, n = 0, a = 0, h = 0, x = 0, c = 0, o = 0, l = 0, u = 0, _ = 0, g = 0, b = 0, m = 0,
                A = 0, d = 0, y = 0, p = 0, E = 0, w = 0;
            var S = new f.Uint32Array(e), C = new f.Uint8Array(e);

            function v(f, t, e, a, h, x, c, o) {
                f = f | 0;
                t = t | 0;
                e = e | 0;
                a = a | 0;
                h = h | 0;
                x = x | 0;
                c = c | 0;
                o = o | 0;
                var l = 0, u = 0, _ = 0, g = 0, b = 0, m = 0, A = 0, d = 0;
                l = e | 0x400, u = e | 0x800, _ = e | 0xc00;
                h = h ^ S[(f | 0) >> 2], x = x ^ S[(f | 4) >> 2], c = c ^ S[(f | 8) >> 2], o = o ^ S[(f | 12) >> 2];
                for (d = 16; (d | 0) <= a << 4; d = d + 16 | 0) {
                    g = S[(e | h >> 22 & 1020) >> 2] ^ S[(l | x >> 14 & 1020) >> 2] ^ S[(u | c >> 6 & 1020) >> 2] ^ S[(_ | o << 2 & 1020) >> 2] ^ S[(f | d | 0) >> 2], b = S[(e | x >> 22 & 1020) >> 2] ^ S[(l | c >> 14 & 1020) >> 2] ^ S[(u | o >> 6 & 1020) >> 2] ^ S[(_ | h << 2 & 1020) >> 2] ^ S[(f | d | 4) >> 2], m = S[(e | c >> 22 & 1020) >> 2] ^ S[(l | o >> 14 & 1020) >> 2] ^ S[(u | h >> 6 & 1020) >> 2] ^ S[(_ | x << 2 & 1020) >> 2] ^ S[(f | d | 8) >> 2], A = S[(e | o >> 22 & 1020) >> 2] ^ S[(l | h >> 14 & 1020) >> 2] ^ S[(u | x >> 6 & 1020) >> 2] ^ S[(_ | c << 2 & 1020) >> 2] ^ S[(f | d | 12) >> 2];
                    h = g, x = b, c = m, o = A
                }
                r = S[(t | h >> 22 & 1020) >> 2] << 24 ^ S[(t | x >> 14 & 1020) >> 2] << 16 ^ S[(t | c >> 6 & 1020) >> 2] << 8 ^ S[(t | o << 2 & 1020) >> 2] ^ S[(f | d | 0) >> 2], s = S[(t | x >> 22 & 1020) >> 2] << 24 ^ S[(t | c >> 14 & 1020) >> 2] << 16 ^ S[(t | o >> 6 & 1020) >> 2] << 8 ^ S[(t | h << 2 & 1020) >> 2] ^ S[(f | d | 4) >> 2], i = S[(t | c >> 22 & 1020) >> 2] << 24 ^ S[(t | o >> 14 & 1020) >> 2] << 16 ^ S[(t | h >> 6 & 1020) >> 2] << 8 ^ S[(t | x << 2 & 1020) >> 2] ^ S[(f | d | 8) >> 2], n = S[(t | o >> 22 & 1020) >> 2] << 24 ^ S[(t | h >> 14 & 1020) >> 2] << 16 ^ S[(t | x >> 6 & 1020) >> 2] << 8 ^ S[(t | c << 2 & 1020) >> 2] ^ S[(f | d | 12) >> 2]
            }

            function M(f, t, e, r) {
                f = f | 0;
                t = t | 0;
                e = e | 0;
                r = r | 0;
                v(0x0000, 0x0800, 0x1000, w, f, t, e, r)
            }

            function U(f, t, e, r) {
                f = f | 0;
                t = t | 0;
                e = e | 0;
                r = r | 0;
                var i = 0;
                v(0x0400, 0x0c00, 0x2000, w, f, r, e, t);
                i = s, s = n, n = i
            }

            function B(f, t, e, o) {
                f = f | 0;
                t = t | 0;
                e = e | 0;
                o = o | 0;
                v(0x0000, 0x0800, 0x1000, w, a ^ f, h ^ t, x ^ e, c ^ o);
                a = r, h = s, x = i, c = n
            }

            function H(f, t, e, o) {
                f = f | 0;
                t = t | 0;
                e = e | 0;
                o = o | 0;
                var l = 0;
                v(0x0400, 0x0c00, 0x2000, w, f, o, e, t);
                l = s, s = n, n = l;
                r = r ^ a, s = s ^ h, i = i ^ x, n = n ^ c;
                a = f, h = t, x = e, c = o
            }

            function L(f, t, e, o) {
                f = f | 0;
                t = t | 0;
                e = e | 0;
                o = o | 0;
                v(0x0000, 0x0800, 0x1000, w, a, h, x, c);
                a = r = r ^ f, h = s = s ^ t, x = i = i ^ e, c = n = n ^ o
            }

            function k(f, t, e, o) {
                f = f | 0;
                t = t | 0;
                e = e | 0;
                o = o | 0;
                v(0x0000, 0x0800, 0x1000, w, a, h, x, c);
                r = r ^ f, s = s ^ t, i = i ^ e, n = n ^ o;
                a = f, h = t, x = e, c = o
            }

            function N(f, t, e, o) {
                f = f | 0;
                t = t | 0;
                e = e | 0;
                o = o | 0;
                v(0x0000, 0x0800, 0x1000, w, a, h, x, c);
                a = r, h = s, x = i, c = n;
                r = r ^ f, s = s ^ t, i = i ^ e, n = n ^ o
            }

            function R(f, t, e, a) {
                f = f | 0;
                t = t | 0;
                e = e | 0;
                a = a | 0;
                v(0x0000, 0x0800, 0x1000, w, o, l, u, _);
                _ = ~A & _ | A & _ + 1;
                u = ~m & u | m & u + ((_ | 0) == 0);
                l = ~b & l | b & l + ((u | 0) == 0);
                o = ~g & o | g & o + ((l | 0) == 0);
                r = r ^ f;
                s = s ^ t;
                i = i ^ e;
                n = n ^ a
            }

            function I(f, t, e, r) {
                f = f | 0;
                t = t | 0;
                e = e | 0;
                r = r | 0;
                var s = 0, i = 0, n = 0, o = 0, l = 0, u = 0, _ = 0, g = 0, b = 0, m = 0;
                f = f ^ a, t = t ^ h, e = e ^ x, r = r ^ c;
                s = d | 0, i = y | 0, n = p | 0, o = E | 0;
                for (; (b | 0) < 128; b = b + 1 | 0) {
                    if (s >>> 31) {
                        l = l ^ f, u = u ^ t, _ = _ ^ e, g = g ^ r
                    }
                    s = s << 1 | i >>> 31, i = i << 1 | n >>> 31, n = n << 1 | o >>> 31, o = o << 1;
                    m = r & 1;
                    r = r >>> 1 | e << 31, e = e >>> 1 | t << 31, t = t >>> 1 | f << 31, f = f >>> 1;
                    if (m) f = f ^ 0xe1000000
                }
                a = l, h = u, x = _, c = g
            }

            function D(f) {
                f = f | 0;
                w = f
            }

            function T(f, t, e, a) {
                f = f | 0;
                t = t | 0;
                e = e | 0;
                a = a | 0;
                r = f, s = t, i = e, n = a
            }

            function P(f, t, e, r) {
                f = f | 0;
                t = t | 0;
                e = e | 0;
                r = r | 0;
                a = f, h = t, x = e, c = r
            }

            function z(f, t, e, r) {
                f = f | 0;
                t = t | 0;
                e = e | 0;
                r = r | 0;
                o = f, l = t, u = e, _ = r
            }

            function Z(f, t, e, r) {
                f = f | 0;
                t = t | 0;
                e = e | 0;
                r = r | 0;
                g = f, b = t, m = e, A = r
            }

            function O(f, t, e, r) {
                f = f | 0;
                t = t | 0;
                e = e | 0;
                r = r | 0;
                _ = ~A & _ | A & r, u = ~m & u | m & e, l = ~b & l | b & t, o = ~g & o | g & f
            }

            function G(f) {
                f = f | 0;
                if (f & 15) return -1;
                C[f | 0] = r >>> 24, C[f | 1] = r >>> 16 & 255, C[f | 2] = r >>> 8 & 255, C[f | 3] = r & 255, C[f | 4] = s >>> 24, C[f | 5] = s >>> 16 & 255, C[f | 6] = s >>> 8 & 255, C[f | 7] = s & 255, C[f | 8] = i >>> 24, C[f | 9] = i >>> 16 & 255, C[f | 10] = i >>> 8 & 255, C[f | 11] = i & 255, C[f | 12] = n >>> 24, C[f | 13] = n >>> 16 & 255, C[f | 14] = n >>> 8 & 255, C[f | 15] = n & 255;
                return 16
            }

            function F(f) {
                f = f | 0;
                if (f & 15) return -1;
                C[f | 0] = a >>> 24, C[f | 1] = a >>> 16 & 255, C[f | 2] = a >>> 8 & 255, C[f | 3] = a & 255, C[f | 4] = h >>> 24, C[f | 5] = h >>> 16 & 255, C[f | 6] = h >>> 8 & 255, C[f | 7] = h & 255, C[f | 8] = x >>> 24, C[f | 9] = x >>> 16 & 255, C[f | 10] = x >>> 8 & 255, C[f | 11] = x & 255, C[f | 12] = c >>> 24, C[f | 13] = c >>> 16 & 255, C[f | 14] = c >>> 8 & 255, C[f | 15] = c & 255;
                return 16
            }

            function q() {
                M(0, 0, 0, 0);
                d = r, y = s, p = i, E = n
            }

            function V(f, t, e) {
                f = f | 0;
                t = t | 0;
                e = e | 0;
                var a = 0;
                if (t & 15) return -1;
                while ((e | 0) >= 16) {
                    K[f & 7](C[t | 0] << 24 | C[t | 1] << 16 | C[t | 2] << 8 | C[t | 3], C[t | 4] << 24 | C[t | 5] << 16 | C[t | 6] << 8 | C[t | 7], C[t | 8] << 24 | C[t | 9] << 16 | C[t | 10] << 8 | C[t | 11], C[t | 12] << 24 | C[t | 13] << 16 | C[t | 14] << 8 | C[t | 15]);
                    C[t | 0] = r >>> 24, C[t | 1] = r >>> 16 & 255, C[t | 2] = r >>> 8 & 255, C[t | 3] = r & 255, C[t | 4] = s >>> 24, C[t | 5] = s >>> 16 & 255, C[t | 6] = s >>> 8 & 255, C[t | 7] = s & 255, C[t | 8] = i >>> 24, C[t | 9] = i >>> 16 & 255, C[t | 10] = i >>> 8 & 255, C[t | 11] = i & 255, C[t | 12] = n >>> 24, C[t | 13] = n >>> 16 & 255, C[t | 14] = n >>> 8 & 255, C[t | 15] = n & 255;
                    a = a + 16 | 0, t = t + 16 | 0, e = e - 16 | 0
                }
                return a | 0
            }

            function j(f, t, e) {
                f = f | 0;
                t = t | 0;
                e = e | 0;
                var r = 0;
                if (t & 15) return -1;
                while ((e | 0) >= 16) {
                    X[f & 1](C[t | 0] << 24 | C[t | 1] << 16 | C[t | 2] << 8 | C[t | 3], C[t | 4] << 24 | C[t | 5] << 16 | C[t | 6] << 8 | C[t | 7], C[t | 8] << 24 | C[t | 9] << 16 | C[t | 10] << 8 | C[t | 11], C[t | 12] << 24 | C[t | 13] << 16 | C[t | 14] << 8 | C[t | 15]);
                    r = r + 16 | 0, t = t + 16 | 0, e = e - 16 | 0
                }
                return r | 0
            }

            var K = [M, U, B, H, L, k, N, R];
            var X = [B, I];
            return {
                set_rounds: D,
                set_state: T,
                set_iv: P,
                set_nonce: z,
                set_mask: Z,
                set_counter: O,
                get_state: G,
                get_iv: F,
                gcm_init: q,
                cipher: V,
                mac: j
            }
        }(i, f, t);
        return l.set_key = s, l
    };
    return l.ENC = {ECB: 0}, l.DEC = {
        ECB: 1,
        CBC: 3,

    }, l.MAC = {CBC: 0, GCM: 1}, l.HEAP_DATA = 16384, l
}();

class AES {
    constructor(f, t, e = !0, r) {
        this.pos = 0, this.len = 0, this.mode = r, this.heap = _heap_init().subarray(AES_asm.HEAP_DATA), this.asm = new AES_asm(null, this.heap.buffer), this.pos = 0, this.len = 0;
        const s = f.length;
        if (16 !== s && 24 !== s && 32 !== s) throw new IllegalArgumentError("illegal key size");
        const i = new DataView(f.buffer, f.byteOffset, f.byteLength);
        if (this.asm.set_key(s >> 2, i.getUint32(0), i.getUint32(4), i.getUint32(8), i.getUint32(12), s > 16 ? i.getUint32(16) : 0, s > 16 ? i.getUint32(20) : 0, s > 24 ? i.getUint32(24) : 0, s > 24 ? i.getUint32(28) : 0), void 0 !== t) {
            if (16 !== t.length) throw new IllegalArgumentError("illegal iv size");
            let f = new DataView(t.buffer, t.byteOffset, t.byteLength);
            this.asm.set_iv(f.getUint32(0), f.getUint32(4), f.getUint32(8), f.getUint32(12))
        } else this.asm.set_iv(0, 0, 0, 0);
        this.padding = e
    }

    AES_Encrypt_process(f) {
        if (!is_bytes(f)) throw new TypeError("data isn't of expected type");
        let t = this.asm, e = this.heap, r = AES_asm.ENC[this.mode], s = AES_asm.HEAP_DATA, i = this.pos, n = this.len,
            a = 0, h = f.length || 0, x = 0, c = n + h & -16, o = 0, l = new Uint8Array(c);
        for (; h > 0;) o = _heap_write(e, i + n, f, a, h), n += o, a += o, h -= o, o = t.cipher(r, s + i, n), o && l.set(e.subarray(i, i + o), x), x += o, o < n ? (i += o, n -= o) : (i = 0, n = 0);
        return this.pos = i, this.len = n, l
    }

    AES_Encrypt_finish() {
        let f = this.asm, t = this.heap, e = AES_asm.ENC[this.mode], r = AES_asm.HEAP_DATA, s = this.pos, i = this.len,
            n = 16 - i % 16, a = i;
        if (this.hasOwnProperty("padding")) {
            if (this.padding) {
                for (let f = 0; f < n; ++f) t[s + i + f] = n;
                i += n, a = i
            } else if (i % 16) throw new IllegalArgumentError("data length must be a multiple of the block size")
        } else i += n;
        const h = new Uint8Array(a);
        return i && f.cipher(e, r + s, i), a && h.set(t.subarray(s, s + a)), this.pos = 0, this.len = 0, h
    }

    AES_Decrypt_process(f) {
        if (!is_bytes(f)) throw new TypeError("data isn't of expected type");
        let t = this.asm, e = this.heap, r = AES_asm.DEC[this.mode], s = AES_asm.HEAP_DATA, i = this.pos, n = this.len,
            a = 0, h = f.length || 0, x = 0, c = n + h & -16, o = 0, l = 0;
        this.padding && (o = n + h - c || 16, c -= o);
        const u = new Uint8Array(c);
        for (; h > 0;) l = _heap_write(e, i + n, f, a, h), n += l, a += l, h -= l, l = t.cipher(r, s + i, n - (h ? 0 : o)), l && u.set(e.subarray(i, i + l), x), x += l, l < n ? (i += l, n -= l) : (i = 0, n = 0);
        return this.pos = i, this.len = n, u
    }

    AES_Decrypt_finish() {
        let f = this.asm, t = this.heap, e = AES_asm.DEC[this.mode], r = AES_asm.HEAP_DATA, s = this.pos, i = this.len,
            n = i;
        if (i > 0) {
            if (i % 16) {
                if (this.hasOwnProperty("padding")) throw new IllegalArgumentError("data length must be a multiple of the block size");
                i += 16 - i % 16
            }
            if (f.cipher(e, r + s, i), this.hasOwnProperty("padding") && this.padding) {
                let f = t[s + n - 1];
                if (f < 1 || f > 16 || f > n) throw new SecurityError("bad padding");
                let e = 0;
                for (let r = f; r > 1; r--) e |= f ^ t[s + n - r];
                if (e) throw new SecurityError("bad padding");
                n -= f
            }
        }
        const a = new Uint8Array(n);
        return n > 0 && a.set(t.subarray(s, s + n)), this.pos = 0, this.len = 0, a
    }
}

class AES_ECB extends AES {

    static decrypt(f, t, e = !1) {
        return new AES_ECB(t, e).decrypt(f)
    }
    static encrypt(f, t, e = !1) {
        return new AES_ECB(t, e).encrypt(f)
    }
    constructor(f, t = !1) {
        super(f, void 0, t, "ECB")
    }
    encrypt(f) {
        const t = this.AES_Encrypt_process(f), e = this.AES_Encrypt_finish();
        return joinBytes(t, e)
    }
    decrypt(f) {
        const t = this.AES_Decrypt_process(f), e = this.AES_Decrypt_finish();
        return joinBytes(t, e)
    }
}

class AES_CBC extends AES {
    static encrypt(f, t, e = !0, r) {
        return new AES_CBC(t, r, e).encrypt(f)
    }

    static decrypt(f, t, e = !0, r) {
        return new AES_CBC(t, r, e).decrypt(f)
    }

    constructor(f, t, e = !0) {
        super(f, t, e, "CBC")
    }

    encrypt(f) {
        const t = this.AES_Encrypt_process(f), e = this.AES_Encrypt_finish();
        return joinBytes(t, e)
    }

    decrypt(f) {
        const t = this.AES_Decrypt_process(f), e = this.AES_Decrypt_finish();
        return joinBytes(t, e)
    }
}

var bigint_asm = function (f, t, e) {
    "use asm";
    var r = 0;
    var s = new f.Uint32Array(e);
    var i = f.Math.imul;

    function n(f) {
        f = f | 0;
        r = f = f + 31 & -32;
        return f | 0
    }

    function a(f) {
        f = f | 0;
        var t = 0;
        t = r;
        r = t + (f + 31 & -32) | 0;
        return t | 0
    }

    function h(f) {
        f = f | 0;
        r = r - (f + 31 & -32) | 0
    }

    function x(f, t, e) {
        f = f | 0;
        t = t | 0;
        e = e | 0;
        var r = 0;
        if ((t | 0) > (e | 0)) {
            for (; (r | 0) < (f | 0); r = r + 4 | 0) {
                s[e + r >> 2] = s[t + r >> 2]
            }
        } else {
            for (r = f - 4 | 0; (r | 0) >= 0; r = r - 4 | 0) {
                s[e + r >> 2] = s[t + r >> 2]
            }
        }
    }

    function c(f, t, e) {
        f = f | 0;
        t = t | 0;
        e = e | 0;
        var r = 0;
        for (; (r | 0) < (f | 0); r = r + 4 | 0) {
            s[e + r >> 2] = t
        }
    }

    function o(f, t, e, r) {
        f = f | 0;
        t = t | 0;
        e = e | 0;
        r = r | 0;
        var i = 0, n = 0, a = 0, h = 0, x = 0;
        if ((r | 0) <= 0) r = t;
        if ((r | 0) < (t | 0)) t = r;
        n = 1;
        for (; (x | 0) < (t | 0); x = x + 4 | 0) {
            i = ~s[f + x >> 2];
            a = (i & 0xffff) + n | 0;
            h = (i >>> 16) + (a >>> 16) | 0;
            s[e + x >> 2] = h << 16 | a & 0xffff;
            n = h >>> 16
        }
        for (; (x | 0) < (r | 0); x = x + 4 | 0) {
            s[e + x >> 2] = n - 1 | 0
        }
        return n | 0
    }

    function l(f, t, e, r) {
        f = f | 0;
        t = t | 0;
        e = e | 0;
        r = r | 0;
        var i = 0, n = 0, a = 0;
        if ((t | 0) > (r | 0)) {
            for (a = t - 4 | 0; (a | 0) >= (r | 0); a = a - 4 | 0) {
                if (s[f + a >> 2] | 0) return 1
            }
        } else {
            for (a = r - 4 | 0; (a | 0) >= (t | 0); a = a - 4 | 0) {
                if (s[e + a >> 2] | 0) return -1
            }
        }
        for (; (a | 0) >= 0; a = a - 4 | 0) {
            i = s[f + a >> 2] | 0, n = s[e + a >> 2] | 0;
            if (i >>> 0 < n >>> 0) return -1;
            if (i >>> 0 > n >>> 0) return 1
        }
        return 0
    }

    function u(f, t) {
        f = f | 0;
        t = t | 0;
        var e = 0;
        for (e = t - 4 | 0; (e | 0) >= 0; e = e - 4 | 0) {
            if (s[f + e >> 2] | 0) return e + 4 | 0
        }
        return 0
    }

    function _(f, t, e, r, i, n) {
        f = f | 0;
        t = t | 0;
        e = e | 0;
        r = r | 0;
        i = i | 0;
        n = n | 0;
        var a = 0, h = 0, x = 0, c = 0, o = 0, l = 0;
        if ((t | 0) < (r | 0)) {
            c = f, f = e, e = c;
            c = t, t = r, r = c
        }
        if ((n | 0) <= 0) n = t + 4 | 0;
        if ((n | 0) < (r | 0)) t = r = n;
        for (; (l | 0) < (r | 0); l = l + 4 | 0) {
            a = s[f + l >> 2] | 0;
            h = s[e + l >> 2] | 0;
            c = ((a & 0xffff) + (h & 0xffff) | 0) + x | 0;
            o = ((a >>> 16) + (h >>> 16) | 0) + (c >>> 16) | 0;
            s[i + l >> 2] = c & 0xffff | o << 16;
            x = o >>> 16
        }
        for (; (l | 0) < (t | 0); l = l + 4 | 0) {
            a = s[f + l >> 2] | 0;
            c = (a & 0xffff) + x | 0;
            o = (a >>> 16) + (c >>> 16) | 0;
            s[i + l >> 2] = c & 0xffff | o << 16;
            x = o >>> 16
        }
        for (; (l | 0) < (n | 0); l = l + 4 | 0) {
            s[i + l >> 2] = x | 0;
            x = 0
        }
        return x | 0
    }

    function g(f, t, e, r, i, n) {
        f = f | 0;
        t = t | 0;
        e = e | 0;
        r = r | 0;
        i = i | 0;
        n = n | 0;
        var a = 0, h = 0, x = 0, c = 0, o = 0, l = 0;
        if ((n | 0) <= 0) n = (t | 0) > (r | 0) ? t + 4 | 0 : r + 4 | 0;
        if ((n | 0) < (t | 0)) t = n;
        if ((n | 0) < (r | 0)) r = n;
        if ((t | 0) < (r | 0)) {
            for (; (l | 0) < (t | 0); l = l + 4 | 0) {
                a = s[f + l >> 2] | 0;
                h = s[e + l >> 2] | 0;
                c = ((a & 0xffff) - (h & 0xffff) | 0) + x | 0;
                o = ((a >>> 16) - (h >>> 16) | 0) + (c >> 16) | 0;
                s[i + l >> 2] = c & 0xffff | o << 16;
                x = o >> 16
            }
            for (; (l | 0) < (r | 0); l = l + 4 | 0) {
                h = s[e + l >> 2] | 0;
                c = x - (h & 0xffff) | 0;
                o = (c >> 16) - (h >>> 16) | 0;
                s[i + l >> 2] = c & 0xffff | o << 16;
                x = o >> 16
            }
        } else {
            for (; (l | 0) < (r | 0); l = l + 4 | 0) {
                a = s[f + l >> 2] | 0;
                h = s[e + l >> 2] | 0;
                c = ((a & 0xffff) - (h & 0xffff) | 0) + x | 0;
                o = ((a >>> 16) - (h >>> 16) | 0) + (c >> 16) | 0;
                s[i + l >> 2] = c & 0xffff | o << 16;
                x = o >> 16
            }
            for (; (l | 0) < (t | 0); l = l + 4 | 0) {
                a = s[f + l >> 2] | 0;
                c = (a & 0xffff) + x | 0;
                o = (a >>> 16) + (c >> 16) | 0;
                s[i + l >> 2] = c & 0xffff | o << 16;
                x = o >> 16
            }
        }
        for (; (l | 0) < (n | 0); l = l + 4 | 0) {
            s[i + l >> 2] = x | 0
        }
        return x | 0
    }

    function b(f, t, e, r, n, a) {
        f = f | 0;
        t = t | 0;
        e = e | 0;
        r = r | 0;
        n = n | 0;
        a = a | 0;
        var h = 0, x = 0, c = 0, o = 0, l = 0, u = 0, _ = 0, g = 0, b = 0, m = 0, A = 0, d = 0, y = 0, p = 0, E = 0,
            w = 0, S = 0, C = 0, v = 0, M = 0, U = 0, B = 0, H = 0, L = 0, k = 0, N = 0, R = 0, I = 0, D = 0, T = 0,
            P = 0, z = 0, Z = 0, O = 0, G = 0, F = 0, q = 0, V = 0, j = 0, K = 0, X = 0, W = 0, J = 0, Q = 0, Y = 0,
            $ = 0, ff = 0, tf = 0, ef = 0, rf = 0, sf = 0, nf = 0, af = 0, hf = 0, xf = 0, cf = 0, of = 0;
        if ((t | 0) > (r | 0)) {
            ef = f, rf = t;
            f = e, t = r;
            e = ef, r = rf
        }
        nf = t + r | 0;
        if ((a | 0) > (nf | 0) | (a | 0) <= 0) a = nf;
        if ((a | 0) < (t | 0)) t = a;
        if ((a | 0) < (r | 0)) r = a;
        for (; (af | 0) < (t | 0); af = af + 32 | 0) {
            hf = f + af | 0;
            b = s[(hf | 0) >> 2] | 0, m = s[(hf | 4) >> 2] | 0, A = s[(hf | 8) >> 2] | 0, d = s[(hf | 12) >> 2] | 0, y = s[(hf | 16) >> 2] | 0, p = s[(hf | 20) >> 2] | 0, E = s[(hf | 24) >> 2] | 0, w = s[(hf | 28) >> 2] | 0, h = b & 0xffff, x = m & 0xffff, c = A & 0xffff, o = d & 0xffff, l = y & 0xffff, u = p & 0xffff, _ = E & 0xffff, g = w & 0xffff, b = b >>> 16, m = m >>> 16, A = A >>> 16, d = d >>> 16, y = y >>> 16, p = p >>> 16, E = E >>> 16, w = w >>> 16;
            X = W = J = Q = Y = $ = ff = tf = 0;
            for (xf = 0; (xf | 0) < (r | 0); xf = xf + 32 | 0) {
                cf = e + xf | 0;
                of = n + (af + xf | 0) | 0;
                k = s[(cf | 0) >> 2] | 0, N = s[(cf | 4) >> 2] | 0, R = s[(cf | 8) >> 2] | 0, I = s[(cf | 12) >> 2] | 0, D = s[(cf | 16) >> 2] | 0, T = s[(cf | 20) >> 2] | 0, P = s[(cf | 24) >> 2] | 0, z = s[(cf | 28) >> 2] | 0, S = k & 0xffff, C = N & 0xffff, v = R & 0xffff, M = I & 0xffff, U = D & 0xffff, B = T & 0xffff, H = P & 0xffff, L = z & 0xffff, k = k >>> 16, N = N >>> 16, R = R >>> 16, I = I >>> 16, D = D >>> 16, T = T >>> 16, P = P >>> 16, z = z >>> 16;
                Z = s[(of | 0) >> 2] | 0, O = s[(of | 4) >> 2] | 0, G = s[(of | 8) >> 2] | 0, F = s[(of | 12) >> 2] | 0, q = s[(of | 16) >> 2] | 0, V = s[(of | 20) >> 2] | 0, j = s[(of | 24) >> 2] | 0, K = s[(of | 28) >> 2] | 0;
                ef = ((i(h, S) | 0) + (X & 0xffff) | 0) + (Z & 0xffff) | 0;
                rf = ((i(b, S) | 0) + (X >>> 16) | 0) + (Z >>> 16) | 0;
                sf = ((i(h, k) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(b, k) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                Z = sf << 16 | ef & 0xffff;
                ef = ((i(h, C) | 0) + (nf & 0xffff) | 0) + (O & 0xffff) | 0;
                rf = ((i(b, C) | 0) + (nf >>> 16) | 0) + (O >>> 16) | 0;
                sf = ((i(h, N) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(b, N) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                O = sf << 16 | ef & 0xffff;
                ef = ((i(h, v) | 0) + (nf & 0xffff) | 0) + (G & 0xffff) | 0;
                rf = ((i(b, v) | 0) + (nf >>> 16) | 0) + (G >>> 16) | 0;
                sf = ((i(h, R) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(b, R) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                G = sf << 16 | ef & 0xffff;
                ef = ((i(h, M) | 0) + (nf & 0xffff) | 0) + (F & 0xffff) | 0;
                rf = ((i(b, M) | 0) + (nf >>> 16) | 0) + (F >>> 16) | 0;
                sf = ((i(h, I) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(b, I) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                F = sf << 16 | ef & 0xffff;
                ef = ((i(h, U) | 0) + (nf & 0xffff) | 0) + (q & 0xffff) | 0;
                rf = ((i(b, U) | 0) + (nf >>> 16) | 0) + (q >>> 16) | 0;
                sf = ((i(h, D) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(b, D) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                q = sf << 16 | ef & 0xffff;
                ef = ((i(h, B) | 0) + (nf & 0xffff) | 0) + (V & 0xffff) | 0;
                rf = ((i(b, B) | 0) + (nf >>> 16) | 0) + (V >>> 16) | 0;
                sf = ((i(h, T) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(b, T) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                V = sf << 16 | ef & 0xffff;
                ef = ((i(h, H) | 0) + (nf & 0xffff) | 0) + (j & 0xffff) | 0;
                rf = ((i(b, H) | 0) + (nf >>> 16) | 0) + (j >>> 16) | 0;
                sf = ((i(h, P) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(b, P) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                j = sf << 16 | ef & 0xffff;
                ef = ((i(h, L) | 0) + (nf & 0xffff) | 0) + (K & 0xffff) | 0;
                rf = ((i(b, L) | 0) + (nf >>> 16) | 0) + (K >>> 16) | 0;
                sf = ((i(h, z) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(b, z) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                K = sf << 16 | ef & 0xffff;
                X = nf;
                ef = ((i(x, S) | 0) + (W & 0xffff) | 0) + (O & 0xffff) | 0;
                rf = ((i(m, S) | 0) + (W >>> 16) | 0) + (O >>> 16) | 0;
                sf = ((i(x, k) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(m, k) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                O = sf << 16 | ef & 0xffff;
                ef = ((i(x, C) | 0) + (nf & 0xffff) | 0) + (G & 0xffff) | 0;
                rf = ((i(m, C) | 0) + (nf >>> 16) | 0) + (G >>> 16) | 0;
                sf = ((i(x, N) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(m, N) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                G = sf << 16 | ef & 0xffff;
                ef = ((i(x, v) | 0) + (nf & 0xffff) | 0) + (F & 0xffff) | 0;
                rf = ((i(m, v) | 0) + (nf >>> 16) | 0) + (F >>> 16) | 0;
                sf = ((i(x, R) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(m, R) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                F = sf << 16 | ef & 0xffff;
                ef = ((i(x, M) | 0) + (nf & 0xffff) | 0) + (q & 0xffff) | 0;
                rf = ((i(m, M) | 0) + (nf >>> 16) | 0) + (q >>> 16) | 0;
                sf = ((i(x, I) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(m, I) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                q = sf << 16 | ef & 0xffff;
                ef = ((i(x, U) | 0) + (nf & 0xffff) | 0) + (V & 0xffff) | 0;
                rf = ((i(m, U) | 0) + (nf >>> 16) | 0) + (V >>> 16) | 0;
                sf = ((i(x, D) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(m, D) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                V = sf << 16 | ef & 0xffff;
                ef = ((i(x, B) | 0) + (nf & 0xffff) | 0) + (j & 0xffff) | 0;
                rf = ((i(m, B) | 0) + (nf >>> 16) | 0) + (j >>> 16) | 0;
                sf = ((i(x, T) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(m, T) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                j = sf << 16 | ef & 0xffff;
                ef = ((i(x, H) | 0) + (nf & 0xffff) | 0) + (K & 0xffff) | 0;
                rf = ((i(m, H) | 0) + (nf >>> 16) | 0) + (K >>> 16) | 0;
                sf = ((i(x, P) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(m, P) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                K = sf << 16 | ef & 0xffff;
                ef = ((i(x, L) | 0) + (nf & 0xffff) | 0) + (X & 0xffff) | 0;
                rf = ((i(m, L) | 0) + (nf >>> 16) | 0) + (X >>> 16) | 0;
                sf = ((i(x, z) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(m, z) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                X = sf << 16 | ef & 0xffff;
                W = nf;
                ef = ((i(c, S) | 0) + (J & 0xffff) | 0) + (G & 0xffff) | 0;
                rf = ((i(A, S) | 0) + (J >>> 16) | 0) + (G >>> 16) | 0;
                sf = ((i(c, k) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(A, k) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                G = sf << 16 | ef & 0xffff;
                ef = ((i(c, C) | 0) + (nf & 0xffff) | 0) + (F & 0xffff) | 0;
                rf = ((i(A, C) | 0) + (nf >>> 16) | 0) + (F >>> 16) | 0;
                sf = ((i(c, N) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(A, N) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                F = sf << 16 | ef & 0xffff;
                ef = ((i(c, v) | 0) + (nf & 0xffff) | 0) + (q & 0xffff) | 0;
                rf = ((i(A, v) | 0) + (nf >>> 16) | 0) + (q >>> 16) | 0;
                sf = ((i(c, R) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(A, R) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                q = sf << 16 | ef & 0xffff;
                ef = ((i(c, M) | 0) + (nf & 0xffff) | 0) + (V & 0xffff) | 0;
                rf = ((i(A, M) | 0) + (nf >>> 16) | 0) + (V >>> 16) | 0;
                sf = ((i(c, I) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(A, I) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                V = sf << 16 | ef & 0xffff;
                ef = ((i(c, U) | 0) + (nf & 0xffff) | 0) + (j & 0xffff) | 0;
                rf = ((i(A, U) | 0) + (nf >>> 16) | 0) + (j >>> 16) | 0;
                sf = ((i(c, D) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(A, D) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                j = sf << 16 | ef & 0xffff;
                ef = ((i(c, B) | 0) + (nf & 0xffff) | 0) + (K & 0xffff) | 0;
                rf = ((i(A, B) | 0) + (nf >>> 16) | 0) + (K >>> 16) | 0;
                sf = ((i(c, T) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(A, T) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                K = sf << 16 | ef & 0xffff;
                ef = ((i(c, H) | 0) + (nf & 0xffff) | 0) + (X & 0xffff) | 0;
                rf = ((i(A, H) | 0) + (nf >>> 16) | 0) + (X >>> 16) | 0;
                sf = ((i(c, P) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(A, P) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                X = sf << 16 | ef & 0xffff;
                ef = ((i(c, L) | 0) + (nf & 0xffff) | 0) + (W & 0xffff) | 0;
                rf = ((i(A, L) | 0) + (nf >>> 16) | 0) + (W >>> 16) | 0;
                sf = ((i(c, z) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(A, z) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                W = sf << 16 | ef & 0xffff;
                J = nf;
                ef = ((i(o, S) | 0) + (Q & 0xffff) | 0) + (F & 0xffff) | 0;
                rf = ((i(d, S) | 0) + (Q >>> 16) | 0) + (F >>> 16) | 0;
                sf = ((i(o, k) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(d, k) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                F = sf << 16 | ef & 0xffff;
                ef = ((i(o, C) | 0) + (nf & 0xffff) | 0) + (q & 0xffff) | 0;
                rf = ((i(d, C) | 0) + (nf >>> 16) | 0) + (q >>> 16) | 0;
                sf = ((i(o, N) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(d, N) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                q = sf << 16 | ef & 0xffff;
                ef = ((i(o, v) | 0) + (nf & 0xffff) | 0) + (V & 0xffff) | 0;
                rf = ((i(d, v) | 0) + (nf >>> 16) | 0) + (V >>> 16) | 0;
                sf = ((i(o, R) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(d, R) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                V = sf << 16 | ef & 0xffff;
                ef = ((i(o, M) | 0) + (nf & 0xffff) | 0) + (j & 0xffff) | 0;
                rf = ((i(d, M) | 0) + (nf >>> 16) | 0) + (j >>> 16) | 0;
                sf = ((i(o, I) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(d, I) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                j = sf << 16 | ef & 0xffff;
                ef = ((i(o, U) | 0) + (nf & 0xffff) | 0) + (K & 0xffff) | 0;
                rf = ((i(d, U) | 0) + (nf >>> 16) | 0) + (K >>> 16) | 0;
                sf = ((i(o, D) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(d, D) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                K = sf << 16 | ef & 0xffff;
                ef = ((i(o, B) | 0) + (nf & 0xffff) | 0) + (X & 0xffff) | 0;
                rf = ((i(d, B) | 0) + (nf >>> 16) | 0) + (X >>> 16) | 0;
                sf = ((i(o, T) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(d, T) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                X = sf << 16 | ef & 0xffff;
                ef = ((i(o, H) | 0) + (nf & 0xffff) | 0) + (W & 0xffff) | 0;
                rf = ((i(d, H) | 0) + (nf >>> 16) | 0) + (W >>> 16) | 0;
                sf = ((i(o, P) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(d, P) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                W = sf << 16 | ef & 0xffff;
                ef = ((i(o, L) | 0) + (nf & 0xffff) | 0) + (J & 0xffff) | 0;
                rf = ((i(d, L) | 0) + (nf >>> 16) | 0) + (J >>> 16) | 0;
                sf = ((i(o, z) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(d, z) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                J = sf << 16 | ef & 0xffff;
                Q = nf;
                ef = ((i(l, S) | 0) + (Y & 0xffff) | 0) + (q & 0xffff) | 0;
                rf = ((i(y, S) | 0) + (Y >>> 16) | 0) + (q >>> 16) | 0;
                sf = ((i(l, k) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(y, k) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                q = sf << 16 | ef & 0xffff;
                ef = ((i(l, C) | 0) + (nf & 0xffff) | 0) + (V & 0xffff) | 0;
                rf = ((i(y, C) | 0) + (nf >>> 16) | 0) + (V >>> 16) | 0;
                sf = ((i(l, N) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(y, N) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                V = sf << 16 | ef & 0xffff;
                ef = ((i(l, v) | 0) + (nf & 0xffff) | 0) + (j & 0xffff) | 0;
                rf = ((i(y, v) | 0) + (nf >>> 16) | 0) + (j >>> 16) | 0;
                sf = ((i(l, R) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(y, R) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                j = sf << 16 | ef & 0xffff;
                ef = ((i(l, M) | 0) + (nf & 0xffff) | 0) + (K & 0xffff) | 0;
                rf = ((i(y, M) | 0) + (nf >>> 16) | 0) + (K >>> 16) | 0;
                sf = ((i(l, I) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(y, I) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                K = sf << 16 | ef & 0xffff;
                ef = ((i(l, U) | 0) + (nf & 0xffff) | 0) + (X & 0xffff) | 0;
                rf = ((i(y, U) | 0) + (nf >>> 16) | 0) + (X >>> 16) | 0;
                sf = ((i(l, D) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(y, D) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                X = sf << 16 | ef & 0xffff;
                ef = ((i(l, B) | 0) + (nf & 0xffff) | 0) + (W & 0xffff) | 0;
                rf = ((i(y, B) | 0) + (nf >>> 16) | 0) + (W >>> 16) | 0;
                sf = ((i(l, T) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(y, T) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                W = sf << 16 | ef & 0xffff;
                ef = ((i(l, H) | 0) + (nf & 0xffff) | 0) + (J & 0xffff) | 0;
                rf = ((i(y, H) | 0) + (nf >>> 16) | 0) + (J >>> 16) | 0;
                sf = ((i(l, P) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(y, P) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                J = sf << 16 | ef & 0xffff;
                ef = ((i(l, L) | 0) + (nf & 0xffff) | 0) + (Q & 0xffff) | 0;
                rf = ((i(y, L) | 0) + (nf >>> 16) | 0) + (Q >>> 16) | 0;
                sf = ((i(l, z) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(y, z) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                Q = sf << 16 | ef & 0xffff;
                Y = nf;
                ef = ((i(u, S) | 0) + ($ & 0xffff) | 0) + (V & 0xffff) | 0;
                rf = ((i(p, S) | 0) + ($ >>> 16) | 0) + (V >>> 16) | 0;
                sf = ((i(u, k) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(p, k) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                V = sf << 16 | ef & 0xffff;
                ef = ((i(u, C) | 0) + (nf & 0xffff) | 0) + (j & 0xffff) | 0;
                rf = ((i(p, C) | 0) + (nf >>> 16) | 0) + (j >>> 16) | 0;
                sf = ((i(u, N) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(p, N) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                j = sf << 16 | ef & 0xffff;
                ef = ((i(u, v) | 0) + (nf & 0xffff) | 0) + (K & 0xffff) | 0;
                rf = ((i(p, v) | 0) + (nf >>> 16) | 0) + (K >>> 16) | 0;
                sf = ((i(u, R) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(p, R) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                K = sf << 16 | ef & 0xffff;
                ef = ((i(u, M) | 0) + (nf & 0xffff) | 0) + (X & 0xffff) | 0;
                rf = ((i(p, M) | 0) + (nf >>> 16) | 0) + (X >>> 16) | 0;
                sf = ((i(u, I) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(p, I) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                X = sf << 16 | ef & 0xffff;
                ef = ((i(u, U) | 0) + (nf & 0xffff) | 0) + (W & 0xffff) | 0;
                rf = ((i(p, U) | 0) + (nf >>> 16) | 0) + (W >>> 16) | 0;
                sf = ((i(u, D) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(p, D) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                W = sf << 16 | ef & 0xffff;
                ef = ((i(u, B) | 0) + (nf & 0xffff) | 0) + (J & 0xffff) | 0;
                rf = ((i(p, B) | 0) + (nf >>> 16) | 0) + (J >>> 16) | 0;
                sf = ((i(u, T) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(p, T) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                J = sf << 16 | ef & 0xffff;
                ef = ((i(u, H) | 0) + (nf & 0xffff) | 0) + (Q & 0xffff) | 0;
                rf = ((i(p, H) | 0) + (nf >>> 16) | 0) + (Q >>> 16) | 0;
                sf = ((i(u, P) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(p, P) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                Q = sf << 16 | ef & 0xffff;
                ef = ((i(u, L) | 0) + (nf & 0xffff) | 0) + (Y & 0xffff) | 0;
                rf = ((i(p, L) | 0) + (nf >>> 16) | 0) + (Y >>> 16) | 0;
                sf = ((i(u, z) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(p, z) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                Y = sf << 16 | ef & 0xffff;
                $ = nf;
                ef = ((i(_, S) | 0) + (ff & 0xffff) | 0) + (j & 0xffff) | 0;
                rf = ((i(E, S) | 0) + (ff >>> 16) | 0) + (j >>> 16) | 0;
                sf = ((i(_, k) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(E, k) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                j = sf << 16 | ef & 0xffff;
                ef = ((i(_, C) | 0) + (nf & 0xffff) | 0) + (K & 0xffff) | 0;
                rf = ((i(E, C) | 0) + (nf >>> 16) | 0) + (K >>> 16) | 0;
                sf = ((i(_, N) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(E, N) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                K = sf << 16 | ef & 0xffff;
                ef = ((i(_, v) | 0) + (nf & 0xffff) | 0) + (X & 0xffff) | 0;
                rf = ((i(E, v) | 0) + (nf >>> 16) | 0) + (X >>> 16) | 0;
                sf = ((i(_, R) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(E, R) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                X = sf << 16 | ef & 0xffff;
                ef = ((i(_, M) | 0) + (nf & 0xffff) | 0) + (W & 0xffff) | 0;
                rf = ((i(E, M) | 0) + (nf >>> 16) | 0) + (W >>> 16) | 0;
                sf = ((i(_, I) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(E, I) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                W = sf << 16 | ef & 0xffff;
                ef = ((i(_, U) | 0) + (nf & 0xffff) | 0) + (J & 0xffff) | 0;
                rf = ((i(E, U) | 0) + (nf >>> 16) | 0) + (J >>> 16) | 0;
                sf = ((i(_, D) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(E, D) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                J = sf << 16 | ef & 0xffff;
                ef = ((i(_, B) | 0) + (nf & 0xffff) | 0) + (Q & 0xffff) | 0;
                rf = ((i(E, B) | 0) + (nf >>> 16) | 0) + (Q >>> 16) | 0;
                sf = ((i(_, T) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(E, T) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                Q = sf << 16 | ef & 0xffff;
                ef = ((i(_, H) | 0) + (nf & 0xffff) | 0) + (Y & 0xffff) | 0;
                rf = ((i(E, H) | 0) + (nf >>> 16) | 0) + (Y >>> 16) | 0;
                sf = ((i(_, P) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(E, P) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                Y = sf << 16 | ef & 0xffff;
                ef = ((i(_, L) | 0) + (nf & 0xffff) | 0) + ($ & 0xffff) | 0;
                rf = ((i(E, L) | 0) + (nf >>> 16) | 0) + ($ >>> 16) | 0;
                sf = ((i(_, z) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(E, z) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                $ = sf << 16 | ef & 0xffff;
                ff = nf;
                ef = ((i(g, S) | 0) + (tf & 0xffff) | 0) + (K & 0xffff) | 0;
                rf = ((i(w, S) | 0) + (tf >>> 16) | 0) + (K >>> 16) | 0;
                sf = ((i(g, k) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(w, k) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                K = sf << 16 | ef & 0xffff;
                ef = ((i(g, C) | 0) + (nf & 0xffff) | 0) + (X & 0xffff) | 0;
                rf = ((i(w, C) | 0) + (nf >>> 16) | 0) + (X >>> 16) | 0;
                sf = ((i(g, N) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(w, N) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                X = sf << 16 | ef & 0xffff;
                ef = ((i(g, v) | 0) + (nf & 0xffff) | 0) + (W & 0xffff) | 0;
                rf = ((i(w, v) | 0) + (nf >>> 16) | 0) + (W >>> 16) | 0;
                sf = ((i(g, R) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(w, R) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                W = sf << 16 | ef & 0xffff;
                ef = ((i(g, M) | 0) + (nf & 0xffff) | 0) + (J & 0xffff) | 0;
                rf = ((i(w, M) | 0) + (nf >>> 16) | 0) + (J >>> 16) | 0;
                sf = ((i(g, I) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(w, I) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                J = sf << 16 | ef & 0xffff;
                ef = ((i(g, U) | 0) + (nf & 0xffff) | 0) + (Q & 0xffff) | 0;
                rf = ((i(w, U) | 0) + (nf >>> 16) | 0) + (Q >>> 16) | 0;
                sf = ((i(g, D) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(w, D) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                Q = sf << 16 | ef & 0xffff;
                ef = ((i(g, B) | 0) + (nf & 0xffff) | 0) + (Y & 0xffff) | 0;
                rf = ((i(w, B) | 0) + (nf >>> 16) | 0) + (Y >>> 16) | 0;
                sf = ((i(g, T) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(w, T) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                Y = sf << 16 | ef & 0xffff;
                ef = ((i(g, H) | 0) + (nf & 0xffff) | 0) + ($ & 0xffff) | 0;
                rf = ((i(w, H) | 0) + (nf >>> 16) | 0) + ($ >>> 16) | 0;
                sf = ((i(g, P) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(w, P) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                $ = sf << 16 | ef & 0xffff;
                ef = ((i(g, L) | 0) + (nf & 0xffff) | 0) + (ff & 0xffff) | 0;
                rf = ((i(w, L) | 0) + (nf >>> 16) | 0) + (ff >>> 16) | 0;
                sf = ((i(g, z) | 0) + (rf & 0xffff) | 0) + (ef >>> 16) | 0;
                nf = ((i(w, z) | 0) + (rf >>> 16) | 0) + (sf >>> 16) | 0;
                ff = sf << 16 | ef & 0xffff;
                tf = nf;
                s[(of | 0) >> 2] = Z, s[(of | 4) >> 2] = O, s[(of | 8) >> 2] = G, s[(of | 12) >> 2] = F, s[(of | 16) >> 2] = q, s[(of | 20) >> 2] = V, s[(of | 24) >> 2] = j, s[(of | 28) >> 2] = K
            }
            of = n + (af + xf | 0) | 0;
            s[(of | 0) >> 2] = X, s[(of | 4) >> 2] = W, s[(of | 8) >> 2] = J, s[(of | 12) >> 2] = Q, s[(of | 16) >> 2] = Y, s[(of | 20) >> 2] = $, s[(of | 24) >> 2] = ff, s[(of | 28) >> 2] = tf
        }
    }

    function m(f, t, e) {
        f = f | 0;
        t = t | 0;
        e = e | 0;
        var r = 0, n = 0, a = 0, h = 0, x = 0, c = 0, o = 0, l = 0, u = 0, _ = 0, g = 0, b = 0, m = 0, A = 0, d = 0,
            y = 0, p = 0, E = 0, w = 0, S = 0, C = 0, v = 0, M = 0, U = 0, B = 0, H = 0, L = 0, k = 0, N = 0, R = 0,
            I = 0, D = 0, T = 0, P = 0, z = 0, Z = 0, O = 0, G = 0, F = 0, q = 0, V = 0, j = 0, K = 0, X = 0, W = 0,
            J = 0, Q = 0, Y = 0, $ = 0, ff = 0, tf = 0, ef = 0, rf = 0, sf = 0, nf = 0, af = 0, hf = 0, xf = 0, cf = 0,
            of = 0, lf = 0, uf = 0, _f = 0, gf = 0;
        for (; (cf | 0) < (t | 0); cf = cf + 4 | 0) {
            gf = e + (cf << 1) | 0;
            u = s[f + cf >> 2] | 0, r = u & 0xffff, u = u >>> 16;
            $ = i(r, r) | 0;
            ff = (i(r, u) | 0) + ($ >>> 17) | 0;
            tf = (i(u, u) | 0) + (ff >>> 15) | 0;
            s[gf >> 2] = ff << 17 | $ & 0x1ffff;
            s[(gf | 4) >> 2] = tf
        }
        for (xf = 0; (xf | 0) < (t | 0); xf = xf + 8 | 0) {
            uf = f + xf | 0, gf = e + (xf << 1) | 0;
            u = s[uf >> 2] | 0, r = u & 0xffff, u = u >>> 16;
            B = s[(uf | 4) >> 2] | 0, p = B & 0xffff, B = B >>> 16;
            $ = i(r, p) | 0;
            ff = (i(r, B) | 0) + ($ >>> 16) | 0;
            tf = (i(u, p) | 0) + (ff & 0xffff) | 0;
            sf = ((i(u, B) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
            nf = s[(gf | 4) >> 2] | 0;
            $ = (nf & 0xffff) + (($ & 0xffff) << 1) | 0;
            tf = ((nf >>> 16) + ((tf & 0xffff) << 1) | 0) + ($ >>> 16) | 0;
            s[(gf | 4) >> 2] = tf << 16 | $ & 0xffff;
            ef = tf >>> 16;
            nf = s[(gf | 8) >> 2] | 0;
            $ = ((nf & 0xffff) + ((sf & 0xffff) << 1) | 0) + ef | 0;
            tf = ((nf >>> 16) + (sf >>> 16 << 1) | 0) + ($ >>> 16) | 0;
            s[(gf | 8) >> 2] = tf << 16 | $ & 0xffff;
            ef = tf >>> 16;
            if (ef) {
                nf = s[(gf | 12) >> 2] | 0;
                $ = (nf & 0xffff) + ef | 0;
                tf = (nf >>> 16) + ($ >>> 16) | 0;
                s[(gf | 12) >> 2] = tf << 16 | $ & 0xffff
            }
        }
        for (xf = 0; (xf | 0) < (t | 0); xf = xf + 16 | 0) {
            uf = f + xf | 0, gf = e + (xf << 1) | 0;
            u = s[uf >> 2] | 0, r = u & 0xffff, u = u >>> 16, _ = s[(uf | 4) >> 2] | 0, n = _ & 0xffff, _ = _ >>> 16;
            B = s[(uf | 8) >> 2] | 0, p = B & 0xffff, B = B >>> 16, H = s[(uf | 12) >> 2] | 0, E = H & 0xffff, H = H >>> 16;
            $ = i(r, p) | 0;
            ff = i(u, p) | 0;
            tf = ((i(r, B) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
            sf = ((i(u, B) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
            T = tf << 16 | $ & 0xffff;
            $ = (i(r, E) | 0) + (sf & 0xffff) | 0;
            ff = (i(u, E) | 0) + (sf >>> 16) | 0;
            tf = ((i(r, H) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
            sf = ((i(u, H) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
            P = tf << 16 | $ & 0xffff;
            z = sf;
            $ = (i(n, p) | 0) + (P & 0xffff) | 0;
            ff = (i(_, p) | 0) + (P >>> 16) | 0;
            tf = ((i(n, B) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
            sf = ((i(_, B) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
            P = tf << 16 | $ & 0xffff;
            $ = ((i(n, E) | 0) + (z & 0xffff) | 0) + (sf & 0xffff) | 0;
            ff = ((i(_, E) | 0) + (z >>> 16) | 0) + (sf >>> 16) | 0;
            tf = ((i(n, H) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
            sf = ((i(_, H) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
            z = tf << 16 | $ & 0xffff;
            Z = sf;
            nf = s[(gf | 8) >> 2] | 0;
            $ = (nf & 0xffff) + ((T & 0xffff) << 1) | 0;
            tf = ((nf >>> 16) + (T >>> 16 << 1) | 0) + ($ >>> 16) | 0;
            s[(gf | 8) >> 2] = tf << 16 | $ & 0xffff;
            ef = tf >>> 16;
            nf = s[(gf | 12) >> 2] | 0;
            $ = ((nf & 0xffff) + ((P & 0xffff) << 1) | 0) + ef | 0;
            tf = ((nf >>> 16) + (P >>> 16 << 1) | 0) + ($ >>> 16) | 0;
            s[(gf | 12) >> 2] = tf << 16 | $ & 0xffff;
            ef = tf >>> 16;
            nf = s[(gf | 16) >> 2] | 0;
            $ = ((nf & 0xffff) + ((z & 0xffff) << 1) | 0) + ef | 0;
            tf = ((nf >>> 16) + (z >>> 16 << 1) | 0) + ($ >>> 16) | 0;
            s[(gf | 16) >> 2] = tf << 16 | $ & 0xffff;
            ef = tf >>> 16;
            nf = s[(gf | 20) >> 2] | 0;
            $ = ((nf & 0xffff) + ((Z & 0xffff) << 1) | 0) + ef | 0;
            tf = ((nf >>> 16) + (Z >>> 16 << 1) | 0) + ($ >>> 16) | 0;
            s[(gf | 20) >> 2] = tf << 16 | $ & 0xffff;
            ef = tf >>> 16;
            for (lf = 24; !!ef & (lf | 0) < 32; lf = lf + 4 | 0) {
                nf = s[(gf | lf) >> 2] | 0;
                $ = (nf & 0xffff) + ef | 0;
                tf = (nf >>> 16) + ($ >>> 16) | 0;
                s[(gf | lf) >> 2] = tf << 16 | $ & 0xffff;
                ef = tf >>> 16
            }
        }
        for (xf = 0; (xf | 0) < (t | 0); xf = xf + 32 | 0) {
            uf = f + xf | 0, gf = e + (xf << 1) | 0;
            u = s[uf >> 2] | 0, r = u & 0xffff, u = u >>> 16, _ = s[(uf | 4) >> 2] | 0, n = _ & 0xffff, _ = _ >>> 16, g = s[(uf | 8) >> 2] | 0, a = g & 0xffff, g = g >>> 16, b = s[(uf | 12) >> 2] | 0, h = b & 0xffff, b = b >>> 16;
            B = s[(uf | 16) >> 2] | 0, p = B & 0xffff, B = B >>> 16, H = s[(uf | 20) >> 2] | 0, E = H & 0xffff, H = H >>> 16, L = s[(uf | 24) >> 2] | 0, w = L & 0xffff, L = L >>> 16, k = s[(uf | 28) >> 2] | 0, S = k & 0xffff, k = k >>> 16;
            $ = i(r, p) | 0;
            ff = i(u, p) | 0;
            tf = ((i(r, B) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
            sf = ((i(u, B) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
            T = tf << 16 | $ & 0xffff;
            $ = (i(r, E) | 0) + (sf & 0xffff) | 0;
            ff = (i(u, E) | 0) + (sf >>> 16) | 0;
            tf = ((i(r, H) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
            sf = ((i(u, H) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
            P = tf << 16 | $ & 0xffff;
            $ = (i(r, w) | 0) + (sf & 0xffff) | 0;
            ff = (i(u, w) | 0) + (sf >>> 16) | 0;
            tf = ((i(r, L) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
            sf = ((i(u, L) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
            z = tf << 16 | $ & 0xffff;
            $ = (i(r, S) | 0) + (sf & 0xffff) | 0;
            ff = (i(u, S) | 0) + (sf >>> 16) | 0;
            tf = ((i(r, k) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
            sf = ((i(u, k) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
            Z = tf << 16 | $ & 0xffff;
            O = sf;
            $ = (i(n, p) | 0) + (P & 0xffff) | 0;
            ff = (i(_, p) | 0) + (P >>> 16) | 0;
            tf = ((i(n, B) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
            sf = ((i(_, B) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
            P = tf << 16 | $ & 0xffff;
            $ = ((i(n, E) | 0) + (z & 0xffff) | 0) + (sf & 0xffff) | 0;
            ff = ((i(_, E) | 0) + (z >>> 16) | 0) + (sf >>> 16) | 0;
            tf = ((i(n, H) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
            sf = ((i(_, H) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
            z = tf << 16 | $ & 0xffff;
            $ = ((i(n, w) | 0) + (Z & 0xffff) | 0) + (sf & 0xffff) | 0;
            ff = ((i(_, w) | 0) + (Z >>> 16) | 0) + (sf >>> 16) | 0;
            tf = ((i(n, L) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
            sf = ((i(_, L) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
            Z = tf << 16 | $ & 0xffff;
            $ = ((i(n, S) | 0) + (O & 0xffff) | 0) + (sf & 0xffff) | 0;
            ff = ((i(_, S) | 0) + (O >>> 16) | 0) + (sf >>> 16) | 0;
            tf = ((i(n, k) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
            sf = ((i(_, k) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
            O = tf << 16 | $ & 0xffff;
            G = sf;
            $ = (i(a, p) | 0) + (z & 0xffff) | 0;
            ff = (i(g, p) | 0) + (z >>> 16) | 0;
            tf = ((i(a, B) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
            sf = ((i(g, B) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
            z = tf << 16 | $ & 0xffff;
            $ = ((i(a, E) | 0) + (Z & 0xffff) | 0) + (sf & 0xffff) | 0;
            ff = ((i(g, E) | 0) + (Z >>> 16) | 0) + (sf >>> 16) | 0;
            tf = ((i(a, H) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
            sf = ((i(g, H) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
            Z = tf << 16 | $ & 0xffff;
            $ = ((i(a, w) | 0) + (O & 0xffff) | 0) + (sf & 0xffff) | 0;
            ff = ((i(g, w) | 0) + (O >>> 16) | 0) + (sf >>> 16) | 0;
            tf = ((i(a, L) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
            sf = ((i(g, L) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
            O = tf << 16 | $ & 0xffff;
            $ = ((i(a, S) | 0) + (G & 0xffff) | 0) + (sf & 0xffff) | 0;
            ff = ((i(g, S) | 0) + (G >>> 16) | 0) + (sf >>> 16) | 0;
            tf = ((i(a, k) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
            sf = ((i(g, k) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
            G = tf << 16 | $ & 0xffff;
            F = sf;
            $ = (i(h, p) | 0) + (Z & 0xffff) | 0;
            ff = (i(b, p) | 0) + (Z >>> 16) | 0;
            tf = ((i(h, B) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
            sf = ((i(b, B) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
            Z = tf << 16 | $ & 0xffff;
            $ = ((i(h, E) | 0) + (O & 0xffff) | 0) + (sf & 0xffff) | 0;
            ff = ((i(b, E) | 0) + (O >>> 16) | 0) + (sf >>> 16) | 0;
            tf = ((i(h, H) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
            sf = ((i(b, H) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
            O = tf << 16 | $ & 0xffff;
            $ = ((i(h, w) | 0) + (G & 0xffff) | 0) + (sf & 0xffff) | 0;
            ff = ((i(b, w) | 0) + (G >>> 16) | 0) + (sf >>> 16) | 0;
            tf = ((i(h, L) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
            sf = ((i(b, L) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
            G = tf << 16 | $ & 0xffff;
            $ = ((i(h, S) | 0) + (F & 0xffff) | 0) + (sf & 0xffff) | 0;
            ff = ((i(b, S) | 0) + (F >>> 16) | 0) + (sf >>> 16) | 0;
            tf = ((i(h, k) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
            sf = ((i(b, k) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
            F = tf << 16 | $ & 0xffff;
            q = sf;
            nf = s[(gf | 16) >> 2] | 0;
            $ = (nf & 0xffff) + ((T & 0xffff) << 1) | 0;
            tf = ((nf >>> 16) + (T >>> 16 << 1) | 0) + ($ >>> 16) | 0;
            s[(gf | 16) >> 2] = tf << 16 | $ & 0xffff;
            ef = tf >>> 16;
            nf = s[(gf | 20) >> 2] | 0;
            $ = ((nf & 0xffff) + ((P & 0xffff) << 1) | 0) + ef | 0;
            tf = ((nf >>> 16) + (P >>> 16 << 1) | 0) + ($ >>> 16) | 0;
            s[(gf | 20) >> 2] = tf << 16 | $ & 0xffff;
            ef = tf >>> 16;
            nf = s[(gf | 24) >> 2] | 0;
            $ = ((nf & 0xffff) + ((z & 0xffff) << 1) | 0) + ef | 0;
            tf = ((nf >>> 16) + (z >>> 16 << 1) | 0) + ($ >>> 16) | 0;
            s[(gf | 24) >> 2] = tf << 16 | $ & 0xffff;
            ef = tf >>> 16;
            nf = s[(gf | 28) >> 2] | 0;
            $ = ((nf & 0xffff) + ((Z & 0xffff) << 1) | 0) + ef | 0;
            tf = ((nf >>> 16) + (Z >>> 16 << 1) | 0) + ($ >>> 16) | 0;
            s[(gf | 28) >> 2] = tf << 16 | $ & 0xffff;
            ef = tf >>> 16;
            nf = s[gf + 32 >> 2] | 0;
            $ = ((nf & 0xffff) + ((O & 0xffff) << 1) | 0) + ef | 0;
            tf = ((nf >>> 16) + (O >>> 16 << 1) | 0) + ($ >>> 16) | 0;
            s[gf + 32 >> 2] = tf << 16 | $ & 0xffff;
            ef = tf >>> 16;
            nf = s[gf + 36 >> 2] | 0;
            $ = ((nf & 0xffff) + ((G & 0xffff) << 1) | 0) + ef | 0;
            tf = ((nf >>> 16) + (G >>> 16 << 1) | 0) + ($ >>> 16) | 0;
            s[gf + 36 >> 2] = tf << 16 | $ & 0xffff;
            ef = tf >>> 16;
            nf = s[gf + 40 >> 2] | 0;
            $ = ((nf & 0xffff) + ((F & 0xffff) << 1) | 0) + ef | 0;
            tf = ((nf >>> 16) + (F >>> 16 << 1) | 0) + ($ >>> 16) | 0;
            s[gf + 40 >> 2] = tf << 16 | $ & 0xffff;
            ef = tf >>> 16;
            nf = s[gf + 44 >> 2] | 0;
            $ = ((nf & 0xffff) + ((q & 0xffff) << 1) | 0) + ef | 0;
            tf = ((nf >>> 16) + (q >>> 16 << 1) | 0) + ($ >>> 16) | 0;
            s[gf + 44 >> 2] = tf << 16 | $ & 0xffff;
            ef = tf >>> 16;
            for (lf = 48; !!ef & (lf | 0) < 64; lf = lf + 4 | 0) {
                nf = s[gf + lf >> 2] | 0;
                $ = (nf & 0xffff) + ef | 0;
                tf = (nf >>> 16) + ($ >>> 16) | 0;
                s[gf + lf >> 2] = tf << 16 | $ & 0xffff;
                ef = tf >>> 16
            }
        }
        for (af = 32; (af | 0) < (t | 0); af = af << 1) {
            hf = af << 1;
            for (xf = 0; (xf | 0) < (t | 0); xf = xf + hf | 0) {
                gf = e + (xf << 1) | 0;
                rf = 0;
                for (cf = 0; (cf | 0) < (af | 0); cf = cf + 32 | 0) {
                    uf = (f + xf | 0) + cf | 0;
                    u = s[uf >> 2] | 0, r = u & 0xffff, u = u >>> 16, _ = s[(uf | 4) >> 2] | 0, n = _ & 0xffff, _ = _ >>> 16, g = s[(uf | 8) >> 2] | 0, a = g & 0xffff, g = g >>> 16, b = s[(uf | 12) >> 2] | 0, h = b & 0xffff, b = b >>> 16, m = s[(uf | 16) >> 2] | 0, x = m & 0xffff, m = m >>> 16, A = s[(uf | 20) >> 2] | 0, c = A & 0xffff, A = A >>> 16, d = s[(uf | 24) >> 2] | 0, o = d & 0xffff, d = d >>> 16, y = s[(uf | 28) >> 2] | 0, l = y & 0xffff, y = y >>> 16;
                    V = j = K = X = W = J = Q = Y = ef = 0;
                    for (of = 0; (of | 0) < (af | 0); of = of + 32 | 0) {
                        _f = ((f + xf | 0) + af | 0) + of | 0;
                        B = s[_f >> 2] | 0, p = B & 0xffff, B = B >>> 16, H = s[(_f | 4) >> 2] | 0, E = H & 0xffff, H = H >>> 16, L = s[(_f | 8) >> 2] | 0, w = L & 0xffff, L = L >>> 16, k = s[(_f | 12) >> 2] | 0, S = k & 0xffff, k = k >>> 16, N = s[(_f | 16) >> 2] | 0, C = N & 0xffff, N = N >>> 16, R = s[(_f | 20) >> 2] | 0, v = R & 0xffff, R = R >>> 16, I = s[(_f | 24) >> 2] | 0, M = I & 0xffff, I = I >>> 16, D = s[(_f | 28) >> 2] | 0, U = D & 0xffff, D = D >>> 16;
                        T = P = z = Z = O = G = F = q = 0;
                        $ = ((i(r, p) | 0) + (T & 0xffff) | 0) + (V & 0xffff) | 0;
                        ff = ((i(u, p) | 0) + (T >>> 16) | 0) + (V >>> 16) | 0;
                        tf = ((i(r, B) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(u, B) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        T = tf << 16 | $ & 0xffff;
                        $ = ((i(r, E) | 0) + (P & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(u, E) | 0) + (P >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(r, H) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(u, H) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        P = tf << 16 | $ & 0xffff;
                        $ = ((i(r, w) | 0) + (z & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(u, w) | 0) + (z >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(r, L) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(u, L) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        z = tf << 16 | $ & 0xffff;
                        $ = ((i(r, S) | 0) + (Z & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(u, S) | 0) + (Z >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(r, k) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(u, k) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        Z = tf << 16 | $ & 0xffff;
                        $ = ((i(r, C) | 0) + (O & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(u, C) | 0) + (O >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(r, N) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(u, N) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        O = tf << 16 | $ & 0xffff;
                        $ = ((i(r, v) | 0) + (G & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(u, v) | 0) + (G >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(r, R) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(u, R) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        G = tf << 16 | $ & 0xffff;
                        $ = ((i(r, M) | 0) + (F & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(u, M) | 0) + (F >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(r, I) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(u, I) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        F = tf << 16 | $ & 0xffff;
                        $ = ((i(r, U) | 0) + (q & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(u, U) | 0) + (q >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(r, D) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(u, D) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        q = tf << 16 | $ & 0xffff;
                        V = sf;
                        $ = ((i(n, p) | 0) + (P & 0xffff) | 0) + (j & 0xffff) | 0;
                        ff = ((i(_, p) | 0) + (P >>> 16) | 0) + (j >>> 16) | 0;
                        tf = ((i(n, B) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(_, B) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        P = tf << 16 | $ & 0xffff;
                        $ = ((i(n, E) | 0) + (z & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(_, E) | 0) + (z >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(n, H) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(_, H) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        z = tf << 16 | $ & 0xffff;
                        $ = ((i(n, w) | 0) + (Z & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(_, w) | 0) + (Z >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(n, L) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(_, L) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        Z = tf << 16 | $ & 0xffff;
                        $ = ((i(n, S) | 0) + (O & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(_, S) | 0) + (O >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(n, k) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(_, k) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        O = tf << 16 | $ & 0xffff;
                        $ = ((i(n, C) | 0) + (G & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(_, C) | 0) + (G >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(n, N) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(_, N) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        G = tf << 16 | $ & 0xffff;
                        $ = ((i(n, v) | 0) + (F & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(_, v) | 0) + (F >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(n, R) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(_, R) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        F = tf << 16 | $ & 0xffff;
                        $ = ((i(n, M) | 0) + (q & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(_, M) | 0) + (q >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(n, I) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(_, I) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        q = tf << 16 | $ & 0xffff;
                        $ = ((i(n, U) | 0) + (V & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(_, U) | 0) + (V >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(n, D) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(_, D) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        V = tf << 16 | $ & 0xffff;
                        j = sf;
                        $ = ((i(a, p) | 0) + (z & 0xffff) | 0) + (K & 0xffff) | 0;
                        ff = ((i(g, p) | 0) + (z >>> 16) | 0) + (K >>> 16) | 0;
                        tf = ((i(a, B) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(g, B) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        z = tf << 16 | $ & 0xffff;
                        $ = ((i(a, E) | 0) + (Z & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(g, E) | 0) + (Z >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(a, H) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(g, H) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        Z = tf << 16 | $ & 0xffff;
                        $ = ((i(a, w) | 0) + (O & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(g, w) | 0) + (O >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(a, L) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(g, L) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        O = tf << 16 | $ & 0xffff;
                        $ = ((i(a, S) | 0) + (G & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(g, S) | 0) + (G >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(a, k) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(g, k) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        G = tf << 16 | $ & 0xffff;
                        $ = ((i(a, C) | 0) + (F & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(g, C) | 0) + (F >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(a, N) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(g, N) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        F = tf << 16 | $ & 0xffff;
                        $ = ((i(a, v) | 0) + (q & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(g, v) | 0) + (q >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(a, R) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(g, R) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        q = tf << 16 | $ & 0xffff;
                        $ = ((i(a, M) | 0) + (V & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(g, M) | 0) + (V >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(a, I) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(g, I) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        V = tf << 16 | $ & 0xffff;
                        $ = ((i(a, U) | 0) + (j & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(g, U) | 0) + (j >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(a, D) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(g, D) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        j = tf << 16 | $ & 0xffff;
                        K = sf;
                        $ = ((i(h, p) | 0) + (Z & 0xffff) | 0) + (X & 0xffff) | 0;
                        ff = ((i(b, p) | 0) + (Z >>> 16) | 0) + (X >>> 16) | 0;
                        tf = ((i(h, B) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(b, B) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        Z = tf << 16 | $ & 0xffff;
                        $ = ((i(h, E) | 0) + (O & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(b, E) | 0) + (O >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(h, H) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(b, H) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        O = tf << 16 | $ & 0xffff;
                        $ = ((i(h, w) | 0) + (G & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(b, w) | 0) + (G >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(h, L) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(b, L) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        G = tf << 16 | $ & 0xffff;
                        $ = ((i(h, S) | 0) + (F & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(b, S) | 0) + (F >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(h, k) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(b, k) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        F = tf << 16 | $ & 0xffff;
                        $ = ((i(h, C) | 0) + (q & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(b, C) | 0) + (q >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(h, N) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(b, N) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        q = tf << 16 | $ & 0xffff;
                        $ = ((i(h, v) | 0) + (V & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(b, v) | 0) + (V >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(h, R) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(b, R) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        V = tf << 16 | $ & 0xffff;
                        $ = ((i(h, M) | 0) + (j & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(b, M) | 0) + (j >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(h, I) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(b, I) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        j = tf << 16 | $ & 0xffff;
                        $ = ((i(h, U) | 0) + (K & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(b, U) | 0) + (K >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(h, D) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(b, D) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        K = tf << 16 | $ & 0xffff;
                        X = sf;
                        $ = ((i(x, p) | 0) + (O & 0xffff) | 0) + (W & 0xffff) | 0;
                        ff = ((i(m, p) | 0) + (O >>> 16) | 0) + (W >>> 16) | 0;
                        tf = ((i(x, B) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(m, B) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        O = tf << 16 | $ & 0xffff;
                        $ = ((i(x, E) | 0) + (G & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(m, E) | 0) + (G >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(x, H) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(m, H) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        G = tf << 16 | $ & 0xffff;
                        $ = ((i(x, w) | 0) + (F & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(m, w) | 0) + (F >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(x, L) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(m, L) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        F = tf << 16 | $ & 0xffff;
                        $ = ((i(x, S) | 0) + (q & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(m, S) | 0) + (q >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(x, k) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(m, k) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        q = tf << 16 | $ & 0xffff;
                        $ = ((i(x, C) | 0) + (V & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(m, C) | 0) + (V >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(x, N) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(m, N) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        V = tf << 16 | $ & 0xffff;
                        $ = ((i(x, v) | 0) + (j & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(m, v) | 0) + (j >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(x, R) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(m, R) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        j = tf << 16 | $ & 0xffff;
                        $ = ((i(x, M) | 0) + (K & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(m, M) | 0) + (K >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(x, I) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(m, I) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        K = tf << 16 | $ & 0xffff;
                        $ = ((i(x, U) | 0) + (X & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(m, U) | 0) + (X >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(x, D) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(m, D) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        X = tf << 16 | $ & 0xffff;
                        W = sf;
                        $ = ((i(c, p) | 0) + (G & 0xffff) | 0) + (J & 0xffff) | 0;
                        ff = ((i(A, p) | 0) + (G >>> 16) | 0) + (J >>> 16) | 0;
                        tf = ((i(c, B) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(A, B) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        G = tf << 16 | $ & 0xffff;
                        $ = ((i(c, E) | 0) + (F & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(A, E) | 0) + (F >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(c, H) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(A, H) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        F = tf << 16 | $ & 0xffff;
                        $ = ((i(c, w) | 0) + (q & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(A, w) | 0) + (q >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(c, L) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(A, L) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        q = tf << 16 | $ & 0xffff;
                        $ = ((i(c, S) | 0) + (V & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(A, S) | 0) + (V >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(c, k) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(A, k) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        V = tf << 16 | $ & 0xffff;
                        $ = ((i(c, C) | 0) + (j & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(A, C) | 0) + (j >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(c, N) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(A, N) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        j = tf << 16 | $ & 0xffff;
                        $ = ((i(c, v) | 0) + (K & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(A, v) | 0) + (K >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(c, R) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(A, R) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        K = tf << 16 | $ & 0xffff;
                        $ = ((i(c, M) | 0) + (X & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(A, M) | 0) + (X >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(c, I) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(A, I) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        X = tf << 16 | $ & 0xffff;
                        $ = ((i(c, U) | 0) + (W & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(A, U) | 0) + (W >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(c, D) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(A, D) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        W = tf << 16 | $ & 0xffff;
                        J = sf;
                        $ = ((i(o, p) | 0) + (F & 0xffff) | 0) + (Q & 0xffff) | 0;
                        ff = ((i(d, p) | 0) + (F >>> 16) | 0) + (Q >>> 16) | 0;
                        tf = ((i(o, B) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(d, B) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        F = tf << 16 | $ & 0xffff;
                        $ = ((i(o, E) | 0) + (q & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(d, E) | 0) + (q >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(o, H) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(d, H) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        q = tf << 16 | $ & 0xffff;
                        $ = ((i(o, w) | 0) + (V & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(d, w) | 0) + (V >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(o, L) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(d, L) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        V = tf << 16 | $ & 0xffff;
                        $ = ((i(o, S) | 0) + (j & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(d, S) | 0) + (j >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(o, k) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(d, k) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        j = tf << 16 | $ & 0xffff;
                        $ = ((i(o, C) | 0) + (K & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(d, C) | 0) + (K >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(o, N) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(d, N) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        K = tf << 16 | $ & 0xffff;
                        $ = ((i(o, v) | 0) + (X & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(d, v) | 0) + (X >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(o, R) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(d, R) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        X = tf << 16 | $ & 0xffff;
                        $ = ((i(o, M) | 0) + (W & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(d, M) | 0) + (W >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(o, I) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(d, I) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        W = tf << 16 | $ & 0xffff;
                        $ = ((i(o, U) | 0) + (J & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(d, U) | 0) + (J >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(o, D) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(d, D) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        J = tf << 16 | $ & 0xffff;
                        Q = sf;
                        $ = ((i(l, p) | 0) + (q & 0xffff) | 0) + (Y & 0xffff) | 0;
                        ff = ((i(y, p) | 0) + (q >>> 16) | 0) + (Y >>> 16) | 0;
                        tf = ((i(l, B) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(y, B) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        q = tf << 16 | $ & 0xffff;
                        $ = ((i(l, E) | 0) + (V & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(y, E) | 0) + (V >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(l, H) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(y, H) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        V = tf << 16 | $ & 0xffff;
                        $ = ((i(l, w) | 0) + (j & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(y, w) | 0) + (j >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(l, L) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(y, L) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        j = tf << 16 | $ & 0xffff;
                        $ = ((i(l, S) | 0) + (K & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(y, S) | 0) + (K >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(l, k) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(y, k) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        K = tf << 16 | $ & 0xffff;
                        $ = ((i(l, C) | 0) + (X & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(y, C) | 0) + (X >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(l, N) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(y, N) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        X = tf << 16 | $ & 0xffff;
                        $ = ((i(l, v) | 0) + (W & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(y, v) | 0) + (W >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(l, R) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(y, R) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        W = tf << 16 | $ & 0xffff;
                        $ = ((i(l, M) | 0) + (J & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(y, M) | 0) + (J >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(l, I) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(y, I) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        J = tf << 16 | $ & 0xffff;
                        $ = ((i(l, U) | 0) + (Q & 0xffff) | 0) + (sf & 0xffff) | 0;
                        ff = ((i(y, U) | 0) + (Q >>> 16) | 0) + (sf >>> 16) | 0;
                        tf = ((i(l, D) | 0) + (ff & 0xffff) | 0) + ($ >>> 16) | 0;
                        sf = ((i(y, D) | 0) + (ff >>> 16) | 0) + (tf >>> 16) | 0;
                        Q = tf << 16 | $ & 0xffff;
                        Y = sf;
                        lf = af + (cf + of | 0) | 0;
                        nf = s[gf + lf >> 2] | 0;
                        $ = ((nf & 0xffff) + ((T & 0xffff) << 1) | 0) + ef | 0;
                        tf = ((nf >>> 16) + (T >>> 16 << 1) | 0) + ($ >>> 16) | 0;
                        s[gf + lf >> 2] = tf << 16 | $ & 0xffff;
                        ef = tf >>> 16;
                        lf = lf + 4 | 0;
                        nf = s[gf + lf >> 2] | 0;
                        $ = ((nf & 0xffff) + ((P & 0xffff) << 1) | 0) + ef | 0;
                        tf = ((nf >>> 16) + (P >>> 16 << 1) | 0) + ($ >>> 16) | 0;
                        s[gf + lf >> 2] = tf << 16 | $ & 0xffff;
                        ef = tf >>> 16;
                        lf = lf + 4 | 0;
                        nf = s[gf + lf >> 2] | 0;
                        $ = ((nf & 0xffff) + ((z & 0xffff) << 1) | 0) + ef | 0;
                        tf = ((nf >>> 16) + (z >>> 16 << 1) | 0) + ($ >>> 16) | 0;
                        s[gf + lf >> 2] = tf << 16 | $ & 0xffff;
                        ef = tf >>> 16;
                        lf = lf + 4 | 0;
                        nf = s[gf + lf >> 2] | 0;
                        $ = ((nf & 0xffff) + ((Z & 0xffff) << 1) | 0) + ef | 0;
                        tf = ((nf >>> 16) + (Z >>> 16 << 1) | 0) + ($ >>> 16) | 0;
                        s[gf + lf >> 2] = tf << 16 | $ & 0xffff;
                        ef = tf >>> 16;
                        lf = lf + 4 | 0;
                        nf = s[gf + lf >> 2] | 0;
                        $ = ((nf & 0xffff) + ((O & 0xffff) << 1) | 0) + ef | 0;
                        tf = ((nf >>> 16) + (O >>> 16 << 1) | 0) + ($ >>> 16) | 0;
                        s[gf + lf >> 2] = tf << 16 | $ & 0xffff;
                        ef = tf >>> 16;
                        lf = lf + 4 | 0;
                        nf = s[gf + lf >> 2] | 0;
                        $ = ((nf & 0xffff) + ((G & 0xffff) << 1) | 0) + ef | 0;
                        tf = ((nf >>> 16) + (G >>> 16 << 1) | 0) + ($ >>> 16) | 0;
                        s[gf + lf >> 2] = tf << 16 | $ & 0xffff;
                        ef = tf >>> 16;
                        lf = lf + 4 | 0;
                        nf = s[gf + lf >> 2] | 0;
                        $ = ((nf & 0xffff) + ((F & 0xffff) << 1) | 0) + ef | 0;
                        tf = ((nf >>> 16) + (F >>> 16 << 1) | 0) + ($ >>> 16) | 0;
                        s[gf + lf >> 2] = tf << 16 | $ & 0xffff;
                        ef = tf >>> 16;
                        lf = lf + 4 | 0;
                        nf = s[gf + lf >> 2] | 0;
                        $ = ((nf & 0xffff) + ((q & 0xffff) << 1) | 0) + ef | 0;
                        tf = ((nf >>> 16) + (q >>> 16 << 1) | 0) + ($ >>> 16) | 0;
                        s[gf + lf >> 2] = tf << 16 | $ & 0xffff;
                        ef = tf >>> 16
                    }
                    lf = af + (cf + of | 0) | 0;
                    nf = s[gf + lf >> 2] | 0;
                    $ = (((nf & 0xffff) + ((V & 0xffff) << 1) | 0) + ef | 0) + rf | 0;
                    tf = ((nf >>> 16) + (V >>> 16 << 1) | 0) + ($ >>> 16) | 0;
                    s[gf + lf >> 2] = tf << 16 | $ & 0xffff;
                    ef = tf >>> 16;
                    lf = lf + 4 | 0;
                    nf = s[gf + lf >> 2] | 0;
                    $ = ((nf & 0xffff) + ((j & 0xffff) << 1) | 0) + ef | 0;
                    tf = ((nf >>> 16) + (j >>> 16 << 1) | 0) + ($ >>> 16) | 0;
                    s[gf + lf >> 2] = tf << 16 | $ & 0xffff;
                    ef = tf >>> 16;
                    lf = lf + 4 | 0;
                    nf = s[gf + lf >> 2] | 0;
                    $ = ((nf & 0xffff) + ((K & 0xffff) << 1) | 0) + ef | 0;
                    tf = ((nf >>> 16) + (K >>> 16 << 1) | 0) + ($ >>> 16) | 0;
                    s[gf + lf >> 2] = tf << 16 | $ & 0xffff;
                    ef = tf >>> 16;
                    lf = lf + 4 | 0;
                    nf = s[gf + lf >> 2] | 0;
                    $ = ((nf & 0xffff) + ((X & 0xffff) << 1) | 0) + ef | 0;
                    tf = ((nf >>> 16) + (X >>> 16 << 1) | 0) + ($ >>> 16) | 0;
                    s[gf + lf >> 2] = tf << 16 | $ & 0xffff;
                    ef = tf >>> 16;
                    lf = lf + 4 | 0;
                    nf = s[gf + lf >> 2] | 0;
                    $ = ((nf & 0xffff) + ((W & 0xffff) << 1) | 0) + ef | 0;
                    tf = ((nf >>> 16) + (W >>> 16 << 1) | 0) + ($ >>> 16) | 0;
                    s[gf + lf >> 2] = tf << 16 | $ & 0xffff;
                    ef = tf >>> 16;
                    lf = lf + 4 | 0;
                    nf = s[gf + lf >> 2] | 0;
                    $ = ((nf & 0xffff) + ((J & 0xffff) << 1) | 0) + ef | 0;
                    tf = ((nf >>> 16) + (J >>> 16 << 1) | 0) + ($ >>> 16) | 0;
                    s[gf + lf >> 2] = tf << 16 | $ & 0xffff;
                    ef = tf >>> 16;
                    lf = lf + 4 | 0;
                    nf = s[gf + lf >> 2] | 0;
                    $ = ((nf & 0xffff) + ((Q & 0xffff) << 1) | 0) + ef | 0;
                    tf = ((nf >>> 16) + (Q >>> 16 << 1) | 0) + ($ >>> 16) | 0;
                    s[gf + lf >> 2] = tf << 16 | $ & 0xffff;
                    ef = tf >>> 16;
                    lf = lf + 4 | 0;
                    nf = s[gf + lf >> 2] | 0;
                    $ = ((nf & 0xffff) + ((Y & 0xffff) << 1) | 0) + ef | 0;
                    tf = ((nf >>> 16) + (Y >>> 16 << 1) | 0) + ($ >>> 16) | 0;
                    s[gf + lf >> 2] = tf << 16 | $ & 0xffff;
                    rf = tf >>> 16
                }
                for (lf = lf + 4 | 0; !!rf & (lf | 0) < hf << 1; lf = lf + 4 | 0) {
                    nf = s[gf + lf >> 2] | 0;
                    $ = (nf & 0xffff) + rf | 0;
                    tf = (nf >>> 16) + ($ >>> 16) | 0;
                    s[gf + lf >> 2] = tf << 16 | $ & 0xffff;
                    rf = tf >>> 16
                }
            }
        }
    }

    function A(f, t, e, r, n) {
        f = f | 0;
        t = t | 0;
        e = e | 0;
        r = r | 0;
        n = n | 0;
        var a = 0, h = 0, x = 0, c = 0, o = 0, l = 0, u = 0, _ = 0, g = 0, b = 0, m = 0, A = 0, d = 0, y = 0, p = 0,
            E = 0, w = 0, S = 0, C = 0;
        for (w = t - 1 & -4; (w | 0) >= 0; w = w - 4 | 0) {
            a = s[f + w >> 2] | 0;
            if (a) {
                t = w;
                break
            }
        }
        for (w = r - 1 & -4; (w | 0) >= 0; w = w - 4 | 0) {
            h = s[e + w >> 2] | 0;
            if (h) {
                r = w;
                break
            }
        }
        while ((h & 0x80000000) == 0) {
            h = h << 1;
            x = x + 1 | 0
        }
        o = s[f + t >> 2] | 0;
        if (x) {
            c = o >>> (32 - x | 0);
            for (w = t - 4 | 0; (w | 0) >= 0; w = w - 4 | 0) {
                a = s[f + w >> 2] | 0;
                s[f + w + 4 >> 2] = o << x | (x ? a >>> (32 - x | 0) : 0);
                o = a
            }
            s[f >> 2] = o << x
        }
        if (x) {
            l = s[e + r >> 2] | 0;
            for (w = r - 4 | 0; (w | 0) >= 0; w = w - 4 | 0) {
                h = s[e + w >> 2] | 0;
                s[e + w + 4 >> 2] = l << x | h >>> (32 - x | 0);
                l = h
            }
            s[e >> 2] = l << x
        }
        l = s[e + r >> 2] | 0;
        u = l >>> 16, _ = l & 0xffff;
        for (w = t; (w | 0) >= (r | 0); w = w - 4 | 0) {
            S = w - r | 0;
            o = s[f + w >> 2] | 0;
            g = (c >>> 0) / (u >>> 0) | 0, m = (c >>> 0) % (u >>> 0) | 0, d = i(g, _) | 0;
            while ((g | 0) == 0x10000 | d >>> 0 > (m << 16 | o >>> 16) >>> 0) {
                g = g - 1 | 0, m = m + u | 0, d = d - _ | 0;
                if ((m | 0) >= 0x10000) break
            }
            p = 0, E = 0;
            for (C = 0; (C | 0) <= (r | 0); C = C + 4 | 0) {
                h = s[e + C >> 2] | 0;
                d = (i(g, h & 0xffff) | 0) + (p >>> 16) | 0;
                y = (i(g, h >>> 16) | 0) + (d >>> 16) | 0;
                h = p & 0xffff | d << 16;
                p = y;
                a = s[f + S + C >> 2] | 0;
                d = ((a & 0xffff) - (h & 0xffff) | 0) + E | 0;
                y = ((a >>> 16) - (h >>> 16) | 0) + (d >> 16) | 0;
                s[f + S + C >> 2] = y << 16 | d & 0xffff;
                E = y >> 16
            }
            d = ((c & 0xffff) - (p & 0xffff) | 0) + E | 0;
            y = ((c >>> 16) - (p >>> 16) | 0) + (d >> 16) | 0;
            c = y << 16 | d & 0xffff;
            E = y >> 16;
            if (E) {
                g = g - 1 | 0;
                E = 0;
                for (C = 0; (C | 0) <= (r | 0); C = C + 4 | 0) {
                    h = s[e + C >> 2] | 0;
                    a = s[f + S + C >> 2] | 0;
                    d = (a & 0xffff) + E | 0;
                    y = (a >>> 16) + h + (d >>> 16) | 0;
                    s[f + S + C >> 2] = y << 16 | d & 0xffff;
                    E = y >>> 16
                }
                c = c + E | 0
            }
            o = s[f + w >> 2] | 0;
            a = c << 16 | o >>> 16;
            b = (a >>> 0) / (u >>> 0) | 0, A = (a >>> 0) % (u >>> 0) | 0, d = i(b, _) | 0;
            while ((b | 0) == 0x10000 | d >>> 0 > (A << 16 | o & 0xffff) >>> 0) {
                b = b - 1 | 0, A = A + u | 0, d = d - _ | 0;
                if ((A | 0) >= 0x10000) break
            }
            p = 0, E = 0;
            for (C = 0; (C | 0) <= (r | 0); C = C + 4 | 0) {
                h = s[e + C >> 2] | 0;
                d = (i(b, h & 0xffff) | 0) + (p & 0xffff) | 0;
                y = ((i(b, h >>> 16) | 0) + (d >>> 16) | 0) + (p >>> 16) | 0;
                h = d & 0xffff | y << 16;
                p = y >>> 16;
                a = s[f + S + C >> 2] | 0;
                d = ((a & 0xffff) - (h & 0xffff) | 0) + E | 0;
                y = ((a >>> 16) - (h >>> 16) | 0) + (d >> 16) | 0;
                E = y >> 16;
                s[f + S + C >> 2] = y << 16 | d & 0xffff
            }
            d = ((c & 0xffff) - (p & 0xffff) | 0) + E | 0;
            y = ((c >>> 16) - (p >>> 16) | 0) + (d >> 16) | 0;
            E = y >> 16;
            if (E) {
                b = b - 1 | 0;
                E = 0;
                for (C = 0; (C | 0) <= (r | 0); C = C + 4 | 0) {
                    h = s[e + C >> 2] | 0;
                    a = s[f + S + C >> 2] | 0;
                    d = ((a & 0xffff) + (h & 0xffff) | 0) + E | 0;
                    y = ((a >>> 16) + (h >>> 16) | 0) + (d >>> 16) | 0;
                    E = y >>> 16;
                    s[f + S + C >> 2] = d & 0xffff | y << 16
                }
            }
            s[n + S >> 2] = g << 16 | b;
            c = s[f + w >> 2] | 0
        }
        if (x) {
            o = s[f >> 2] | 0;
            for (w = 4; (w | 0) <= (r | 0); w = w + 4 | 0) {
                a = s[f + w >> 2] | 0;
                s[f + w - 4 >> 2] = a << (32 - x | 0) | o >>> x;
                o = a
            }
            s[f + r >> 2] = o >>> x
        }
    }

    function d(f, t, e, r, n, o) {
        f = f | 0;
        t = t | 0;
        e = e | 0;
        r = r | 0;
        n = n | 0;
        o = o | 0;
        var u = 0, _ = 0, b = 0, m = 0, A = 0, d = 0, y = 0, p = 0, E = 0, w = 0, S = 0, C = 0, v = 0, M = 0;
        u = a(r << 1) | 0;
        c(r << 1, 0, u);
        x(t, f, u);
        for (C = 0; (C | 0) < (r | 0); C = C + 4 | 0) {
            b = s[u + C >> 2] | 0, m = b & 0xffff, b = b >>> 16;
            d = n >>> 16, A = n & 0xffff;
            y = i(m, A) | 0, p = ((i(m, d) | 0) + (i(b, A) | 0) | 0) + (y >>> 16) | 0;
            m = y & 0xffff, b = p & 0xffff;
            S = 0;
            for (v = 0; (v | 0) < (r | 0); v = v + 4 | 0) {
                M = C + v | 0;
                d = s[e + v >> 2] | 0, A = d & 0xffff, d = d >>> 16;
                w = s[u + M >> 2] | 0;
                y = ((i(m, A) | 0) + (S & 0xffff) | 0) + (w & 0xffff) | 0;
                p = ((i(m, d) | 0) + (S >>> 16) | 0) + (w >>> 16) | 0;
                E = ((i(b, A) | 0) + (p & 0xffff) | 0) + (y >>> 16) | 0;
                S = ((i(b, d) | 0) + (E >>> 16) | 0) + (p >>> 16) | 0;
                w = E << 16 | y & 0xffff;
                s[u + M >> 2] = w
            }
            M = C + v | 0;
            w = s[u + M >> 2] | 0;
            y = ((w & 0xffff) + (S & 0xffff) | 0) + _ | 0;
            p = ((w >>> 16) + (S >>> 16) | 0) + (y >>> 16) | 0;
            s[u + M >> 2] = p << 16 | y & 0xffff;
            _ = p >>> 16
        }
        x(r, u + r | 0, o);
        h(r << 1);
        if (_ | (l(e, r, o, r) | 0) <= 0) {
            g(o, r, e, r, o, r) | 0
        }
    }

    return {
        sreset: n,
        salloc: a,
        sfree: h,
        z: c,
        tst: u,
        neg: o,
        cmp: l,
        add: _,
        sub: g,
        mul: b,
        sqr: m,
        div: A,
        mredc: d
    }
};

function Number_extGCD(f, t) {
    var e, r, s, i, n = f < 0 ? -1 : 1, a = t < 0 ? -1 : 1, h = 1, x = 0, c = 0, o = 1;
    for (f *= n, t *= a, i = f < t, i && (s = f, f = t, t = s, s = n, n = a, a = s), r = Math.floor(f / t), e = f - r * t; e;) s = h - r * x, h = x, x = s, s = c - r * o, c = o, o = s, f = t, t = e, r = Math.floor(f / t), e = f - r * t;
    return x *= n, o *= a, i && (s = x, x = o, o = s), {gcd: t, x: x, y: o}
}


function getRandomValues(f) {
    if ("undefined" == typeof process) if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(f); else if (self.crypto && self.crypto.getRandomValues) self.crypto.getRandomValues(f); else {
        if (!window.msCrypto || !window.msCrypto.getRandomValues) throw new Error("No secure random number generator available.");
        window.msCrypto.getRandomValues(f)
    } else {
        const t = require("crypto"), e = t.randomBytes(f.length);
        f.set(e)
    }
}

const _bigint_stdlib = {Uint32Array: Uint32Array, Math: Math}, _bigint_heap = new Uint32Array(1048576);

function _half_imul(f, t) {
    return f * t | 0
}

void 0 === _bigint_stdlib.Math.imul ? (_bigint_stdlib.Math.imul = _half_imul, _bigint_asm = bigint_asm(_bigint_stdlib, null, _bigint_heap.buffer), delete _bigint_stdlib.Math.imul) : _bigint_asm = bigint_asm(_bigint_stdlib, null, _bigint_heap.buffer);
const _BigNumber_ZERO_limbs = new Uint32Array(0);

class BigNumber {
    constructor(f) {
        let t = _BigNumber_ZERO_limbs, e = 0, r = 0;
        if (void 0 === f) ; else {
            for (var s = 0; !f[s]; s++) ;
            if (e = 8 * (f.length - s), !e) return BigNumber.ZERO;
            t = new Uint32Array(e + 31 >> 5);
            for (var i = f.length - 4; i >= s; i -= 4) t[f.length - 4 - i >> 2] = f[i] << 24 | f[i + 1] << 16 | f[i + 2] << 8 | f[i + 3];
            s - i == 3 ? t[t.length - 1] = f[s] : s - i == 2 ? t[t.length - 1] = f[s] << 8 | f[s + 1] : s - i == 1 && (t[t.length - 1] = f[s] << 16 | f[s + 1] << 8 | f[s + 2]), r = 1
        }
        this.limbs = t, this.bitLength = e, this.sign = r
    }

    static fromNumber(f) {
        let t = _BigNumber_ZERO_limbs, e = 0, r = 0;
        var s = Math.abs(f);
        return s > 4294967295 ? (t = new Uint32Array(2), t[0] = 0 | s, t[1] = s / 4294967296 | 0, e = 52) : s > 0 ? (t = new Uint32Array(1), t[0] = s, e = 32) : (t = _BigNumber_ZERO_limbs, e = 0), r = f < 0 ? -1 : 1, BigNumber.fromConfig({
            limbs: t,
            bitLength: e,
            sign: r
        })
    }

    static fromConfig(f) {
        const t = new BigNumber;
        return t.limbs = new Uint32Array(f.limbs), t.bitLength = f.bitLength, t.sign = f.sign, t
    }

    toString(f) {
        f = f || 16;
        const t = this.limbs, e = this.bitLength;
        let r = "";
        if (16 !== f) throw new IllegalArgumentError("bad radix");
        for (var s = (e + 31 >> 5) - 1; s >= 0; s--) {
            var i = t[s].toString(16);
            r += "00000000".substr(i.length), r += i
        }
        return r = r.replace(/^0+/, ""), r.length || (r = "0"), this.sign < 0 && (r = "-" + r), r
    }

    toBytes() {
        const f = this.bitLength, t = this.limbs;
        if (0 === f) return new Uint8Array(0);
        const e = f + 7 >> 3, r = new Uint8Array(e);
        for (let f = 0; f < e; f++) {
            let s = e - f - 1;
            r[f] = t[s >> 2] >> ((3 & s) << 3)
        }
        return r
    }

    valueOf() {
        const f = this.limbs, t = this.bitLength, e = this.sign;
        if (!e) return 0;
        if (t <= 32) return e * (f[0] >>> 0);
        if (t <= 52) return e * (4294967296 * (f[1] >>> 0) + (f[0] >>> 0));
        let r, s, i = 0;
        for (r = f.length - 1; r >= 0; r--) if (0 !== (s = f[r])) {
            for (; 0 == (s << i & 2147483648);) i++;
            break
        }
        return 0 === r ? e * (f[0] >>> 0) : e * (1048576 * ((f[r] << i | (i ? f[r - 1] >>> 32 - i : 0)) >>> 0) + ((f[r - 1] << i | (i && r > 1 ? f[r - 2] >>> 32 - i : 0)) >>> 12)) * Math.pow(2, 32 * r - i - 52)
    }

    slice(f, t) {
        const e = this.limbs, r = this.bitLength;
        if (f < 0) throw new RangeError("TODO");
        if (f >= r) return BigNumber.ZERO;
        (void 0 === t || t > r - f) && (t = r - f);
        const s = new BigNumber;
        let i = f >> 5, n = f + t + 31 >> 5, a = t + 31 >> 5, h = f % 32, x = t % 32;
        const c = new Uint32Array(a);
        if (h) {
            for (var o = 0; o < n - i - 1; o++) c[o] = e[i + o] >>> h | e[i + o + 1] << 32 - h;
            c[o] = e[i + o] >>> h
        } else c.set(e.subarray(i, n));
        return x && (c[a - 1] &= -1 >>> 32 - x), s.limbs = c, s.bitLength = t, s.sign = this.sign, s
    }

    compare(f) {
        var t = this.limbs, e = t.length, r = f.limbs, s = r.length, i = 0;
        return this.sign < f.sign ? -1 : this.sign > f.sign ? 1 : (_bigint_heap.set(t, 0), _bigint_heap.set(r, e), i = _bigint_asm.cmp(0, e << 2, e << 2, s << 2), i * this.sign)
    }


    square() {
        if (!this.sign) return BigNumber.ZERO;
        var f, t, e = this.bitLength, r = this.limbs, s = r.length, i = new BigNumber;
        f = e << 1, t = f + 31 >> 5, _bigint_asm.sreset();
        var n = _bigint_asm.salloc(s << 2), a = _bigint_asm.salloc(t << 2);
        return _bigint_asm.z(a - n + (t << 2), 0, n), _bigint_heap.set(r, n >> 2), _bigint_asm.sqr(n, s << 2, a), i.limbs = new Uint32Array(_bigint_heap.subarray(a >> 2, (a >> 2) + t)), i.bitLength = f, i.sign = 1, i
    }

    divide(f) {
        var t, e, r = this.bitLength, s = this.limbs, i = s.length, n = f.bitLength, a = f.limbs, h = a.length,
            x = BigNumber.ZERO, c = BigNumber.ZERO;
        _bigint_asm.sreset();
        var o = _bigint_asm.salloc(i << 2), l = _bigint_asm.salloc(h << 2), u = _bigint_asm.salloc(i << 2);
        return _bigint_asm.z(u - o + (i << 2), 0, o), _bigint_heap.set(s, o >> 2), _bigint_heap.set(a, l >> 2), _bigint_asm.div(o, i << 2, l, h << 2, u), t = _bigint_asm.tst(u, i << 2) >> 2, t && (x = new BigNumber, x.limbs = new Uint32Array(_bigint_heap.subarray(u >> 2, (u >> 2) + t)), x.bitLength = r < t << 5 ? r : t << 5, x.sign = this.sign * f.sign), e = _bigint_asm.tst(o, h << 2) >> 2, e && (c = new BigNumber, c.limbs = new Uint32Array(_bigint_heap.subarray(o >> 2, (o >> 2) + e)), c.bitLength = n < e << 5 ? n : e << 5, c.sign = this.sign), {
            quotient: x,
            remainder: c
        }
    }

    multiply(f) {
        if (!this.sign || !f.sign) return BigNumber.ZERO;
        var t, e, r = this.bitLength, s = this.limbs, i = s.length, n = f.bitLength, a = f.limbs, h = a.length,
            x = new BigNumber;
        t = r + n, e = t + 31 >> 5, _bigint_asm.sreset();
        var c = _bigint_asm.salloc(i << 2), o = _bigint_asm.salloc(h << 2), l = _bigint_asm.salloc(e << 2);
        return _bigint_asm.z(l - c + (e << 2), 0, c), _bigint_heap.set(s, c >> 2), _bigint_heap.set(a, o >> 2), _bigint_asm.mul(c, i << 2, o, h << 2, l, e << 2), x.limbs = new Uint32Array(_bigint_heap.subarray(l >> 2, (l >> 2) + e)), x.sign = this.sign * f.sign, x.bitLength = t, x
    }
}

class Modulus extends BigNumber {
    constructor(f) {
        if (super(), this.limbs = f.limbs, this.bitLength = f.bitLength, this.sign = f.sign, this.valueOf() < 1) throw new RangeError;
        if (this.bitLength <= 32) return;
        let t;
        if (1 & this.limbs[0]) {
            {
                const f = 1 + (this.bitLength + 31 & -32), e = new Uint32Array(f + 31 >> 5);
                e[e.length - 1] = 1, t = new BigNumber, t.sign = 1, t.bitLength = f, t.limbs = e;
                const r = Number_extGCD(4294967296, this.limbs[0]).y;
                this.coefficient = r < 0 ? -r : 4294967296 - r
            }
            this.comodulus = t, this.comodulusRemainder = t.divide(this).remainder, this.comodulusRemainderSquare = t.square().divide(this).remainder
        }
    }

    reduce(f) {
        return f.bitLength <= 32 && this.bitLength <= 32 ? BigNumber.fromNumber(f.valueOf() % this.valueOf()) : f.compare(this) < 0 ? f : f.divide(this).remainder
    }


    power(f, t) {
        let e = 0;
        for (let f = 0; f < t.limbs.length; f++) {
            let r = t.limbs[f];
            for (; r;) 1 & r && e++, r >>>= 1
        }
        let r = 8;
        t.bitLength <= 4536 && (r = 7), t.bitLength <= 1736 && (r = 6), t.bitLength <= 630 && (r = 5), t.bitLength <= 210 && (r = 4), t.bitLength <= 60 && (r = 3), t.bitLength <= 12 && (r = 2), e <= 1 << r - 1 && (r = 1), f = Modulus._Montgomery_reduce(this.reduce(f).multiply(this.comodulusRemainderSquare), this);
        const s = Modulus._Montgomery_reduce(f.square(), this), i = new Array(1 << r - 1);
        i[0] = f, i[1] = Modulus._Montgomery_reduce(f.multiply(s), this);
        for (let f = 2; f < 1 << r - 1; f++) i[f] = Modulus._Montgomery_reduce(i[f - 1].multiply(s), this);
        const n = this.comodulusRemainder;
        let a = n;
        for (let f = t.limbs.length - 1; f >= 0; f--) {
            let e = t.limbs[f];
            for (let f = 32; f > 0;) if (2147483648 & e) {
                let t = e >>> 32 - r, s = r;
                for (; 0 == (1 & t);) t >>>= 1, s--;
                for (var h = i[t >>> 1]; t;) t >>>= 1, a !== n && (a = Modulus._Montgomery_reduce(a.square(), this));
                a = a !== n ? Modulus._Montgomery_reduce(a.multiply(h), this) : h, e <<= s, f -= s
            } else a !== n && (a = Modulus._Montgomery_reduce(a.square(), this)), e <<= 1, f--
        }
        return Modulus._Montgomery_reduce(a, this)
    }

    static _Montgomery_reduce(f, t) {
        const e = f.limbs, r = e.length, s = t.limbs, i = s.length, n = t.coefficient;
        _bigint_asm.sreset();
        const a = _bigint_asm.salloc(r << 2), h = _bigint_asm.salloc(i << 2), x = _bigint_asm.salloc(i << 2);
        _bigint_asm.z(x - a + (i << 2), 0, a), _bigint_heap.set(e, a >> 2), _bigint_heap.set(s, h >> 2), _bigint_asm.mredc(a, r << 2, h, i << 2, n, x);
        const c = new BigNumber;
        return c.limbs = new Uint32Array(_bigint_heap.subarray(x >> 2, (x >> 2) + i)), c.bitLength = t.bitLength, c.sign = 1, c
    }
}

class RSA {
    constructor(f) {
        const t = f.length;
        if (2 !== t && 3 !== t && 8 !== t) throw new SyntaxError("unexpected key type");
        const e = new Modulus(new BigNumber(f[0])), r = new BigNumber(f[1]);
        this.key = {
            0: e,
            1: r
        }, t > 2 && (this.key[2] = new BigNumber(f[2])), t > 3 && (this.key[3] = new Modulus(new BigNumber(f[3])), this.key[4] = new Modulus(new BigNumber(f[4])), this.key[5] = new BigNumber(f[5]), this.key[6] = new BigNumber(f[6]), this.key[7] = new BigNumber(f[7]))
    }

    encrypt(f) {
        if (!this.key) throw new IllegalStateError("no key is associated with the instance");
        if (this.key[0].compare(f) <= 0) throw new RangeError("data too large");
        const t = this.key[0], e = this.key[1];
        let r = t.power(f, e).toBytes();
        const s = t.bitLength + 7 >> 3;
        if (r.length < s) {
            const f = new Uint8Array(s);
            f.set(r, s - r.length), r = f
        }
        return this.result = r, this
    }

}

class RSA_PKCS1_v1_5 {
    constructor(f, t) {
        this.rsa = new RSA(f), this.hash = t
    }

    encrypt(data) {
        const k = (this.rsa.key[0].bitLength + 7) >> 3;
        const mLen = data.length;
        if (k < mLen + 11) {
            throw new SecurityError('Bad signature');
        }

        // EM = 0x00 || 0x02 || PS || 0x00 || M
        const psLen = k - mLen - 3;
        const ps = new Uint8Array(psLen);
        getNonZeroRandomValues(ps);

        const em = new Uint8Array(k);
        let offset = 0;
        em[offset++] = 0x00; // 0x00
        em[offset++] = 0x02; // 0x02
        em.set(ps, offset); // PS
        offset += ps.length;
        em[offset++] = 0x00; // 0x00
        em.set(data, offset); // M
        return this.rsa.encrypt(new BigNumber(em)).result;
    }
}


const ASN1_TYPES = {
    ELOOPN : 102,
    ELOOP : "uASN1.js Error: iterated over elements (probably a malformed file)",
    EDEEPN : 60,
    EDEEP : "uASN1.js Error: element nested  layers deep (probably a malformed file)",
    CTYPES : [0x30, 0x31, 0xa0, 0xa1],
    VTYPES : [0x01, 0x02, 0x05, 0x06, 0x0c, 0x82],
}

class ASN1 {

    _replacer(k, v) {
        if ('type' === k) {
            return '0x' + Enc.numToHex(v);
        }
        if (v && 'value' === k) {
            return '0x' + Enc.bufToHex(v.data || v);
        }
        return v;
    };

    parsePublicKey(buf) {

        function parseAsn1(buf, depth, eager) {
            if (depth.length >= ASN1_TYPES.EDEEPN) {
                throw new Error(ASN1_TYPES.EDEEP);
            }

            var index = 2; // we know, at minimum, data starts after type (0) and lengthSize (1)
            var asn1 = {type: buf[0], lengthSize: 0, length: buf[1]};
            var child;
            var iters = 0;
            var adjust = 0;
            var adjustedLen;

            // Determine how many bytes the length uses, and what it is
            if (0x80 & asn1.length) {
                asn1.lengthSize = 0x7f & asn1.length;
                // I think that buf->hex->int solves the problem of Endianness... not sure
                asn1.length = parseInt(Enc.bufToHex(buf.slice(index, index + asn1.lengthSize)), 16);
                index += asn1.lengthSize;
            }

            if (0x00 === buf[index] && (0x02 === asn1.type || 0x03 === asn1.type)) {
                // However, 0x00 on its own is a valid number
                if (asn1.length > 1) {
                    index += 1;
                    adjust = -1;
                }
            }
            adjustedLen = asn1.length + adjust;


            function parseChildren(eager) {
                asn1.children = [];
                while (iters < ASN1_TYPES.ELOOPN && index < (2 + asn1.length + asn1.lengthSize)) {
                    iters += 1;
                    depth.length += 1;
                    child = parseAsn1(buf.slice(index, index + adjustedLen), depth, eager);
                    depth.length -= 1;
                    index += (2 + child.lengthSize + child.length);
                    if (index > (2 + asn1.lengthSize + asn1.length)) {
                        if (!eager) {
                            console.error(JSON.stringify(asn1, this._replacer, 2));
                        }
                        throw new Error("Parse error: child value length (" + child.length
                            + ") is greater than remaining parent length (" + (asn1.length - index)
                            + " = " + asn1.length + " - " + index + ")");
                    }
                    asn1.children.push(child);
                }
                if (index !== (2 + asn1.lengthSize + asn1.length)) {
                    throw new Error("premature end-of-file");
                }
                if (iters >= ASN1_TYPES.ELOOPN) {
                    throw new Error(ASN1_TYPES.ELOOP);
                }

                delete asn1.value;
                return asn1;
            }

            if (-1 !== ASN1_TYPES.CTYPES.indexOf(asn1.type)) {
                return parseChildren(eager);
            }

            asn1.value = buf.slice(index, index + adjustedLen);
            if (-1 !== ASN1_TYPES.VTYPES.indexOf(asn1.type)) {
                return asn1;
            }

            try {
                return parseChildren(true);
            } catch (e) {
                asn1.children.length = 0;
                return asn1;
            }
        }
        buf = this.parseBlock(buf);
        var asn1 = parseAsn1(buf, []);
        var len = buf.byteLength || buf.length;
        if (len !== 2 + asn1.lengthSize + asn1.length) {
            throw new Error("Length of buffer does not match length of ASN.1 sequence.");
        }

        return [
            asn1.children[1].children[0].children[0].value,
            asn1.children[1].children[0].children[1].value,
        ];
    };

    parseBlock(str) {
        var der = str.split(/\n/).filter(function (line) {
            return !/-----/.test(line);
        }).join('');
        return Enc.base64ToBuf(der);
    };
}

Enc = {
    numToHex(d) {
        d = d.toString(16);
        if (d.length % 2) {
            return '0' + d;
        }
        return d;
    },

    bufToHex(u8) {
        var hex = [];
        var i, h;
        var len = (u8.byteLength || u8.length);

        for (i = 0; i < len; i += 1) {
            h = u8[i].toString(16);
            if (h.length % 2) {
                h = '0' + h;
            }
            hex.push(h);
        }

        return hex.join('').toLowerCase();
    },

    binToBuf(bin) {
        var arr = bin.split('').map(function (ch) {
            return ch.charCodeAt(0);
        });
        return 'undefined' !== typeof Uint8Array ? new Uint8Array(arr) : arr;
    },

    base64ToBuf(b64) {
        return this.binToBuf(atob(b64));
    }
};