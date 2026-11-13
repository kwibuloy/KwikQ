import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PublicLayout from './layout/PublicLayout';
import HomePage from './pages/HomePage';
import PatientPage from './pages/PatientPage';
import AdminPage from './pages/AdminPage';
import PatientAuthPage from './pages/PatientAuthPage';
import AdminAuthPage from './pages/AdminAuthPage';
import AdminRegisterPage from './pages/AdminRegisterPage';
import LoginPage from './pages/LoginPage';
import NotAuthorizedPage from './pages/NotAuthorizedPage';
import ProtectedRoute from './components/ProtectedRoute';
import { clearAccessToken, getAccessToken } from './services/api';
import { supabase } from './services/supabaseClient';

export default function App() {
  // Drop the stored API token if the Supabase session has gone away.
  useEffect(() => {
    let active = true;
    const sync = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!active) return;
      if ((error || !data?.session) && getAccessToken()) clearAccessToken();
    };
    sync();
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') sync();
    });
    return () => {
      active = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/not-authorized" element={<NotAuthorizedPage />} />
          <Route path="/patient/auth" element={<PatientAuthPage />} />
          <Route path="/admin/auth" element={<AdminAuthPage />} />
          <Route path="/admin/register" element={<AdminRegisterPage />} />
        </Route>
        <Route
          path="/patient"
          element={<ProtectedRoute requiredRole="patient"><PatientPage /></ProtectedRoute>}
        />
        <Route
          path="/admin"
          element={<ProtectedRoute requiredRole="admin"><AdminPage /></ProtectedRoute>}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
