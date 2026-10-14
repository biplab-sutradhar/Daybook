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

  it('explains how to resolve database access errors during loading or saving', () => {
    const message = formatDbError({ code: '42501', message: 'permission denied for table tasks' }, 'Could not load tasks.');
    expect(message).toMatch(/cannot access this data/i);
    expect(message).toMatch(/006_portfolio_demo\.sql/);
    expect(message).toMatch(/VITE_SUPABASE_URL/);
    expect(message).not.toMatch(/rejected this save/i);
  });
});
