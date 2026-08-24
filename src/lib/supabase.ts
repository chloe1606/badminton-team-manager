import { createClient } from '@supabase/supabase-js'

function normalizeEnvVar(value: string | undefined): string {
  return value?.trim() ?? ''
}

const supabaseUrl = normalizeEnvVar(import.meta.env.VITE_SUPABASE_URL)
const supabaseAnonKey = normalizeEnvVar(import.meta.env.VITE_SUPABASE_ANON_KEY)

const supabaseMissingUrlError = 'Missing VITE_SUPABASE_URL environment variable.'
const supabaseMissingAnonKeyError = 'Missing VITE_SUPABASE_ANON_KEY environment variable.'

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabaseConfigError = !supabaseUrl
  ? supabaseMissingUrlError
  : !supabaseAnonKey
    ? supabaseMissingAnonKeyError
    : null

if (supabaseConfigError) {
  console.warn(`Supabase is not configured: ${supabaseConfigError}`)
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        apikey: supabaseAnonKey,
      },
    },
  })
  : null

export function requireSupabase() {
  if (!supabase) {
    throw new Error(supabaseConfigError ?? 'Supabase is not configured.')
  }

  return supabase
}
