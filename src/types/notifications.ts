export type NotificationType =
  | 'match_added'
  | 'player_selected'
  | 'match_time_changed'
  | 'venue_changed'
  | 'attendance_confirmed'
  | 'result_logged'
  | 'player_login'
  | 'general'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: Date
  icon: string
  read: boolean
  // For persistent notifications from database
  persistedId?: string
  recipientId?: string
  createdAt?: string
  updatedAt?: string
}

export interface DatabaseNotification {
  id: string
  recipient_id: string
  type: NotificationType
  title: string
  message: string
  icon: string
  read: boolean
  created_at: string
  updated_at: string
}
