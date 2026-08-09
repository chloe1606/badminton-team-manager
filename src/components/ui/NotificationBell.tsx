import { useRef, useState } from 'react'
import { useNotifications } from '../../app/NotificationsProvider'

export function NotificationBell() {
  const { notifications, unreadCount, markAllAsRead, deleteNotification } =
    useNotifications()
  const [isOpen, setIsOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const getIconForType = (type: string): string => {
    const icons: Record<string, string> = {
      match_added: '🏸',
      player_selected: '👤',
      match_time_changed: '🕐',
      venue_changed: '📍',
      attendance_confirmed: '✅',
      result_logged: '📊',
      general: '📢',
    }
    return icons[type] || '🔔'
  }

  return (
    <div className="notification-bell-container">
      <button
        className="notification-bell"
        onClick={() => {
          setIsOpen(!isOpen)
          if (!isOpen) {
            markAllAsRead()
          }
        }}
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        🔔
        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
      </button>

      {isOpen && (
        <>
          <div className="notification-overlay" onClick={() => setIsOpen(false)} />
          <div className="notification-panel" ref={panelRef}>
            <div className="notification-panel-header">
              <h3>Notifications</h3>
              {notifications.length > 0 && (
                <button
                  className="clear-button"
                  onClick={() => {
                    notifications.forEach((n) => deleteNotification(n.id))
                  }}
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="notification-list">
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <div key={notification.id} className="notification-item">
                    <span className="notification-icon">{getIconForType(notification.type)}</span>
                    <div className="notification-content">
                      <p className="notification-title">{notification.title}</p>
                      <p className="notification-message">{notification.message}</p>
                      <p className="notification-time">
                        {new Date(notification.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                    <button
                      className="notification-close"
                      onClick={() => deleteNotification(notification.id)}
                      aria-label="Close notification"
                    >
                      ×
                    </button>
                  </div>
                ))
              ) : (
                <p className="notification-empty">No notifications</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
