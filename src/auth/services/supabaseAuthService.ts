import type { Session } from '@supabase/supabase-js'
import {
  isSupabaseConfigured,
  requireSupabase,
  supabaseConfigError,
} from '../../lib/supabase'
import { mapAuthUser } from '../../lib/playerProfile'
import type { AuthService, AuthUser, LoginCredentials } from '../../types/auth'
import { getPlayerProfile } from '../../services/playerService'

async function loadUserFromSession(session: Session | null): Promise<AuthUser | null> {
  const userId = session?.user?.id
  if (!userId) {
    return null
  }

  const profile = await getPlayerProfile(userId)
  if (!profile) {
    throw new Error('No player profile exists for this authenticated user.')
  }

  return mapAuthUser(profile)
}

export const supabaseAuthService: AuthService = {
  async getCurrentUser() {
    if (!isSupabaseConfigured) {
      return null
    }

    const supabase = requireSupabase()
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error) {
      throw new Error(error.message)
    }

    return loadUserFromSession(session)
  },
  async login(credentials: LoginCredentials) {
    if (!isSupabaseConfigured) {
      throw new Error(supabaseConfigError ?? 'Supabase is not configured.')
    }

    const supabase = requireSupabase()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    })

    if (error) {
      throw new Error(error.message)
    }

    const user = await loadUserFromSession(data.session)
    if (!user) {
      throw new Error('Authentication succeeded but no player profile was found.')
    }

    return user
  },
  async logout() {
    if (!isSupabaseConfigured) {
      return
    }

    const supabase = requireSupabase()
    const { error } = await supabase.auth.signOut()

    if (error) {
      throw new Error(error.message)
    }
  },
  onAuthStateChange(callback) {
    if (!isSupabaseConfigured) {
      return { unsubscribe: () => undefined }
    }

    const supabase = requireSupabase()
    return supabase.auth.onAuthStateChange((_event, session) => {
      void loadUserFromSession(session)
        .then(callback)
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : 'Authentication sync failed.'
          throw new Error(message)
        })
    }).data.subscription
  },
}
