import { randomBytes } from 'node:crypto';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { API_KEY_PREFIX } from '@saasforge/shared';
import { hmacSha256, safeEqualHex } from '../common/crypto/crypto.util';

export class CreateApiKeyDto {
  @ApiProperty({ example: 'CI pipeline' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  projectId!: string;
}

export function generateApiKey(): { prefix: string; secret: string } {
  const prefixBody = randomBytes(4).toString('hex');
  const prefix = `${API_KEY_PREFIX}${prefixBody}`;
  const secretPart = randomBytes(32).toString('hex');
  return { prefix, secret: `${prefix}_${secretPart}` };
}

export function parseApiKeyPrefix(secret: string): string | null {
  if (!secret.startsWith(API_KEY_PREFIX)) {
    return null;
  }
  const after = secret.slice(API_KEY_PREFIX.length);
  const prefixBody = after.split('_')[0];
  if (!prefixBody || prefixBody.length !== 8) {
    return null;
  }
  return `${API_KEY_PREFIX}${prefixBody}`;
}

export function hashApiKey(pepper: string, secret: string): string {
  return hmacSha256(pepper, secret);
}

export function apiKeyMatches(pepper: string, secret: string, storedHash: string): boolean {
  return safeEqualHex(hashApiKey(pepper, secret), storedHash);
}
