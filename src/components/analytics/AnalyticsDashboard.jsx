import { useState, useEffect } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { scheduleService } from '../../services'
import GlassCard from '../ui/GlassCard'

export default function AnalyticsDashboard({ branchId, startDate, endDate }) {
  const { language } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    fetchAnalytics()
  }, [branchId, startDate, endDate])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const params = {}
      if (branchId) params.branchId = branchId
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate

      const response = await scheduleService.getScheduleStats(params)
      if (response.success) {
        setStats(response.data)
      }
    } catch (err) {
      console.error('Error fetching analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg className="w-8 h-8 text-indigo-500 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{language === 'ar' ? 'لا توجد بيانات متاحة' : 'No data available'}</p>
      </div>
    )
  }

  // Get top coaches by workload
  const topCoaches = Object.entries(stats.coach_workload || {})
    .sort((a, b) => b[1].total_sessions - a[1].total_sessions)
    .slice(0, 5)

  // Get top facilities by usage
  const topFacilities = Object.entries(stats.facility_usage || {})
    .sort((a, b) => b[1].total_sessions - a[1].total_sessions)
    .slice(0, 5)

  // Get peak hours sorted
  const peakHours = Object.entries(stats.peak_hours || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  // Get max value for peak hours (for scaling)
  const maxPeakHourSessions = peakHours.length > 0 ? Math.max(...peakHours.map(h => h[1])) : 1

  // Get sessions by day
  const daysOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const daysOrderAr = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
  const sessionsByDay = daysOrder.map((day, idx) => ({
    day: language === 'ar' ? daysOrderAr[idx] : day.substring(0, 3),
    count: stats.sessions_by_day[day] || 0
  }))
  const maxDaySessions = Math.max(...sessionsByDay.map(d => d.count), 1)

  // Get top programs
  const topPrograms = Object.entries(stats.sessions_by_program || {})
    .sort((a, b) => b[1].total_sessions - a[1].total_sessions)
    .slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-secondary dark:text-white">{stats.total_sessions}</p>
              <p className="text-sm text-gray-500">{language === 'ar' ? 'إجمالي الحصص' : 'Total Sessions'}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-500/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-secondary dark:text-white">{stats.active_sessions}</p>
              <p className="text-sm text-gray-500">{language === 'ar' ? 'حصص نشطة' : 'Active Sessions'}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-500/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-secondary dark:text-white">{stats.total_enrollment}</p>
              <p className="text-sm text-gray-500">{language === 'ar' ? 'إجمالي المشاركين' : 'Total Enrollments'}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-500/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-secondary dark:text-white">{stats.capacity_utilization}%</p>
              <p className="text-sm text-gray-500">{language === 'ar' ? 'معدل الإشغال' : 'Capacity Utilization'}</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sessions by Day of Week */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-bold text-secondary dark:text-white mb-4">
            {language === 'ar' ? 'الحصص حسب اليوم' : 'Sessions by Day'}
          </h3>
          <div className="space-y-3">
            {sessionsByDay.map((item, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.day}</span>
                  <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{item.count}</span>
                </div>
                <div className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full transition-all"
                    style={{ width: `${(item.count / maxDaySessions) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Peak Hours Heatmap */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-bold text-secondary dark:text-white mb-4">
            {language === 'ar' ? 'أوقات الذروة' : 'Peak Hours'}
          </h3>
          {peakHours.length === 0 ? (
            <p className="text-gray-500 text-center py-8">{language === 'ar' ? 'لا توجد بيانات' : 'No data'}</p>
          ) : (
            <div className="space-y-3">
              {peakHours.map(([hour, count], idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{hour}</span>
                    <span className="text-sm font-bold text-orange-600 dark:text-orange-400">{count}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full transition-all"
                      style={{ width: `${(count / maxPeakHourSessions) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Coach Workload & Facility Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coach Workload */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-bold text-secondary dark:text-white mb-4">
            {language === 'ar' ? 'عبء العمل للمدربين' : 'Coach Workload'}
          </h3>
          {topCoaches.length === 0 ? (
            <p className="text-gray-500 text-center py-8">{language === 'ar' ? 'لا توجد بيانات' : 'No data'}</p>
          ) : (
            <div className="space-y-4">
              {topCoaches.map(([coachName, workload], idx) => (
                <div key={idx} className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-500/20 rounded-full flex items-center justify-center">
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold text-sm">#{idx + 1}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-secondary dark:text-white">{coachName}</p>
                        <p className="text-xs text-gray-500">
                          {workload.total_hours.toFixed(1)} {language === 'ar' ? 'ساعة' : 'hours'}
                        </p>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                      {workload.total_sessions}
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs">
                    <span className="text-green-600 dark:text-green-400">
                      ✓ {workload.active_sessions} {language === 'ar' ? 'نشط' : 'active'}
                    </span>
                    {workload.cancelled_sessions > 0 && (
                      <span className="text-red-600 dark:text-red-400">
                        ✗ {workload.cancelled_sessions} {language === 'ar' ? 'ملغي' : 'cancelled'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Facility Usage */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-bold text-secondary dark:text-white mb-4">
            {language === 'ar' ? 'استخدام المرافق' : 'Facility Usage'}
          </h3>
          {topFacilities.length === 0 ? (
            <p className="text-gray-500 text-center py-8">{language === 'ar' ? 'لا توجد بيانات' : 'No data'}</p>
          ) : (
            <div className="space-y-4">
              {topFacilities.map(([facilityName, usage], idx) => (
                <div key={idx} className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 dark:bg-purple-500/20 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <p className="font-semibold text-secondary dark:text-white">{facilityName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                        {usage.total_sessions}
                      </p>
                      <p className="text-xs text-gray-500">{language === 'ar' ? 'حصة' : 'sessions'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full"
                        style={{ width: `${usage.utilization_percentage}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                      {usage.utilization_percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Programs Distribution */}
      {topPrograms.length > 0 && (
        <GlassCard className="p-6">
          <h3 className="text-lg font-bold text-secondary dark:text-white mb-4">
            {language === 'ar' ? 'الحصص حسب البرنامج' : 'Sessions by Program'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topPrograms.map(([programName, programStats], idx) => (
              <div key={idx} className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                <p className="font-semibold text-secondary dark:text-white mb-2 truncate" title={programName}>
                  {programName}
                </p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    {programStats.total_sessions}
                  </p>
                  <p className="text-sm text-gray-500">{language === 'ar' ? 'حصة' : 'sessions'}</p>
                </div>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  {programStats.active_sessions} {language === 'ar' ? 'نشط' : 'active'}
                </p>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  )
}
