import { createContext, ReactNode, useCallback, useContext, useState } from 'react'

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
  const [notifications, setNotifications] = useState<Notification[]>([])

  const addNotification = useCallback(
    (type: NotificationType, title: string, message: string, icon: string) => {
      const id = `${Date.now()}-${Math.random()}`
      const notification: Notification = {
        id,
        type,
        title,
        message,
        timestamp: new Date(),
        icon,
        read: false,
      }

      setNotifications((prev) => [notification, ...prev])

      // Auto-remove after 10 seconds if not in focus
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id))
      }, 10000)
    },
    [],
  )

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    )
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const deleteNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const clearNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

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
