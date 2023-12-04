import { consumeTokenBucket } from './token-bucket';

describe('token-bucket', () => {
  it('allows up to capacity and then rejects', async () => {
    const store = new Map<string, { tokens: string; updatedAt: string }>();
    const redis = {
      eval: async (_script: string, _n: number, key: string, capacity: number) => {
        const current = store.get(String(key)) ?? { tokens: String(capacity), updatedAt: String(Date.now()) };
        let tokens = Number(current.tokens);
        const allowed = tokens >= 1 ? 1 : 0;
        if (allowed) {
          tokens -= 1;
        }
        store.set(String(key), { tokens: String(tokens), updatedAt: String(Date.now()) });
        return [allowed, String(tokens), Number(capacity)];
      },
    };

    const first = await consumeTokenBucket(redis as never, 'k', 1, 60);
    const second = await consumeTokenBucket(redis as never, 'k', 1, 60);
    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(false);
  });
});
