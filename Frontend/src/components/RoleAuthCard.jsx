import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearAccessToken, getAccessToken, getUserRole, login, register } from '../services/api';
import { Button, Field, Notice } from '../ui';
import AuthShell from '../pages/auth/AuthShell';
import s from '../pages/auth/auth.module.css';

/** Sign-in / registration form for one role. */
export default function RoleAuthCard({
  role,
  eyebrow = '',
  title,
  subtitle = '',
  registerTitle = '',
  registerSubtitle = '',
  registerEnabled = false,
  redirectTo,
  forceRegisterMode = false,
  hideRegisterToggle = false,
  backLinkTo = '/login',
  backLinkLabel = 'All sign-in options',
  onRegisterSuccess = undefined,
  footer = null,
  invitationCode = undefined,
  defaultEmail = '',
}) {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(!forceRegisterMode);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: defaultEmail, password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Already signed in with this role? Go straight to the dashboard.
  useEffect(() => {
    if (getAccessToken() && getUserRole() === role) navigate(redirectTo, { replace: true });
  }, [navigate, redirectTo, role]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      if (isLogin) {
        const result = await login(form.email, form.password);
        if (result?.role !== role) {
          clearAccessToken();
          setError(result?.role
            ? `This account is a ${result.role} account. Use the ${result.role} sign-in instead.`
            : 'We could not verify your account. Please try again.');
          return;
        }
        navigate(redirectTo, { replace: true });
        return;
      }
      await register({ ...form, role, invitationCode });
      onRegisterSuccess?.();
      setMessage('Account created. Check your inbox to confirm your email, then sign in.');
      if (!forceRegisterMode) setIsLogin(true);
      setForm((f) => ({ ...f, password: '' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const showRegister = !isLogin && registerEnabled;

  return (
    <AuthShell
      eyebrow={eyebrow}
      title={!isLogin && registerTitle ? registerTitle : title}
      subtitle={!isLogin && registerSubtitle ? registerSubtitle : subtitle}
      back={{ to: backLinkTo, label: backLinkLabel }}
    >
      <form onSubmit={onSubmit} className={s.form} noValidate={false}>
        {showRegister && (
          <div className={s.row2}>
            <Field label="First name" value={form.firstName} onChange={set('firstName')} required autoComplete="given-name" />
            <Field label="Last name" value={form.lastName} onChange={set('lastName')} required autoComplete="family-name" />
          </div>
        )}
        <Field label="Email" type="email" value={form.email} onChange={set('email')} required autoComplete="email" />
        <Field
          label="Password"
          type="password"
          value={form.password}
          onChange={set('password')}
          required
          minLength={6}
          autoComplete={isLogin ? 'current-password' : 'new-password'}
          hint={showRegister ? 'At least 6 characters.' : undefined}
        />
        {error && <Notice kind="error">{error}</Notice>}
        {message && <Notice kind="success">{message}</Notice>}
        <Button type="submit" size="lg" block loading={loading}>
          {isLogin ? 'Sign in' : 'Create account'}
        </Button>
      </form>

      {registerEnabled && !hideRegisterToggle && (
        <button
          type="button"
          className={s.switch}
          onClick={() => { setIsLogin((v) => !v); setError(''); setMessage(''); }}
        >
          {isLogin ? 'New here? Create a patient account' : 'Already have an account? Sign in'}
        </button>
      )}

      {footer}
    </AuthShell>
  );
}
