import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react'
import { useAuth } from '../auth/hooks/useAuth'
import { isSupabaseConfigured, requireSupabase } from '../lib/supabase'
import {
  clearAllNotifications,
  createNotification,
  deleteNotification as deleteNotificationInDb,
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../services/notificationService'

export type NotificationType =
  | 'match_added'
  | 'player_selected'
  | 'match_time_changed'
  | 'venue_changed'
  | 'attendance_confirmed'
  | 'result_logged'
  | 'general'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: Date
  icon: string
  read: boolean
  createdAt?: string
}

interface NotificationsContextType {
  notifications: Notification[]
  unreadCount: number
  addNotification: (
    type: NotificationType,
    title: string,
    message: string,
    icon: string,
  ) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  deleteNotification: (id: string) => void
  clearNotifications: () => void
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined)

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    if (!isAuthenticated || !isSupabaseConfigured) {
      setNotifications([])
      return
    }

    let isActive = true

    listNotifications()
      .then((records) => {
        if (isActive) {
          setNotifications(
            records.map((r) => ({
              id: r.id,
              type: r.type,
              title: r.title,
              message: r.message,
              icon: r.icon,
              read: r.read,
              timestamp: new Date(r.createdAt),
              createdAt: r.createdAt,
            })),
          )
        }
      })
      .catch((error: unknown) => {
        console.error('Failed to load notifications from Supabase', error)
      })

    return () => {
      isActive = false
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated || !isSupabaseConfigured) {
      return
    }

    const supabase = requireSupabase()
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => {
          listNotifications()
            .then((records) => {
              setNotifications(
                records.map((r) => ({
                  id: r.id,
                  type: r.type,
                  title: r.title,
                  message: r.message,
                  icon: r.icon,
                  read: r.read,
                  timestamp: new Date(r.createdAt),
                  createdAt: r.createdAt,
                })),
              )
            })
            .catch((error: unknown) => {
              console.error('Failed to reload notifications from Supabase', error)
            })
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [isAuthenticated])

  const addNotification = useCallback(
    (type: NotificationType, title: string, message: string, icon: string) => {
      const tempId = `${Date.now()}-${Math.random()}`
      const now = new Date()
      const optimistic: Notification = {
        id: tempId,
        type,
        title,
        message,
        timestamp: now,
        icon,
        read: false,
      }

      setNotifications((prev: Notification[]) => [optimistic, ...prev])

      if (isSupabaseConfigured) {
        createNotification(type, title, message, icon)
          .then((record) => {
            // Replace the optimistic entry with the real DB record
            setNotifications((prev: Notification[]) =>
              prev.map((n: Notification) =>
                n.id === tempId
                  ? { ...n, id: record.id, createdAt: record.createdAt }
                  : n,
              ),
            )
          })
          .catch((error: unknown) => {
            console.error('Failed to create notification in Supabase', error)
            // Remove the optimistic entry on failure
            setNotifications((prev: Notification[]) => prev.filter((n: Notification) => n.id !== tempId))
          })
      } else {
        // Auto-remove after 10 seconds when Supabase is not configured
        setTimeout(() => {
          setNotifications((prev: Notification[]) => prev.filter((n: Notification) => n.id !== tempId))
        }, 10000)
      }
    },
    [],
  )

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev: Notification[]) =>
      prev.map((n: Notification) => (n.id === id ? { ...n, read: true } : n)),
    )
    if (isSupabaseConfigured) {
      markNotificationAsRead(id).catch((error: unknown) => {
        console.error('Failed to mark notification as read in Supabase', error)
      })
    }
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications((prev: Notification[]) => prev.map((n: Notification) => ({ ...n, read: true })))
    if (isSupabaseConfigured) {
      markAllNotificationsAsRead().catch((error: unknown) => {
        console.error('Failed to mark all notifications as read in Supabase', error)
      })
    }
  }, [])

  const deleteNotification = useCallback((id: string) => {
    setNotifications((prev: Notification[]) => prev.filter((n: Notification) => n.id !== id))
    if (isSupabaseConfigured) {
      deleteNotificationInDb(id).catch((error: unknown) => {
        console.error('Failed to delete notification in Supabase', error)
      })
    }
  }, [])

  const clearNotifications = useCallback(() => {
    setNotifications([])
    if (isSupabaseConfigured) {
      clearAllNotifications().catch((error: unknown) => {
        console.error('Failed to clear notifications in Supabase', error)
      })
    }
  }, [])

  const unreadCount = notifications.filter((n: Notification) => !n.read).length

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearNotifications,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationsContext)
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider')
  }
  return context
}
