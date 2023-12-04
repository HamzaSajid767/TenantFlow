import { hmacSha256, randomToken } from './crypto.util';

describe('crypto.util', () => {
  it('produces deterministic hmac hashes', () => {
    expect(hmacSha256('pepper', 'key')).toBe(hmacSha256('pepper', 'key'));
    expect(hmacSha256('pepper', 'key')).not.toBe(hmacSha256('other', 'key'));
  });

  it('generates high-entropy tokens', () => {
    expect(randomToken(32)).toHaveLength(64);
    expect(randomToken()).not.toBe(randomToken());
  });
});
