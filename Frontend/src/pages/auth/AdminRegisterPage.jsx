import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import RoleAuthCard from './RoleAuthCard';
import { INVITATION_KEYS } from './invitation';


export default function AdminRegisterPage() {
  const navigate = useNavigate();
  const invitationCode = useMemo(() => sessionStorage.getItem(INVITATION_KEYS.code) || '', []);
  const invitedEmail = useMemo(() => sessionStorage.getItem(INVITATION_KEYS.email) || '', []);

  useEffect(() => {
    if (sessionStorage.getItem(INVITATION_KEYS.verified) !== 'true' || !invitationCode) {
      navigate('/admin/auth', { replace: true });
    }
  }, [navigate, invitationCode]);

  const handleRegisterSuccess = () => {
    Object.values(INVITATION_KEYS).forEach((k) => sessionStorage.removeItem(k));
    navigate('/admin/auth', {
      replace: true,
      state: { message: 'Staff account created. Confirm your email from the link we sent, then sign in here.' },
    });
  };

  return (
    <RoleAuthCard
      role="admin"
      eyebrow="Invitation accepted"
      title="Create your staff account"
      subtitle={invitedEmail
        ? `Use the invited address, ${invitedEmail}. Your code works once.`
        : 'Use the email address your invitation was sent to. Your code works once.'}
      registerEnabled
      forceRegisterMode
      hideRegisterToggle
      redirectTo="/admin"
      backLinkTo="/admin/auth"
      backLinkLabel="Back to staff sign-in"
      invitationCode={invitationCode}
      defaultEmail={invitedEmail}
      onRegisterSuccess={handleRegisterSuccess}
    />
  );
}
