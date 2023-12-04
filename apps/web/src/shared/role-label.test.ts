import { describe, expect, it } from 'vitest';
import { roleLabel } from './role-label';

describe('roleLabel', () => {
  it('returns a human-readable role', () => {
    expect(roleLabel('DEVELOPER')).toBe('Developer');
  });
});
