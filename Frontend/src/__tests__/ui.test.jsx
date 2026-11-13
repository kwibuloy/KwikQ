import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { Field, StatusPill, TicketStub, Modal } from '../ui';
import QueueTable from '../pages/admin/QueueTable';

vi.mock('../services/supabaseClient', () => ({
  supabase: { auth: { signOut: vi.fn(() => Promise.resolve()) } },
}));

describe('ui primitives', () => {
  it('StatusPill shows a readable label for queue states', () => {
    render(<StatusPill status="in-consultation" />);
    expect(screen.getByText('In consultation')).toBeInTheDocument();
  });

  it('TicketStub exposes the number to assistive tech', () => {
    render(<TicketStub number={12} />);
    expect(screen.getByLabelText('Ticket 12')).toBeInTheDocument();
  });

  it('Field links its label to the input', () => {
    render(<Field label="Email" type="email" hint="We never share it" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAccessibleDescription('We never share it');
  });

  it('Modal is a labelled dialog that closes on Escape', () => {
    const onClose = vi.fn();
    render(<Modal title="Add a doctor" onClose={onClose}><p>body</p></Modal>);
    expect(screen.getByRole('dialog', { name: 'Add a doctor' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});

describe('QueueTable', () => {
  const queue = [
    { queue_id: 'a', ticket_number: 3, patient_name: 'Ana Cruz', status: 'called', arrival_time: '09:10 AM' },
    { queue_id: 'b', ticket_number: 4, patient_name: 'Ben Lim', status: 'in-consultation', arrival_time: '09:12 AM' },
    { queue_id: 'c', ticket_number: 5, patient_name: 'Cy Tan', status: 'waiting', arrival_time: '09:15 AM' },
  ];

  it('offers the right action per status and filters by search', async () => {
    const onStart = vi.fn();
    const { rerender } = render(<QueueTable queue={queue} onStart={onStart} onComplete={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Start session' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark served' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start session' }));
    await waitFor(() => expect(onStart).toHaveBeenCalledWith('a'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Start session' })).not.toBeDisabled());

    rerender(<QueueTable queue={queue} onStart={onStart} onComplete={vi.fn()} filter="ben" />);
    expect(screen.queryByText('Ana Cruz')).not.toBeInTheDocument();
    expect(screen.getByText('Ben Lim')).toBeInTheDocument();
  });

  it('shows an empty state with no patients', () => {
    render(<QueueTable queue={[]} onStart={vi.fn()} onComplete={vi.fn()} />);
    expect(screen.getByText('Nobody in line')).toBeInTheDocument();
  });
});

describe('ProtectedRoute', async () => {
  const { default: ProtectedRoute } = await import('../components/ProtectedRoute');
  const renderAt = () =>
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><p>admin area</p></ProtectedRoute>} />
          <Route path="/admin/auth" element={<p>staff sign-in</p>} />
          <Route path="/not-authorized" element={<p>not authorized</p>} />
        </Routes>
      </MemoryRouter>,
    );

  it('sends signed-out users to sign-in', () => {
    renderAt();
    expect(screen.getByText('staff sign-in')).toBeInTheDocument();
  });

  it('keeps patients out of the admin area', () => {
    localStorage.setItem('access_token', 't');
    localStorage.setItem('user_role', 'patient');
    renderAt();
    expect(screen.getByText('not authorized')).toBeInTheDocument();
  });

  it('lets admins in', () => {
    localStorage.setItem('access_token', 't');
    localStorage.setItem('user_role', 'admin');
    renderAt();
    expect(screen.getByText('admin area')).toBeInTheDocument();
  });
});
