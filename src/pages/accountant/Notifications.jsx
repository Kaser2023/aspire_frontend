import { useState, useEffect, useCallback, useRef } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { useAuth } from '../../hooks/useAuth'
import { announcementsService, socketService } from '../../services'
import GlassCard from '../../components/ui/GlassCard'

export default function Notifications() {
  const { language } = useLanguage()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState([])
  const pollingRef = useRef(null)

  const getAnnouncementTimestamp = (announcement) => {
    return announcement?.created_at
      || announcement?.createdAt
      || announcement?.published_at
      || announcement?.publishedAt
      || announcement?.updated_at
      || announcement?.updatedAt
      || null
  }

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)
      const response = await announcementsService.getFeed({ limit: 50 })
      if (response.success) {
        const sorted = (response.data || []).sort((a, b) => {
          const aDate = new Date(getAnnouncementTimestamp(a) || 0).getTime()
          const bDate = new Date(getAnnouncementTimestamp(b) || 0).getTime()
          return bDate - aDate
        })
        setNotifications(sorted)
      }
    } catch (err) {
      console.error('Error fetching notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  useEffect(() => {
    if (!user) return undefined

    const socket = socketService.initSocket(user)

    const startPolling = () => {
      if (pollingRef.current) return
      pollingRef.current = setInterval(() => {
        fetchNotifications()
      }, 30000)
    }

    const stopPolling = () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }

    if (!socket?.connected) {
      startPolling()
    }

    socketService.onSocketConnect(() => stopPolling())
    socketService.onSocketDisconnect(() => startPolling())
    socketService.onSocketConnectError(() => startPolling())
    socketService.onAnnouncementCreated(() => fetchNotifications())

    return () => {
      stopPolling()
      socketService.offAnnouncementCreated()
      socketService.offSocketConnect()
      socketService.offSocketDisconnect()
      socketService.offSocketConnectError()
    }
  }, [user, fetchNotifications])

  const formatAudience = (audience, targetBranch) => {
    if (!audience) return language === 'ar' ? 'الجميع' : 'All'
    if (typeof audience === 'string') {
      if (audience === 'all') return language === 'ar' ? 'الجميع' : 'All'
      if (audience === 'staff') return language === 'ar' ? 'الموظفون' : 'Staff'
      if (audience === 'branch_admin') return language === 'ar' ? 'مديرو الفروع' : 'Branch Admins'
      return audience
    }

    const roleLabels = {
      branch_admin: language === 'ar' ? 'مديرو الفروع' : 'Branch Admins',
      coach: language === 'ar' ? 'المدربون' : 'Coaches',
      accountant: language === 'ar' ? 'المحاسبون' : 'Accountants',
      parent: language === 'ar' ? 'أولياء الأمور' : 'Parents',
      player: language === 'ar' ? 'اللاعبون' : 'Players'
    }

    if (audience.type === 'all') {
      return language === 'ar' ? 'الجميع' : 'All'
    }

    if (audience.type === 'roles' && audience.roles?.length > 0) {
      return audience.roles.map(role => roleLabels[role] || role).join(', ')
    }

    if (audience.type === 'specific') {
      if (targetBranch?.name) {
        return language === 'ar' ? `فرع: ${targetBranch.name}` : `Branch: ${targetBranch.name}`
      }
      const branchCount = Object.keys(audience.branches || {}).length
      return language === 'ar' ? `${branchCount} فرع محدد` : `${branchCount} specific branches`
    }

    return language === 'ar' ? 'الجميع' : 'All'
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
          <svg className="w-12 h-12 text-teal-500 animate-spin mx-auto mb-4" fill="none" viewBox="0 0 24 24">
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-secondary dark:text-white">
              {language === 'ar' ? 'الإشعارات' : 'Notifications'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {language === 'ar'
                ? `لديك ${notifications.length} إعلان`
                : `You have ${notifications.length} announcements`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-50 dark:bg-teal-500/10 rounded-lg text-xs text-teal-600 dark:text-teal-400">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {language === 'ar' ? 'تحديث مباشر' : 'Live updates'}
        </div>
      </div>

      {notifications.length > 0 ? (
        <div className="space-y-3">
          {notifications.map((announcement) => {
            const authorName = announcement.author
              ? `${announcement.author.first_name || ''} ${announcement.author.last_name || ''}`.trim()
              : (language === 'ar' ? 'المشرف' : 'Super Admin')
            const timestamp = getAnnouncementTimestamp(announcement)
            return (
              <GlassCard key={announcement.id} className="p-4 transition-all hover:shadow-md border-l-2 border-teal-500/70">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
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
                        {authorName || (language === 'ar' ? 'المشرف' : 'Super Admin')}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-3-3v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formatAudience(announcement.target_audience, announcement.target_branch)}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {timestamp
                          ? new Date(timestamp).toLocaleString()
                          : (language === 'ar' ? 'غير متوفر' : 'N/A')}
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <p className="text-gray-500 mb-2">{language === 'ar' ? 'لا توجد إشعارات بعد' : 'No notifications yet'}</p>
          <p className="text-sm text-gray-400">{language === 'ar' ? 'ستظهر الإشعارات هنا عند حدوث أنشطة مالية' : 'Notifications will appear here when financial activities occur'}</p>
        </GlassCard>
      )}
    </div>
  )
}
