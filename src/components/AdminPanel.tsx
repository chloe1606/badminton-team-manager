import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { supabaseAuthService } from '../auth/services/authServices';

interface PlayerProfile {
  id: string;
  name: string;
  username: string;
  player_id: string;
}

export const AdminPanel: React.FC = () => {
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState(''); // Live tracking state for real emails
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pulls your live player roster records directly from the database table
  const fetchRoster = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('id, name, username, player_id')
        .eq('role', 'player');
        
      if (fetchError) throw fetchError;
      if (data) setPlayers(data as PlayerProfile[]);
    } catch (err: any) {
      console.error('Error fetching roster records:', err.message);
    }
  };

  useEffect(() => { 
    fetchRoster(); 
  }, []);

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      // Fires all 3 explicit data arguments down to the updated backend logic stream
      await supabaseAuthService.registerNewPlayer(name, username, email);
      
      setSuccess(`Success! Player "${name}" added. Default login password is the username: ${username}`);
      setName('');
      setUsername('');
      setEmail(''); // Resets the email input layout canvas
      
      fetchRoster(); // Reload the list instantly
    } catch (err: any) {
      setError(err.message || 'Could not register new team member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="admin-container">
      <header className="admin-header" style={{ marginBottom: '2rem' }}>
        <h1>⚙️ Coach Control Panel</h1>
        <p className="muted" style={{ color: '#666' }}>Manage your complete badminton roster metrics and player accounts.</p>
      </header>

      <section className="admin-grid" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        {/* Left Side: Creation Box */}
        <div className="card form-card" style={{ flex: '1 1 450px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '1.5rem' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>🏸 Add New Team Member</h3>
          <form onSubmit={handleAddPlayer} className="stack" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {error && <div className="alert alert-error" style={{ color: '#dc2626', backgroundColor: '#fef2f2', padding: '0.75rem', borderRadius: '4px', fontSize: '0.85rem', border: '1px solid #fee2e2' }}>⚠️ {error}</div>}
            {success && <div className="alert alert-success" style={{ color: '#16a34a', backgroundColor: '#f0fdf4', padding: '0.75rem', borderRadius: '4px', fontSize: '0.85rem', border: '1px solid #dcfce7' }}>✅ {success}</div>}

            <div>
              <label htmlFor="p-name" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', fontWeight: 500 }}>Full Name</label>
              <input 
                id="p-name" type="text" placeholder="e.g. John Doe"
                value={name} onChange={(e) => setName(e.target.value)} required 
                style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label htmlFor="p-user" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', fontWeight: 500 }}>System Username (Login Field)</label>
              <input 
                id="p-user" type="text" placeholder="e.g. jdoe22"
                value={username} onChange={(e) => setUsername(e.target.value)} required 
                style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label htmlFor="p-email" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', fontWeight: 500 }}>Real Email Address</label>
              <input 
                id="p-email" type="email" placeholder="e.g. player@gmail.com"
                value={email} onChange={(e) => setEmail(e.target.value)} required 
                style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              />
            </div>

            <button type="submit" disabled={isSubmitting} style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '0.75rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginTop: '0.5rem' }}>
              {isSubmitting ? 'Creating Profile...' : 'Register Player Profile'}
            </button>
          </form>
        </div>

        {/* Right Side: Active Player Roster */}
        <div className="card roster-card" style={{ flex: '1 1 450px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '1.5rem' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>👥 Active Team Roster ({players.length})</h3>
          <div className="roster-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto' }}>
            {players.length === 0 ? (
              <p className="muted" style={{ color: '#666' }}>No players added to the roster yet.</p>
            ) : (
              players.map((p) => (
                <div key={p.id} className="roster-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
                  <div>
                    <strong>{p.name}</strong>
                    <div className="muted" style={{ fontSize: '0.85rem', color: '#666' }}>@{p.username}</div>
                  </div>
                  <span className="badge-tag" style={{ background: '#e2e8f0', padding: '0.25rem 0.5rem', fontSize: '0.8rem', fontFamily: 'monospace', borderRadius: '4px' }}>{p.player_id}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
};
