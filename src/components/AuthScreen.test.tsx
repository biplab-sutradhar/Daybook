/** @vitest-environment jsdom */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LoginScreen } from './AuthScreen';

describe('LoginScreen', () => {
  it('keeps account restrictions out of the sign-in screen', () => {
    render(<LoginScreen onSignIn={async () => undefined} onSignUp={async () => undefined} />);
    expect(screen.queryByText(/portfolio demo|10 accounts|100 MB|deleted.*7 days/i)).toBeNull();
  });

  it('requires matching passwords before creating an account', async () => {
    const onSignUp = vi.fn(async () => undefined);
    render(<LoginScreen onSignIn={async () => undefined} onSignUp={onSignUp} />);
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'visitor@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret1' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'different1' } });
    fireEvent.submit(screen.getByLabelText('Email address').closest('form')!);

    expect((await screen.findByRole('alert')).textContent).toMatch(/passwords don’t match/i);
    expect(onSignUp).not.toHaveBeenCalled();
  });

  it('creates an account with the confirmed password', async () => {
    const onSignUp = vi.fn(async () => undefined);
    render(<LoginScreen onSignIn={async () => undefined} onSignUp={onSignUp} />);
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'visitor@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret1' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'secret1' } });
    fireEvent.submit(screen.getByLabelText('Email address').closest('form')!);

    expect(onSignUp).toHaveBeenCalledWith('visitor@example.com', 'secret1');
  });
});
