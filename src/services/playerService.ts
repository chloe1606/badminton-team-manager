import { isSupabaseConfigured, requireSupabase, supabaseConfigError } from '../lib/supabase'
import { mapPlayerProfile } from '../lib/playerProfile'
import type { PlayerProfile } from '../types/players'

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
  gender?: 'lady' | 'man'
}

export async function listPlayerProfiles(): Promise<PlayerProfile[]> {
  if (!isSupabaseConfigured) {
    return []
  }

  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, name, username, role, player_id, gender')
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
    .select('id, email, name, username, role, player_id, gender')
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
      email: input.email,
      fullName: input.fullName,
      firstName: input.firstName,
      role: input.role,
      gender: input.gender ?? null,
    },
  })

  if (error) {
    throw new Error(error.message)
  }
}
