
const bufToHex = (buf: ArrayBuffer): string =>
    Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');

const hexToBuf = (hex: string): Uint8Array =>
    new Uint8Array(hex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));


// THIS IS NOT SECURE FOR PRODUCTION USE, just for demo purposes
// Always use well-vetted libraries for real applications

const ITERATIONS = 600000;
export async function encryptData(textToEncrypt: string, password: string) {
    const encoder = new TextEncoder();
    const data = encoder.encode(textToEncrypt);
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const baseKey = await window.crypto.subtle.importKey(
        'raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']
    );

    const key = await window.crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
    );

    const ciphertext = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        data
    );

    return {

        ciphertext: bufToHex(ciphertext),
        iv: bufToHex(iv.buffer),
        salt: bufToHex(salt.buffer)
    };
}

export async function decryptData(
    ciphertextHex: string,
    ivHex: string,
    saltHex: string,
    password: string
): Promise<string> {
    try {
        if (!ciphertextHex || !ivHex || !saltHex || !password) {
            throw new Error('Missing parameters');
        }

        const encoder = new TextEncoder();

        // 1. Convert hex to Uint8Arrays (Avoid using .buffer manually)
        const ciphertext = hexToBuf(ciphertextHex);
        const iv = hexToBuf(ivHex);
        const salt = hexToBuf(saltHex);

        // 2. Import the base key
        const baseKey = await window.crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveKey']
        );

        // 3. Re-derive the exact same key using the salt and iterations
        const key = await window.crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt as any, // Passing the Uint8Array directly
                iterations: 600000,
                hash: 'SHA-256'
            },
            baseKey,
            { name: 'AES-GCM', length: 256 },
            false,
            ['decrypt']
        );

        // 4. Decrypt (AES-GCM automatically verifies the auth tag at the end)
        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv as any },
            key,
            ciphertext as BufferSource
        );

        return new TextDecoder().decode(decryptedBuffer);

    } catch (error) {
        // Log generic error to the user, keep specifics for internal logging only
        throw new Error('Authentication failed: Invalid password or corrupted data.');
    }
}