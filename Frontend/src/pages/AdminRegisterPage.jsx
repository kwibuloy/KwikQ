import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import RoleAuthCard from '../components/RoleAuthCard';

const KEYS = {
  verified: 'admin_invitation_verified',
  code: 'admin_invitation_code',
  email: 'admin_invitation_email',
};

export default function AdminRegisterPage() {
  const navigate = useNavigate();
  const invitationCode = useMemo(() => sessionStorage.getItem(KEYS.code) || '', []);
  const invitedEmail = useMemo(() => sessionStorage.getItem(KEYS.email) || '', []);

  useEffect(() => {
    if (sessionStorage.getItem(KEYS.verified) !== 'true' || !invitationCode) {
      navigate('/admin/auth', { replace: true });
    }
  }, [navigate, invitationCode]);

  const handleRegisterSuccess = () => {
    Object.values(KEYS).forEach((k) => sessionStorage.removeItem(k));
    navigate('/admin/auth', { replace: true });
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
