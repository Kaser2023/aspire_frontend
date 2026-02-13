import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../hooks/useLanguage'
import { useAuth } from '../../hooks/useAuth'
import { statsService } from '../../services'
import GlassCard from '../../components/ui/GlassCard'

export default function BranchAdminHome() {
  const { language } = useLanguage()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalPlayers: 0,
    totalCoaches: 0,
    activePrograms: 0,
    attendanceRate: 0,
    branchName: ''
  })

  const fetchStats = useCallback(async () => {
    if (!user?.branch_id) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const response = await statsService.getBranchStats(user.branch_id)
      if (response.success && response.data) {
        setStats({
          totalPlayers: response.data.player_count || 0,
          totalCoaches: response.data.coach_count || 0,
          activePrograms: response.data.program_count || 0,
          attendanceRate: response.data.today_attendance_rate || 0,
          branchName: response.data.branch_name || ''
        })
      }
    } catch (err) {
      console.error('Error fetching branch stats:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.branch_id])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const quickStats = [
    { label: { en: 'Total Players', ar: 'إجمالي اللاعبين' }, value: stats.totalPlayers, icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', color: 'from-blue-400 to-blue-600' },
    { label: { en: 'Coaches', ar: 'المدربون' }, value: stats.totalCoaches, icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', color: 'from-emerald-400 to-emerald-600' },
    { label: { en: 'Active Programs', ar: 'البرامج النشطة' }, value: stats.activePrograms, icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', color: 'from-purple-400 to-purple-600' },
    { label: { en: 'Attendance Rate', ar: 'نسبة الحضور' }, value: `${stats.attendanceRate}%`, icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', color: 'from-pink-400 to-pink-600' },
  ]

  const quickActions = [
    { label: { en: 'Add Coach', ar: 'إضافة مدرب' }, path: '/branch-admin/coaches', icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z', color: 'bg-emerald-500' },
    { label: { en: 'View Players', ar: 'عرض اللاعبين' }, path: '/branch-admin/players', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', color: 'bg-blue-500' },
    { label: { en: 'View Programs', ar: 'عرض البرامج' }, path: '/branch-admin/programs', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', color: 'bg-purple-500' },
    { label: { en: 'Attendance', ar: 'الحضور' }, path: '/branch-admin/attendance', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', color: 'bg-orange-500' },
    { label: { en: 'View Reports', ar: 'عرض التقارير' }, path: '/branch-admin/reports', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'bg-teal-500' },
    { label: { en: 'Announcements', ar: 'الإعلانات' }, path: '/branch-admin/announcements', icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z', color: 'bg-pink-500' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <svg className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" fill="none" viewBox="0 0 24 24">
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
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl md:text-3xl font-bold text-secondary dark:text-white">
              {language === 'ar' ? 'لوحة تحكم الفرع' : 'Branch Dashboard'}
            </h1>
            {user && (
              <span className="text-lg text-gray-500 dark:text-gray-400">
                - {language === 'ar' 
                    ? (user.name_ar || `${user.first_name || ''} ${user.last_name || ''}`.trim())
                    : `${user.first_name || ''} ${user.last_name || ''}`.trim()}
              </span>
            )}
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            {stats.branchName 
              ? (language === 'ar' ? `فرع ${stats.branchName}` : `${stats.branchName} Branch`)
              : (language === 'ar' ? 'نظرة عامة على إدارة الفرع' : 'Branch management overview')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-500/20 dark:to-purple-500/20 text-blue-600 dark:text-blue-400 rounded-xl font-bold">
            {new Date().toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickStats.map((stat, idx) => (
          <GlassCard key={idx} className="p-4">
            <div className="flex flex-col items-center text-center">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg mb-3`}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                </svg>
              </div>
              <p className="text-xl font-bold text-secondary dark:text-white">{stat.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label[language]}</p>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Quick Actions */}
      <GlassCard className="p-6">
        <h2 className="text-lg font-bold text-secondary dark:text-white mb-4">
          {language === 'ar' ? 'إجراءات سريعة' : 'Quick Actions'}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
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
              <span className="font-semibold text-xs text-secondary dark:text-white">{action.label[language]}</span>
            </Link>
          ))}
        </div>
      </GlassCard>

      {/* Getting Started */}
      <GlassCard className="p-6">
        <h2 className="text-lg font-bold text-secondary dark:text-white mb-4">
          {language === 'ar' ? 'البدء السريع' : 'Getting Started'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`flex items-start gap-3 p-4 rounded-xl ${stats.totalCoaches > 0 ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-gray-50 dark:bg-white/5'}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stats.totalCoaches > 0 ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
              {stats.totalCoaches > 0 ? (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="text-white text-sm font-bold">1</span>
              )}
            </div>
            <div>
              <p className="font-semibold text-secondary dark:text-white">{language === 'ar' ? 'إضافة مدربين' : 'Add Coaches'}</p>
              <p className="text-sm text-gray-500">{language === 'ar' ? 'أضف مدربين لتدريب اللاعبين' : 'Add coaches to train players'}</p>
            </div>
          </div>
          
          <div className={`flex items-start gap-3 p-4 rounded-xl ${stats.activePrograms > 0 ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-gray-50 dark:bg-white/5'}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stats.activePrograms > 0 ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
              {stats.activePrograms > 0 ? (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="text-white text-sm font-bold">2</span>
              )}
            </div>
            <div>
              <p className="font-semibold text-secondary dark:text-white">{language === 'ar' ? 'إعداد البرامج' : 'Setup Programs'}</p>
              <p className="text-sm text-gray-500">{language === 'ar' ? 'أنشئ برامج تدريب للاعبين' : 'Create training programs for players'}</p>
            </div>
          </div>
          
          <div className={`flex items-start gap-3 p-4 rounded-xl ${stats.totalPlayers > 0 ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-gray-50 dark:bg-white/5'}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stats.totalPlayers > 0 ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
              {stats.totalPlayers > 0 ? (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="text-white text-sm font-bold">3</span>
              )}
            </div>
            <div>
              <p className="font-semibold text-secondary dark:text-white">{language === 'ar' ? 'تسجيل اللاعبين' : 'Enroll Players'}</p>
              <p className="text-sm text-gray-500">{language === 'ar' ? 'سجّل اللاعبين في البرامج' : 'Register players to programs'}</p>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
