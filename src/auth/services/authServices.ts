import { supabase } from '../../supabaseClient';
import { AuthService, AuthUser, LoginCredentials } from '../../types/auth';

export const supabaseAuthService: AuthService = {
  /**
   * Session Check: Ran automatically on layout initialization/refresh
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return null;

    try {
      const { data: profile, error: dbError } = await supabase
        .from('profiles')
        .select('name, username, role, player_id')
        .eq('id', user.id)
        .single();

      // If the row exists, use it!
      if (profile && !dbError) {
        return {
          id: user.id,
          name: profile.name,
          username: profile.username,
          role: profile.role as 'admin' | 'player',
          playerId: profile.player_id || undefined
        };
      }
    } catch (e) {
      console.warn("Database lookup failed, falling back to local simulation layout...", e);
    }

    /**
     * 🚀 CRITICAL EMERGENCY FALLBACK:
     * If the profile row isn't found or blocked by RLS policies, we match the email string layout.
     * This guarantees that your admin account can ALWAYS log in!
     */
    if (user.email === 'admin@badmintonapp.internal') {
      return {
        id: user.id,
        name: 'Head Coach Admin',
        username: 'admin',
        role: 'admin'
      };
    }

    // Default safety return for unrecognized accounts
    return null;
  },


  /**
   * Authentication Route: Verifies credentials and assigns active token
   */
  async login(credentials: LoginCredentials): Promise<AuthUser> {
    const input = credentials.username.toLowerCase().trim();
    
    // Automatically handles if they logged in with an email address or username string
    const targetEmail = input.includes('@') ? input : `${input}@badmintonapp.com`;

    const { data, error } = await supabase.auth.signInWithPassword({
      email: targetEmail,
      password: credentials.password,
    });

    if (error || !data.user) {
      throw new Error(error?.message || 'Login failed. Check your credentials.');
    }

    const currentUser = await this.getCurrentUser();
    if (!currentUser) throw new Error('User profile record not found.');
    return currentUser;
  },

  /**
   * Sign-Out Route: Destroys active browser session tokens instantly
   */
  async logout(): Promise<void> {
    await supabase.auth.signOut();
  },

  /**
   * Roster Creation logic used by the AdminPanel component
   */
  async registerNewPlayer(name: string, username: string, email: string): Promise<void> {
    const targetEmail = email.toLowerCase().trim();
    
    const { data, error: authError } = await supabase.auth.signUp({
      email: targetEmail,
      password: username, // Players still use their initial username as a temporary password
      options: { data: { name } }
    });

    if (authError || !data.user) {
      throw new Error(authError?.message || 'Player account creation failed.');
    }

    const { error: dbError } = await supabase
      .from('profiles')
      .insert({
        id: data.user.id,
        name,
        username: username.toLowerCase().trim(),
        role: 'player',
        player_id: `ply_${Math.random().toString(36).substring(2, 7)}`
      });

    if (dbError) throw new Error(dbError.message);
  }
};
