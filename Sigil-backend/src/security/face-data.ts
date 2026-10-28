import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ENCRYPTION_VERSION = 'v1';
const AES_GCM_IV_LENGTH = 12;

function getEncryptionKey(): Buffer {
    const key = process.env.FACE_DATA_KEY;
    if (!key || !/^[\da-fA-F]{64}$/.test(key)) {
        throw new Error('FACE_DATA_KEY must be configured as 64 hexadecimal characters (32 bytes).');
    }
    return Buffer.from(key, 'hex');
}

export function encryptFaceData(value: string): string {
    const iv = randomBytes(AES_GCM_IV_LENGTH);
    const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return [
        ENCRYPTION_VERSION,
        iv.toString('base64url'),
        cipher.getAuthTag().toString('base64url'),
        encrypted.toString('base64url'),
    ].join(':');
}

export function decryptFaceData(value: string): string {
    const [version, encodedIv, encodedTag, encodedData, ...extra] = value.split(':');
    if (version !== ENCRYPTION_VERSION || !encodedIv || !encodedTag || !encodedData || extra.length > 0) {
        throw new Error('Encrypted MFA data has an invalid format.');
    }

    const iv = Buffer.from(encodedIv, 'base64url');
    const authTag = Buffer.from(encodedTag, 'base64url');
    const encrypted = Buffer.from(encodedData, 'base64url');
    if (iv.length !== AES_GCM_IV_LENGTH || authTag.length !== 16 || encrypted.length === 0) {
        throw new Error('Encrypted MFA data has invalid cryptographic parameters.');
    }

    const decipher = createDecipheriv('aes-256-gcm', getEncryptionKey(), iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
