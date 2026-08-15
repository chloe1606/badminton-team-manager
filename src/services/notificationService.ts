import { isSupabaseConfigured, requireSupabase } from '../lib/supabase'
import type { NotificationType } from '../app/NotificationsProvider'

export interface NotificationRecord {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  icon: string
  read: boolean
  createdAt: string
  updatedAt: string
}

interface SupabaseNotificationRow {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  icon: string | null
  read: boolean | null
  created_at: string | null
  updated_at: string | null
}

function rowToRecord(row: SupabaseNotificationRow): NotificationRecord {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type as NotificationType,
    title: row.title,
    message: row.message,
    icon: row.icon ?? '',
    read: row.read ?? false,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  }
}

export async function listNotifications(): Promise<NotificationRecord[]> {
  if (!isSupabaseConfigured) {
    return []
  }

  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('notifications')
    .select('id, user_id, type, title, message, icon, read, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data as SupabaseNotificationRow[]).map(rowToRecord)
}

export async function createNotification(
  type: NotificationType,
  title: string,
  message: string,
  icon: string,
): Promise<NotificationRecord> {
  const supabase = requireSupabase()

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    throw new Error('User not authenticated')
  }

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: userData.user.id,
      type,
      title,
      message,
      icon,
      read: false,
    })
    .select('id, user_id, type, title, message, icon, read, created_at, updated_at')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return rowToRecord(data as SupabaseNotificationRow)
}

export async function markNotificationAsRead(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    return
  }

  const supabase = requireSupabase()
  const { error } = await supabase
    .from('notifications')
    .update({ read: true, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}

export async function markAllNotificationsAsRead(): Promise<void> {
  if (!isSupabaseConfigured) {
    return
  }

  const supabase = requireSupabase()
  const { error } = await supabase
    .from('notifications')
    .update({ read: true, updated_at: new Date().toISOString() })
    .eq('read', false)

  if (error) {
    throw new Error(error.message)
  }
}

export async function deleteNotification(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    return
  }

  const supabase = requireSupabase()
  const { error } = await supabase.from('notifications').delete().eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}

export async function broadcastNotificationToAllUsers(
  type: NotificationType,
  title: string,
  message: string,
  icon: string,
): Promise<void> {
  const supabase = requireSupabase()

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id')

  if (profilesError) {
    throw new Error(profilesError.message)
  }

  if (!profiles || profiles.length === 0) {
    return
  }

  const rows = (profiles as { id: string }[]).map((p) => ({
    user_id: p.id,
    type,
    title,
    message,
    icon,
    read: false,
  }))

  const { error } = await supabase.from('notifications').insert(rows)

  if (error) {
    throw new Error(error.message)
  }
}

export async function clearAllNotifications(): Promise<void> {
  if (!isSupabaseConfigured) {
    return
  }

  const supabase = requireSupabase()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return
  }

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', userData.user.id)

  if (error) {
    throw new Error(error.message)
  }
}
