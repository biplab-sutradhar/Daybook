import { describe, expect, it } from 'vitest';

import { formatDbError } from './errors';

describe('formatDbError', () => {
  it('explains account and storage availability without exposing internal limits', () => {
    expect(formatDbError({ message: 'DEMO_FULL' }, 'Could not sign up.')).toBe(
      'New accounts are temporarily unavailable. Please try again later.',
    );
    expect(formatDbError({ message: 'DEMO_QUOTA' }, 'Could not save.')).toBe(
      'This workspace has reached its storage limit. Remove some content and try again.',
    );
  });

  it('does not expose automatic account cleanup details', () => {
    expect(formatDbError({ message: 'auth.users row missing' }, 'Could not load account.')).toBe(
      'That account is no longer available. Please create a new account to continue.',
    );
  });
});
