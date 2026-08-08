import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext.tsx'; 
import { ProtectedRoute } from './components/routing/ProtectedRoute';
import { AdminPanel } from './components/AdminPanel';
import { LoginCard } from './components/LoginCard';
import { useState } from 'react';
import { supabaseAuthService } from './auth/services/authServices';

// Quick layout wrapper that injects a global top navigation bar
const AppLayoutWrapper = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useAuth();

  return (
    <div>
      {user && (
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', background: '#1e293b', color: 'white' }}>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold' }}>🏸 Team Manager</span>
            <Link to="/dashboard" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Dashboard</Link>
            {user.role === 'admin' && (
              <Link to="/admin" style={{ color: '#f59e0b', textDecoration: 'none', fontWeight: 'bold' }}>⚙️ Coach Panel</Link>
            )}
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Hello, {user.name}!</span>
            <button onClick={logout} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer' }}>
              Sign Out
            </button>
          </div>
        </header>
      )}
      {children}
    </div>
  );
};


const PlayerDashboardView = () => {
  const [newPassword, setNewPassword] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      await supabaseAuthService.updatePassword(newPassword);
      setSuccess('Your private password has been saved securely!');
      setNewPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h2>👥 Player Attendance Dashboard</h2>
      <p className="muted">Welcome to the team manager platform! Your match schedules will appear here.</p>
      
      {/* Privacy Settings Box */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem', marginTop: '2rem', textAlign: 'left' }}>
        <h3 style={{ marginTop: 0 }}>🔒 Account Security Settings</h3>
        <p style={{ fontSize: '0.9rem', color: '#64748b' }}>If you are logging in for the first time, please change your temporary username password to a secure choice below.</p>
        
        <form onSubmit={handlePasswordUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
          {error && <div style={{ color: '#dc2626', backgroundColor: '#fef2f2', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem' }}>⚠️ {error}</div>}
          {success && <div style={{ color: '#16a34a', backgroundColor: '#f0fdf4', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem' }}>✅ {success}</div>}

          <div>
            <label htmlFor="new-pass" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', fontWeight: 500 }}>Create New Password</label>
            <input 
              id="new-pass" type="password" placeholder="Minimum 6 characters" 
              value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required 
              style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
            />
          </div>

          <button type="submit" disabled={isSubmitting} style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '0.6rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', alignSelf: 'flex-start' }}>
            {isSubmitting ? 'Saving...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayoutWrapper>
          <Routes>
            <Route path="/login" element={<LoginCard />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<PlayerDashboardView />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/admin" element={<AdminPanel />} />
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </AppLayoutWrapper>
      </AuthProvider>
    </BrowserRouter>
  );
}
