import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../hooks/useLanguage'
import { useAuth } from '../../hooks/useAuth'
import { statsService, subscriptionsService } from '../../services'
import GlassCard from '../../components/ui/GlassCard'

export default function AccountantHome() {
  const { language } = useLanguage()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalRevenue: 0,
    monthlyRevenue: 0,
    pendingPayments: 0,
    activeSubscriptions: 0,
    overduePayments: 0,
    collectionRate: 0
  })

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      const [statsRes, activeSubsRes] = await Promise.all([
        statsService.getAccountantStats(),
        subscriptionsService.getAll({ status: 'active', limit: 1 })
      ])

      if (statsRes.success && statsRes.data) {
        const totalRevenueThisMonth = statsRes.data.total_revenue_this_month || 0
        const pendingAmount = statsRes.data.pending_payments?.amount || 0
        const denominator = totalRevenueThisMonth + pendingAmount
        const collectionRate = denominator > 0 ? Math.round((totalRevenueThisMonth / denominator) * 100) : 0
        const activeSubscriptions = activeSubsRes?.pagination?.total || 0

        setStats({
          totalRevenue: totalRevenueThisMonth,
          monthlyRevenue: totalRevenueThisMonth,
          pendingPayments: statsRes.data.pending_payments?.count || 0,
          activeSubscriptions,
          overduePayments: statsRes.data.overdue_payments_count || 0,
          collectionRate
        })
      }
    } catch (err) {
      console.error('Error fetching accountant stats:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const formatCurrency = (amount) => `${amount.toLocaleString()} SAR`

  const quickStats = [
    { label: { en: 'Total Revenue', ar: 'إجمالي الإيرادات' }, value: formatCurrency(stats.totalRevenue), icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'from-emerald-400 to-emerald-600' },
    { label: { en: 'Monthly Revenue', ar: 'الإيرادات الشهرية' }, value: formatCurrency(stats.monthlyRevenue), icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', color: 'from-blue-400 to-blue-600' },
    { label: { en: 'Pending Payments', ar: 'المدفوعات المعلقة' }, value: stats.pendingPayments, icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color: 'from-yellow-400 to-yellow-600' },
    { label: { en: 'Active Subscriptions', ar: 'الاشتراكات النشطة' }, value: stats.activeSubscriptions, icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', color: 'from-purple-400 to-purple-600' },
    { label: { en: 'Overdue Payments', ar: 'المدفوعات المتأخرة' }, value: stats.overduePayments, icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', color: 'from-red-400 to-red-600' },
    { label: { en: 'Collection Rate', ar: 'نسبة التحصيل' }, value: `${stats.collectionRate}%`, icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z', color: 'from-teal-400 to-teal-600' },
  ]

  const quickActions = [
    { label: { en: 'View Subscriptions', ar: 'عرض الاشتراكات' }, path: '/accountant/subscriptions', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', color: 'bg-purple-500' },
    { label: { en: 'Record Payment', ar: 'تسجيل دفعة' }, path: '/accountant/payments', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z', color: 'bg-emerald-500' },
    { label: { en: 'View Reports', ar: 'عرض التقارير' }, path: '/accountant/reports', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'bg-blue-500' },
    { label: { en: 'View Branches', ar: 'عرض الفروع' }, path: '/accountant/branches', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', color: 'bg-orange-500' },
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
            {language === 'ar' ? 'لوحة تحكم المحاسب' : 'Accountant Dashboard'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {language === 'ar' ? 'ملخص مالي شامل للمدفوعات والتحصيل' : 'Complete financial overview for payments and collections'}
          </p>
          {user && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {language === 'ar' ? `مرحباً، ${user.first_name || 'المحاسب'}` : `Welcome, ${user.first_name || 'Accountant'}`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="px-4 py-2 bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-500/20 dark:to-teal-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl font-bold">
            {new Date().toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-secondary dark:text-white">
              {language === 'ar' ? 'نظرة على التحصيل' : 'Collections Overview'}
            </h2>
            <Link to="/accountant/reports" className="text-sm text-emerald-500 hover:text-emerald-600 font-semibold">
              {language === 'ar' ? 'عرض التقارير' : 'View Reports'}
            </Link>
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{language === 'ar' ? 'نسبة التحصيل' : 'Collection Rate'}</p>
                <p className="text-2xl font-bold text-secondary dark:text-white">{stats.collectionRate}%</p>
              </div>
              <div className="w-24">
                <div className="h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                  <div className="h-2 bg-gradient-to-r from-emerald-400 to-teal-500" style={{ width: `${Math.min(stats.collectionRate, 100)}%` }}></div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                <p className="text-sm text-gray-500">{language === 'ar' ? 'الإيرادات هذا الشهر' : 'Revenue This Month'}</p>
                <p className="text-lg font-bold text-secondary dark:text-white">{formatCurrency(stats.monthlyRevenue)}</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                <p className="text-sm text-gray-500">{language === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue'}</p>
                <p className="text-lg font-bold text-secondary dark:text-white">{formatCurrency(stats.totalRevenue)}</p>
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h2 className="text-lg font-bold text-secondary dark:text-white mb-4">
            {language === 'ar' ? 'حالة المدفوعات' : 'Payment Status'}
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-yellow-100 text-yellow-600 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="font-semibold text-secondary dark:text-white">{language === 'ar' ? 'مدفوعات معلقة' : 'Pending Payments'}</span>
              </div>
              <span className="font-bold text-yellow-600">{stats.pendingPayments}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <span className="font-semibold text-secondary dark:text-white">{language === 'ar' ? 'مدفوعات متأخرة' : 'Overdue Payments'}</span>
              </div>
              <span className="font-bold text-red-600">{stats.overduePayments}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <span className="font-semibold text-secondary dark:text-white">{language === 'ar' ? 'اشتراكات نشطة' : 'Active Subscriptions'}</span>
              </div>
              <span className="font-bold text-emerald-600">{stats.activeSubscriptions}</span>
            </div>
          </div>
        </GlassCard>
      </div>

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
