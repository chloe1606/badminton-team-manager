import { supabase } from '../lib/supabase'
import { mapPlayerProfile } from '../lib/playerProfile'
import type { PlayerProfile } from '../types/players'

export interface CreatePlayerInput {
  email: string
  fullName: string
  firstName: string
  role: 'admin' | 'player'
  gender?: 'lady' | 'man'
}

export async function listPlayerProfiles(): Promise<PlayerProfile[]> {
  const { data, error } = await supabase
    .from('player_profiles')
    .select('id, email, full_name, first_name, role, gender')
    .order('full_name', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data.map(mapPlayerProfile)
}

export async function getPlayerProfile(userId: string): Promise<PlayerProfile | null> {
  const { data, error } = await supabase
    .from('player_profiles')
    .select('id, email, full_name, first_name, role, gender')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data ? mapPlayerProfile(data) : null
}

export async function createInvitedPlayer(input: CreatePlayerInput): Promise<void> {
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
