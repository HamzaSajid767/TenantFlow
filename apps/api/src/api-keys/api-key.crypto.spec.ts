import { hmacSha256 } from '../common/crypto/crypto.util';
import { generateApiKey, hashApiKey, parseApiKeyPrefix } from './api-key.crypto';

describe('api-key.crypto', () => {
  it('generates a parseable secret', () => {
    const generated = generateApiKey();
    expect(generated.secret.startsWith(`${generated.prefix}_`)).toBe(true);
    expect(parseApiKeyPrefix(generated.secret)).toBe(generated.prefix);
  });

  it('rejects malformed keys', () => {
    expect(parseApiKeyPrefix('not-a-key')).toBeNull();
    expect(parseApiKeyPrefix('sk_live_short_abc')).toBeNull();
  });

  it('hashes with hmac', () => {
    expect(hashApiKey('pepper', 'secret')).toBe(hmacSha256('pepper', 'secret'));
    expect(hashApiKey('pepper', 'secret')).toHaveLength(64);
  });
});
