import 'server-only';

/**
 * Cifrado en reposo de los tokens OAuth de los vendedores (AES-256-GCM).
 * Con estos tokens se opera sobre el dinero de un tercero, así que se guardan
 * SIEMPRE cifrados y NUNCA se loguean (CLAUDE.md §9 · Prompt 10B).
 *
 * Formato del ciphertext: `v1:<iv_b64>:<tag_b64>:<data_b64>`. El prefijo de
 * versión permite rotar el esquema a futuro sin ambigüedad.
 *
 * La clave (`RESSY_MP_TOKEN_KEY`) es de 32 bytes, en base64 o hex. Se resuelve
 * de forma perezosa para no reventar el build cuando la feature está apagada.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const VERSION = 'v1';
const ALGO = 'aes-256-gcm';
const IV_BYTES = 12; // GCM estándar
const KEY_BYTES = 32;

function loadKey(): Buffer {
  const raw = process.env.RESSY_MP_TOKEN_KEY;
  if (!raw) {
    throw new Error('Falta RESSY_MP_TOKEN_KEY (clave AES-256 para cifrar tokens de MP).');
  }
  // Acepta base64 (44 chars con padding) o hex (64 chars).
  const key = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
  if (key.length !== KEY_BYTES) {
    throw new Error(`RESSY_MP_TOKEN_KEY debe ser de 32 bytes (256 bits); recibí ${key.length}.`);
  }
  return key;
}

/** ¿Hay clave configurada? (sin lanzar). Útil para deshabilitar la feature. */
export function isTokenCryptoConfigured(): boolean {
  const raw = process.env.RESSY_MP_TOKEN_KEY;
  if (!raw) return false;
  try {
    loadKey();
    return true;
  } catch {
    return false;
  }
}

export function encryptToken(plaintext: string): string {
  const key = loadKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const data = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VERSION}:${iv.toString('base64')}:${tag.toString('base64')}:${data.toString('base64')}`;
}

export function decryptToken(payload: string): string {
  const parts = payload.split(':');
  const [version, ivB64, tagB64, dataB64] = parts;
  if (parts.length !== 4 || version !== VERSION || !ivB64 || !tagB64 || !dataB64) {
    throw new Error('Token cifrado con formato inválido o versión desconocida.');
  }
  const key = loadKey();
  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
}
