import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../hooks/useLanguage'
import { useAuth } from '../../hooks/useAuth'
import { statsService } from '../../services'
import scheduleService from '../../services/schedule.service'
import GlassCard from '../../components/ui/GlassCard'

export default function CoachDashboardHome() {
  const { language } = useLanguage()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    todaySessions: 0,
    totalPlayers: 0,
    attendance: 0,
    pendingEvaluations: 0
  })
  const [todaySessions, setTodaySessions] = useState([])
  const [loadingSessions, setLoadingSessions] = useState(true)

  const fetchStats = useCallback(async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const response = await statsService.getCoachStats(user.id)
      if (response.success && response.data) {
        setStats({
          todaySessions: response.data.today_sessions || 0,
          totalPlayers: response.data.assigned_players_count || 0,
          attendance: response.data.weekly_attendance_rate || 0,
          pendingEvaluations: 0
        })
      }
    } catch (err) {
      console.error('Error fetching coach stats:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  const fetchTodaySessions = useCallback(async () => {
    if (!user?.id) {
      setLoadingSessions(false)
      return
    }
    try {
      setLoadingSessions(true)
      // Get today's date in local timezone
      const today = new Date()
      const year = today.getFullYear()
      const month = String(today.getMonth() + 1).padStart(2, '0')
      const day = String(today.getDate()).padStart(2, '0')
      const todayDate = `${year}-${month}-${day}`
      
      const response = await scheduleService.getCoachSchedule(user.id, todayDate)
      if (response.success && response.data) {
        // Get sessions array from response
        const sessionsData = response.data.sessions || response.data || []
        // Filter only today's sessions
        const sessions = sessionsData.filter(session => {
          return session.date === todayDate && !session.is_cancelled
        })
        setTodaySessions(sessions)
      }
    } catch (err) {
      console.error('Error fetching today\'s sessions:', err)
    } finally {
      setLoadingSessions(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchStats()
    fetchTodaySessions()
  }, [fetchStats, fetchTodaySessions])

  const quickStats = [
    { label: { en: "Today's Sessions", ar: 'جلسات اليوم' }, value: stats.todaySessions, color: 'from-blue-400 to-blue-600', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { label: { en: 'My Players', ar: 'لاعبيني' }, value: stats.totalPlayers, color: 'from-emerald-400 to-emerald-600', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { label: { en: 'Attendance Rate', ar: 'نسبة الحضور' }, value: `${stats.attendance}%`, color: 'from-purple-400 to-purple-600', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
    { label: { en: 'Pending Evaluations', ar: 'تقييمات معلقة' }, value: stats.pendingEvaluations, color: 'from-orange-400 to-orange-600', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
  ]

  const quickActions = [
    { label: { en: 'Take Attendance', ar: 'تسجيل الحضور' }, path: '/coach/attendance', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', color: 'bg-blue-500' },
    { label: { en: 'View Players', ar: 'عرض اللاعبين' }, path: '/coach/players', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', color: 'bg-emerald-500' },
    { label: { en: 'Evaluate Players', ar: 'تقييم اللاعبين' }, path: '/coach/evaluations', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z', color: 'bg-orange-500' },
    { label: { en: 'View Schedule', ar: 'عرض الجدول' }, path: '/coach/schedule', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', color: 'bg-purple-500' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <svg className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4" fill="none" viewBox="0 0 24 24">
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
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-secondary dark:text-white">
            {language === 'ar' ? 'مرحباً، مدرب' : 'Welcome, Coach'} {user?.first_name || ''} ⚽
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {language === 'ar' ? 'لوحة تحكم المدرب' : 'Coach Dashboard'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-4 py-2 bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-500/20 dark:to-teal-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl font-bold">
            {new Date().toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickStats.map((stat, idx) => (
          <GlassCard key={idx} className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-secondary dark:text-white">{stat.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label[language]}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Today's Sessions */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-secondary dark:text-white">
            {language === 'ar' ? 'جلسات اليوم' : "Today's Sessions"}
          </h2>
          <Link to="/coach/schedule" className="text-sm text-emerald-500 hover:text-emerald-600 font-semibold flex items-center gap-1">
            {language === 'ar' ? 'عرض الجدول' : 'View Schedule'}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
        
        {loadingSessions ? (
          <div className="flex items-center justify-center py-12">
            <svg className="w-8 h-8 text-emerald-500 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : todaySessions.length > 0 ? (
          <div className="space-y-4">
            {todaySessions.map((session) => (
              <div 
                key={session.id} 
                className="p-5 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 rounded-xl border-l-4 border-emerald-500 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-secondary dark:text-white">
                          {language === 'ar' ? (session.program?.name_ar || session.program?.name || session.program_name_ar || session.program_name) : (session.program?.name || session.program_name)}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {session.program?.type || session.program_type || (language === 'ar' ? 'برنامج تدريبي' : 'Training Program')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-semibold">{session.start_time} - {session.end_time}</span>
                      </div>
                      
                      {session.facility && (
                        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                          <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>{session.facility}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Link 
                    to="/coach/attendance"
                    className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    {language === 'ar' ? 'تسجيل الحضور' : 'Take Attendance'}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-lg text-gray-500 dark:text-gray-400 mb-2">
              {language === 'ar' ? 'لا توجد جلسات مجدولة لليوم' : 'No sessions scheduled for today'}
            </p>
            <p className="text-sm text-gray-400">
              {language === 'ar' ? 'استمتع بيوم راحتك! 🎉' : 'Enjoy your day off! 🎉'}
            </p>
          </div>
        )}
      </GlassCard>

      {/* Quick Actions */}
      <GlassCard className="p-6">
        <h2 className="text-lg font-bold text-secondary dark:text-white mb-4">
          {language === 'ar' ? 'إجراءات سريعة' : 'Quick Actions'}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((action, idx) => (
            <Link
              key={idx}
              to={action.path}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-center"
            >
              <div className={`w-12 h-12 ${action.color} rounded-xl flex items-center justify-center shadow-lg`}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={action.icon} />
                </svg>
              </div>
              <span className="font-semibold text-sm text-secondary dark:text-white">{action.label[language]}</span>
            </Link>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}
