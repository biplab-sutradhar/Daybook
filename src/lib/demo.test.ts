import { describe, expect, it } from 'vitest';

import { daysRemaining, demoExpiryLabel, expiresAtFrom, formatBytes, spotsLeft } from './demo';

describe('demo limits', () => {
  it('expires an account 7 days after signup', () => {
    expect(expiresAtFrom('2026-10-01T00:00:00.000Z')).toBe('2026-10-08T00:00:00.000Z');
  });

  it('counts whole days left', () => {
    const expiresAt = '2026-10-08T00:00:00.000Z';
    expect(daysRemaining(expiresAt, Date.parse('2026-10-06T00:00:00.000Z'))).toBe(2);
    expect(daysRemaining(expiresAt, Date.parse('2026-10-08T00:00:00.000Z'))).toBe(0);
    expect(demoExpiryLabel(expiresAt, Date.parse('2026-10-07T00:00:00.000Z'))).toBe('This account is deleted in 1 day.');
  });

  it('formats stored bytes and spots left', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(100 * 1024 * 1024)).toBe('100.0 MB');
    expect(spotsLeft({ spots_used: 10, spots_limit: 10, bytes_used: 0, bytes_limit: 1, expires_at: null })).toBe(0);
    expect(spotsLeft({ spots_used: 3, spots_limit: 10, bytes_used: 0, bytes_limit: 1, expires_at: null })).toBe(7);
  });
});
