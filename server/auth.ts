/**
 * IntervAI - Signed Authentication Tokens (HMAC-SHA256)
 * Replaces the previous unsigned Base64 token scheme.
 */

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const TOKEN_TTL_MS = 60 * 60 * 24 * 7 * 1000; // 7 days
const MIN_SECRET_LENGTH = 32;

interface ResolvedSecret {
  secret: string;
  ephemeral: boolean;
}

function resolveSecret(): ResolvedSecret {
  const isProduction = process.env.NODE_ENV === 'production';
  const configured = (process.env.AUTH_SECRET || '').trim();

  if (configured) {
    if (configured.length >= MIN_SECRET_LENGTH) {
      return { secret: configured, ephemeral: false };
    }
    console.warn(
      `[Security] AUTH_SECRET is configured but shorter than ${MIN_SECRET_LENGTH} characters. ` +
        (isProduction
          ? 'Refusing to start in production with an insecure secret.'
          : 'Falling back to an ephemeral secret; authentication tokens will be invalid after server restart.')
    );
    if (isProduction) {
      throw new Error(
        `AUTH_SECRET must be at least ${MIN_SECRET_LENGTH} characters long in production. Set a strong AUTH_SECRET and restart the server.`
      );
    }
    return { secret: randomBytes(32).toString('hex'), ephemeral: true };
  }

  const message =
    '[Security] AUTH_SECRET is not set. Using an EPHEMERAL secret - authentication tokens will be invalid after server restart. ' +
    'Set a strong AUTH_SECRET in your environment or .env.';
  if (isProduction) {
    throw new Error('AUTH_SECRET is required in production. Set a strong AUTH_SECRET and restart the server.');
  }
  console.warn(message);
  return { secret: randomBytes(32).toString('hex'), ephemeral: true };
}

const resolved = resolveSecret();
const SECRET = resolved.secret;

export function isAuthSecretEphemeral(): boolean {
  return resolved.ephemeral;
}

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  exp: number;
}

function encode(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url');
}

function decode(input: string): Buffer {
  return Buffer.from(input, 'base64url');
}

export function createAuthToken(user: { id: string; email: string; role: string }): string {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const encodedPayload = encode(JSON.stringify(payload));
  const signature = encode(createHmac('sha256', SECRET).update(encodedPayload).digest());
  return `${encodedPayload}.${signature}`;
}

export function verifyAuthToken(token: string): TokenPayload | null {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encodedPayload, suppliedSignature] = parts;

  let expectedSignature: Buffer;
  let suppliedSignatureBuf: Buffer;
  try {
    expectedSignature = createHmac('sha256', SECRET).update(encodedPayload).digest();
    suppliedSignatureBuf = decode(suppliedSignature);
  } catch {
    return null;
  }

  if (
    suppliedSignatureBuf.length !== expectedSignature.length ||
    !timingSafeEqual(suppliedSignatureBuf, expectedSignature)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(decode(encodedPayload).toString('utf-8')) as TokenPayload;
    if (!payload || typeof payload.userId !== 'string' || typeof payload.exp !== 'number') {
      return null;
    }
    if (payload.exp <= Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}