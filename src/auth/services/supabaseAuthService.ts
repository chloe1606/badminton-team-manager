import type { Session } from '@supabase/supabase-js'
import {
  isSupabaseConfigured,
  requireSupabase,
  supabaseConfigError,
} from '../../lib/supabase'
import { mapAuthUser } from '../../lib/playerProfile'
import type { AuthService, AuthUser } from '../../types/auth'
import { getPlayerProfile } from '../../services/playerService'

function mapAuthErrorMessage(message: string): string {
  const normalizedMessage = message.toLowerCase()

  if (normalizedMessage.includes('invalid login credentials')) {
    return 'Incorrect email or password. If this is your first login, complete account setup from your invite email first.'
  }

  if (normalizedMessage.includes('email not confirmed')) {
    return 'Your email is not confirmed yet. Use the confirmation link from your inbox, then try again.'
  }

  return message
}

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
  async login(credentials: { email: string; password: string }) {
    if (!isSupabaseConfigured) {
      throw new Error(supabaseConfigError ?? 'Supabase is not configured.')
    }

    const supabase = requireSupabase()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    })

    if (error) {
      throw new Error(mapAuthErrorMessage(error.message))
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
