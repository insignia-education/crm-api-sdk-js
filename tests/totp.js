import { createHmac } from 'crypto';

// Minimal RFC 6238 TOTP generator for integration tests — no runtime
// dependency, just enough to compute a code from a base32 secret the same
// way pragmarx/google2fa (crm-api's side) verifies it.
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(input) {
    const clean = input.toUpperCase().replace(/=+$/, '');
    let bits = '';
    for (const char of clean) {
        const val = BASE32_ALPHABET.indexOf(char);
        if (val === -1) continue;
        bits += val.toString(2).padStart(5, '0');
    }
    const bytes = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
        bytes.push(parseInt(bits.slice(i, i + 8), 2));
    }
    return Buffer.from(bytes);
}

export function totp(secret, step = 30, digits = 6, offset = 0) {
    const key = base32Decode(secret);
    const counter = Math.floor(Date.now() / 1000 / step) + offset;
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigUInt64BE(BigInt(counter));

    const hmac = createHmac('sha1', key).update(counterBuffer).digest();
    const offsetByte = hmac[hmac.length - 1] & 0xf;
    const binCode = ((hmac[offsetByte] & 0x7f) << 24)
        | ((hmac[offsetByte + 1] & 0xff) << 16)
        | ((hmac[offsetByte + 2] & 0xff) << 8)
        | (hmac[offsetByte + 3] & 0xff);

    return String(binCode % 10 ** digits).padStart(digits, '0');
}
