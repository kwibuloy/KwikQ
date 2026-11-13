import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { ConfirmDialog, ErrorState, Field, Notice } from '../ui';
import DoctorGrid from '../pages/patient/DoctorGrid';

vi.mock('../services/supabaseClient', () => ({
  supabase: { auth: { signOut: vi.fn(() => Promise.resolve()) } },
}));

const api = await import('../services/api');

describe('API error states', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('turns a network failure into a friendly message with status 0', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))));
    await expect(api.getDoctors()).rejects.toMatchObject({ status: 0, message: expect.stringMatching(/can’t reach kwikq|offline/i) });
  });

  it('signs out and explains why when a signed-in request gets 401', async () => {
    localStorage.setItem('access_token', 'old');
    localStorage.setItem('user_role', 'patient');
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify({ error: 'Invalid token.' }), { status: 401 }))));
    await expect(api.getQueueHistory()).rejects.toMatchObject({ status: 401 });
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(api.takeSignOutReason()).toMatch(/session expired/i);
    expect(api.takeSignOutReason()).toBeNull(); // shown once
  });

  it('does not invent a session-expired message for signed-out requests', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify({ error: 'Invalid or expired invitation code' }), { status: 403 }))));
    await expect(api.validateInvitationCode('X')).rejects.toThrow('Invalid or expired invitation code');
    expect(api.takeSignOutReason()).toBeNull();
  });

  it('gives a clear message for rate limiting without a body', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('', { status: 429 }))));
    await expect(api.getDoctors()).rejects.toThrow(/too many attempts/i);
  });
});

describe('UI state primitives', () => {
  it('success notices dismiss themselves; errors stay', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    const onDismissError = vi.fn();
    render(<><Notice kind="success" onDismiss={onDismiss}>Saved</Notice><Notice kind="error" onDismiss={onDismissError}>Broke</Notice></>);
    act(() => { vi.advanceTimersByTime(6500); });
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onDismissError).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('password fields can be revealed and hidden', () => {
    render(<Field label="Password" type="password" />);
    const input = screen.getByLabelText('Password', { selector: 'input' });
    expect(input).toHaveAttribute('type', 'password');
    fireEvent.click(screen.getByRole('button', { name: /show password/i }));
    expect(input).toHaveAttribute('type', 'text');
    fireEvent.click(screen.getByRole('button', { name: /hide password/i }));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('error state offers a retry', async () => {
    const onRetry = vi.fn(() => Promise.resolve());
    render(<ErrorState title="Couldn’t load doctors" onRetry={onRetry}>Offline</ErrorState>);
    expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t load doctors');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(onRetry).toHaveBeenCalled());
  });

  it('confirm dialog runs the action only on confirm', async () => {
    const onConfirm = vi.fn(() => Promise.resolve());
    const onCancel = vi.fn();
    render(<ConfirmDialog title="Close this queue?" confirmLabel="Close queue" danger onConfirm={onConfirm} onCancel={onCancel}>3 patients</ConfirmDialog>);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Close queue' }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
  });
});

describe('DoctorGrid', () => {
  const doctors = [
    { doctor_id: 1, doctor_name: 'Ana Reyes', specialization: 'GP', is_available: true, current_queue_length: 2 },
    { doctor_id: 2, doctor_name: 'Ben Ong', specialization: 'ENT', is_available: false, current_queue_length: 0 },
  ];

  it('lets patients join available doctors only', () => {
    const onPick = vi.fn();
    render(<DoctorGrid doctors={doctors} filter="" onPick={onPick} />);
    fireEvent.click(screen.getByRole('button', { name: /Ana Reyes.*Join queue/ }));
    expect(onPick).toHaveBeenCalledWith(doctors[0]);
    expect(screen.getByRole('button', { name: /Ben Ong.*Not accepting/ })).toBeDisabled();
  });

  it('blocks joining while the patient already holds a ticket', () => {
    render(<DoctorGrid doctors={doctors} filter="" onPick={vi.fn()} blocked />);
    expect(screen.getByRole('button', { name: /Ana Reyes.*already hold a ticket/ })).toBeDisabled();
  });
});
