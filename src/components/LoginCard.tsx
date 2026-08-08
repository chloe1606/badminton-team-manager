import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.tsx';

export const LoginCard = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // 1. Fire credentials over to the live Supabase Auth Engine
      await login({ username, password });
      
      // 2. Direct user straight to their landing dashboard page on success
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-layout" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '1rem' }}>
      <div className="card auth-card" style={{ maxWidth: '400px', width: '100%', padding: '2rem', border: '1px solid var(--color-border)', borderRadius: '8px', background: 'var(--color-surface)' }}>
        
        {/* Responsive Heading Layer */}
        <h2 id="login-heading" className="auth-title" style={{ fontSize: 'clamp(1.15rem, 4vw, 1.45rem)', textAlign: 'center', margin: '0 0 0.5rem 0' }}>
          🏸 Badminton Team Manager
        </h2>
        <p className="muted" style={{ textAlign: 'center', color: '#666', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Sign in to access team planning and attendance tools.
        </p>
        
        <form onSubmit={handleSubmit} className="stack" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && (
            <div className="alert alert-error" style={{ color: '#dc2626', backgroundColor: '#fef2f2', padding: '0.75rem', borderRadius: '4px', fontSize: '0.85rem', border: '1px solid #fee2e2' }}>
              ⚠️ {error}
            </div>
          )}
          
          <div>
            <label htmlFor="username" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', fontWeight: 500 }}>Username</label>
            <input 
              id="username"
              type="text" 
              placeholder="Enter your username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required 
              style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label htmlFor="password" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', fontWeight: 500 }}>Password</label>
            <input 
              id="password"
              type="password" 
              placeholder="Enter your password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
              style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
            />
          </div>
          
          <button 
            type="submit" 
            disabled={isSubmitting}
            style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '0.75rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginTop: '0.5rem' }}
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Local Admin Roster Seed Display */}
        <div className="stack stack-tight muted" style={{ fontSize: '0.85rem', marginTop: '1.5rem', borderTop: '1px dashed #ddd', paddingTop: '1rem', textAlign: 'center', color: '#666' }}>
          <p style={{ margin: 0 }}>
            <strong>Admin Seed Account:</strong> admin / admin123
          </p>
        </div>
      </div>
    </main>
  );
};