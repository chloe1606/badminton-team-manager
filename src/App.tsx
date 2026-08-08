import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext.tsx'; 
import { ProtectedRoute } from './components/routing/ProtectedRoute';
import { AdminPanel } from './components/AdminPanel';
import { LoginCard } from './components/LoginCard';

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

const PlayerDashboardView = () => (
  <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
    <h2>👥 Player Attendance Dashboard Placeholder</h2>
    <p>Welcome, Team Member! Your match schedules and rankings will show here.</p>
  </div>
);

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
