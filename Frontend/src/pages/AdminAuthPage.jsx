import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RoleAuthCard from '../components/RoleAuthCard';
import { validateInvitationCode } from '../services/api';
import { Button, Field, Notice } from '../ui';
import s from './auth/auth.module.css';

const INVITATION_KEYS = {
  verified: 'admin_invitation_verified',
  code: 'admin_invitation_code',
  email: 'admin_invitation_email',
};

function InvitationForm() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const trimmed = code.trim();
      const result = await validateInvitationCode(trimmed);
      sessionStorage.setItem(INVITATION_KEYS.code, trimmed);
      sessionStorage.setItem(INVITATION_KEYS.verified, 'true');
      if (result?.email) sessionStorage.setItem(INVITATION_KEYS.email, result.email);
      navigate('/admin/register', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className={s.divider}>Got an invitation?</div>
      <form onSubmit={submit} className={s.form}>
        <Field
          label="Invitation code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
          autoComplete="off"
          spellCheck={false}
          hint="The 12-character code from your invitation email."
        />
        {error && <Notice kind="error">{error}</Notice>}
        <Button type="submit" variant="secondary" block loading={busy}>Continue to registration</Button>
      </form>
    </>
  );
}

export default function AdminAuthPage() {
  return (
    <RoleAuthCard
      role="admin"
      eyebrow="Clinic staff"
      title="Staff sign-in"
      subtitle="Use the email and password from your admin account."
      redirectTo="/admin"
      footer={<InvitationForm />}
    />
  );
}
