import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { useAuth } from '../../hooks/useAuth'
import notificationService from '../../services/notification.service'
import { announcementsService, socketService } from '../../services'
import { onNotificationCreated, offNotificationCreated } from '../../services/socket.service'
import GlassCard from '../../components/ui/GlassCard'

export default function Notifications() {
  const { language } = useLanguage()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('notifications')
  const [notifications, setNotifications] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await notificationService.getAll({ limit: 50 })
      if (response.success) {
        setNotifications(response.data || [])
        const unread = (response.data || []).filter(n => !n.is_read).length
        setUnreadCount(unread)
      }
    } catch (err) {
      console.error('Error fetching notifications:', err)
    }
  }, [])

  const fetchAnnouncements = useCallback(async () => {
    try {
      const response = await announcementsService.getFeed({ limit: 50 })
      if (response.success) {
        const sorted = (response.data || []).sort((a, b) => {
          const aDate = new Date(a.created_at || a.createdAt || 0).getTime()
          const bDate = new Date(b.created_at || b.createdAt || 0).getTime()
          return bDate - aDate
        })
        setAnnouncements(sorted)
      }
    } catch (err) {
      console.error('Error fetching announcements:', err)
    }
  }, [])

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      await Promise.all([fetchNotifications(), fetchAnnouncements()])
      setLoading(false)
    }
    fetchAll()
  }, [fetchNotifications, fetchAnnouncements])

  // Real-time listeners
  useEffect(() => {
    if (!user) return

    socketService.initSocket(user)

    onNotificationCreated(() => fetchNotifications())
    socketService.onAnnouncementCreated(() => fetchAnnouncements())

    return () => {
      offNotificationCreated()
      socketService.offAnnouncementCreated()
    }
  }, [user, fetchNotifications, fetchAnnouncements])

  const handleMarkAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id)
      setNotifications(prev => prev.map(n =>
        n.id === id ? { ...n, is_read: true, read_at: new Date() } : n
      ))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Error marking as read:', err)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read_at: new Date() })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Error marking all as read:', err)
    }
  }

  const handleDelete = async (id) => {
    try {
      const deleted = notifications.find(n => n.id === id)
      await notificationService.delete(id)
      setNotifications(prev => prev.filter(n => n.id !== id))
      if (deleted && !deleted.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (err) {
      console.error('Error deleting notification:', err)
    }
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'new_registration':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        )
      case 'payment_received':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'payment_overdue':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'subscription_expiring':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        )
    }
  }

  const getNotificationColor = (type) => {
    switch (type) {
      case 'new_registration': return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
      case 'payment_received': return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
      case 'payment_overdue': return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
      case 'subscription_expiring': return 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
      default: return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
    }
  }

  const formatTime = (dateString) => {
    if (!dateString) return language === 'ar' ? 'غير متوفر' : 'N/A'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return language === 'ar' ? 'الآن' : 'Just now'
    if (diffMins < 60) return language === 'ar' ? `منذ ${diffMins} دقيقة` : `${diffMins}m ago`
    if (diffHours < 24) return language === 'ar' ? `منذ ${diffHours} ساعة` : `${diffHours}h ago`
    if (diffDays < 7) return language === 'ar' ? `منذ ${diffDays} يوم` : `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <svg className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-500">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-secondary dark:text-white">
              {language === 'ar' ? 'الإشعارات' : 'Notifications'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {unreadCount > 0
                ? (language === 'ar' ? `${unreadCount} إشعارات غير مقروءة` : `${unreadCount} unread notifications`)
                : (language === 'ar' ? 'جميع الإشعارات مقروءة' : 'All caught up')}
            </p>
          </div>
        </div>
        {activeTab === 'notifications' && unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-colors"
          >
            {language === 'ar' ? 'تحديد الكل كمقروء' : 'Mark All as Read'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-white/10">
        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'notifications'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          {language === 'ar' ? 'الإشعارات' : 'Notifications'}
          {unreadCount > 0 && (
            <span className="ml-2 rtl:ml-0 rtl:mr-2 px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('announcements')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'announcements'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          {language === 'ar' ? 'الإعلانات' : 'Announcements'}
          {announcements.length > 0 && (
            <span className="ml-2 rtl:ml-0 rtl:mr-2 px-2 py-0.5 text-xs bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-300 rounded-full">
              {announcements.length}
            </span>
          )}
        </button>
      </div>

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <>
          {notifications.length > 0 ? (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <GlassCard
                  key={notification.id}
                  className={`p-4 transition-all ${!notification.is_read ? 'border-l-4 border-indigo-500' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getNotificationColor(notification.type)}`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className={`font-medium ${!notification.is_read ? 'text-secondary dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                            {language === 'ar' ? (notification.title_ar || notification.title) : notification.title}
                          </h4>
                          {notification.message && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {language === 'ar' ? (notification.message_ar || notification.message) : notification.message}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-2">
                            {formatTime(notification.created_at || notification.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!notification.is_read && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-gray-400 hover:text-indigo-500"
                              title={language === 'ar' ? 'تحديد كمقروء' : 'Mark as read'}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(notification.id)}
                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-gray-400 hover:text-red-500"
                            title={language === 'ar' ? 'حذف' : 'Delete'}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          ) : (
            <GlassCard className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <p className="text-gray-500 mb-2">{language === 'ar' ? 'لا توجد إشعارات بعد' : 'No notifications yet'}</p>
              <p className="text-sm text-gray-400">{language === 'ar' ? 'ستظهر الإشعارات هنا عند تسجيل لاعب جديد أو أنشطة أخرى' : 'Notifications will appear here when a new player registers or other activities occur'}</p>
            </GlassCard>
          )}
        </>
      )}

      {/* Announcements Tab */}
      {activeTab === 'announcements' && (
        <>
          {announcements.length > 0 ? (
            <div className="space-y-3">
              {announcements.map((announcement) => {
                const authorName = announcement.author
                  ? `${announcement.author.first_name || ''} ${announcement.author.last_name || ''}`.trim()
                  : (language === 'ar' ? 'المشرف' : 'Super Admin')
                const timestamp = announcement.created_at || announcement.createdAt || announcement.published_at || announcement.updatedAt
                return (
                  <GlassCard key={announcement.id} className="p-4 transition-all hover:shadow-md border-l-2 border-indigo-500/70">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                          <div>
                            <h3 className="text-base font-semibold text-secondary dark:text-white">
                              {announcement.title}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 whitespace-pre-wrap">
                              {announcement.content}
                            </p>
                          </div>
                          <span className="text-[11px] text-gray-400">{formatTime(timestamp)}</span>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-3">
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            {authorName}
                          </span>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                )
              })}
            </div>
          ) : (
            <GlassCard className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
              </div>
              <p className="text-gray-500 mb-2">{language === 'ar' ? 'لا توجد إعلانات بعد' : 'No announcements yet'}</p>
              <p className="text-sm text-gray-400">{language === 'ar' ? 'ستظهر الإعلانات هنا عند نشرها' : 'Announcements will appear here when published'}</p>
            </GlassCard>
          )}
        </>
      )}
    </div>
  )
}
