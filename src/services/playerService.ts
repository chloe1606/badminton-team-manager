import { isSupabaseConfigured, requireSupabase, supabaseConfigError } from '../lib/supabase'
import { mapPlayerProfile } from '../lib/playerProfile'
import type { PlayerProfile } from '../types/players'

async function mapInviteFunctionError(error: unknown): Promise<string> {
  const message = error instanceof Error ? error.message : 'Unable to call invite-user function.'
  const normalized = message.toLowerCase()

  const maybeContext =
    typeof error === 'object' && error !== null && 'context' in error
      ? (error as { context?: unknown }).context
      : undefined

  if (maybeContext instanceof Response) {
    const status = maybeContext.status

    let details = ''
    try {
      const responseBody = await maybeContext.clone().json()
      if (typeof responseBody === 'object' && responseBody !== null && 'error' in responseBody) {
        const responseError = (responseBody as { error?: unknown }).error
        details = typeof responseError === 'string' ? responseError : ''
      }
    } catch {
      // Ignore payload parse failures and fall back to status-based messaging.
    }

    if (status === 401) {
      return details || 'invite-user rejected the request: unauthorized (401). Log in again and retry.'
    }

    if (status === 403) {
      return details || 'invite-user rejected the request: forbidden (403). Confirm your account has admin role.'
    }

    if (status === 404) {
      return details || 'invite-user function was not found (404). Deploy the function in Supabase.'
    }

    if (status >= 500) {
      return details || `invite-user failed in Supabase (${status}). Check Edge Function logs for details.`
    }

    if (details) {
      return details
    }
  }

  if (
    normalized.includes('failed to send a request to the edge function') ||
    normalized.includes('failed to fetch')
  ) {
    return 'Could not reach Supabase Edge Function invite-user. Check that the function is deployed, enabled, and your project URL/keys are correct.'
  }

  return message
}

function isMissingPlayerProfilesTable(message: string): boolean {
  const normalized = message.toLowerCase()
  return (
    normalized.includes("could not find the table 'public.player_profiles'") ||
    normalized.includes('relation "player_profiles" does not exist') ||
    normalized.includes("could not find the table 'public.profile'") ||
    normalized.includes('relation "profile" does not exist') ||
    normalized.includes("could not find the table 'public.profiles'") ||
    normalized.includes('relation "profiles" does not exist')
  )
}

export interface CreatePlayerInput {
  email: string
  fullName: string
  firstName: string
  role: 'admin' | 'player'
  temporaryPassword: string
  gender?: 'lady' | 'man'
}

export async function listPlayerProfiles(): Promise<PlayerProfile[]> {
  if (!isSupabaseConfigured) {
    return []
  }

  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, name, username, role, player_id, gender, notify_by_email')
    .order('name', { ascending: true })

  if (error) {
    if (isMissingPlayerProfilesTable(error.message)) {
      return []
    }

    throw new Error(error.message)
  }

  return data.map(mapPlayerProfile)
}

export async function getPlayerProfile(userId: string): Promise<PlayerProfile | null> {
  if (!isSupabaseConfigured) {
    return null
  }

  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, name, username, role, player_id, gender, notify_by_email')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    if (isMissingPlayerProfilesTable(error.message)) {
      return null
    }

    throw new Error(error.message)
  }

  return data ? mapPlayerProfile(data) : null
}

export async function createInvitedPlayer(input: CreatePlayerInput): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error(supabaseConfigError ?? 'Supabase is not configured.')
  }

  const supabase = requireSupabase()
  const { error } = await supabase.functions.invoke('invite-user', {
    body: {
      setupMode: 'temporary_password',
      email: input.email,
      fullName: input.fullName,
      firstName: input.firstName,
      role: input.role,
      temporaryPassword: input.temporaryPassword,
      gender: input.gender ?? null,
    },
  })

  if (error) {
    throw new Error(await mapInviteFunctionError(error))
  }
}

export async function updateUserRole(userId: string, role: 'admin' | 'player'): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error(supabaseConfigError ?? 'Supabase is not configured.')
  }

  const supabase = requireSupabase()
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)

  if (error) {
    throw new Error(error.message)
  }
}

export async function updateUserNotificationPreference(
  userId: string,
  notifyByEmail: boolean,
): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error(supabaseConfigError ?? 'Supabase is not configured.')
  }

  const supabase = requireSupabase()
  const { error } = await supabase
    .from('profiles')
    .update({ notify_by_email: notifyByEmail })
    .eq('id', userId)

  if (error) {
    throw new Error(error.message)
  }
}

export async function deleteUserProfile(userId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error(supabaseConfigError ?? 'Supabase is not configured.')
  }

  const supabase = requireSupabase()
  // Delete the profile row; the auth.users record is handled by calling the delete-user Edge Function.
  const { error } = await supabase.functions.invoke('delete-user', {
    body: { userId },
  })

  if (error) {
    // Fall back to profile-only deletion if the Edge Function is not deployed
    const profileDelete = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (profileDelete.error) {
      throw new Error(
        `Failed to delete user. Edge Function error: ${error.message}. ` +
        `Profile delete error: ${profileDelete.error.message}`
      )
    }
  }
}
