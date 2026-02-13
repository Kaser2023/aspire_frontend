import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../hooks/useLanguage'
import { usersService, branchesService, playersService, statsService } from '../../services'
import GlassCard from '../../components/ui/GlassCard'

export default function SuperAdminHome() {
  const { language } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    branches: 0,
    supervisors: 0,
    coaches: 0,
    players: 0,
    accounts: 0,
    revenue: '0'
  })
  const [branches, setBranches] = useState([])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch branches, stats, and counts in parallel
        const [
          branchesRes,
          statsRes,
          supervisorsRes,
          coachesRes,
          accountsRes,
          playersRes
        ] = await Promise.all([
          branchesService.getAll({ limit: 200 }),
          statsService.getSuperAdminStats(),
          usersService.getByRole('branch_admin', { limit: 1 }),
          usersService.getByRole('coach', { limit: 1 }),
          usersService.getByRole('parent', { limit: 1 }),
          playersService.getAll({ limit: 1 })
        ])

        const revenueByBranch = statsRes.success
          ? (statsRes.data?.revenue_by_branch || [])
          : []

        if (branchesRes.success && branchesRes.data) {
          setBranches(branchesRes.data.map(b => {
            const revenueMatch = revenueByBranch.find((r) => r.branch_id === b.id)
            return {
              id: b.id,
              name: { en: b.name, ar: b.name_ar || b.name },
              players: b.player_count || 0,
              coaches: b.coach_count || 0,
              revenue: revenueMatch?.total || 0,
              status: 'healthy'
            }
          }))
          setStats(prev => ({ ...prev, branches: branchesRes.data.length }))
        }

        setStats(prev => ({
          ...prev,
          supervisors: supervisorsRes.pagination?.total || 0,
          coaches: coachesRes.pagination?.total || 0,
          accounts: accountsRes.pagination?.total || 0,
          players: playersRes.pagination?.total || 0,
          revenue: statsRes.data?.revenue_this_month || 0
        }))
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const systemStats = [
    { label: { en: 'Total Branches', ar: 'إجمالي الفروع' }, value: stats.branches, icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', color: 'from-purple-400 to-purple-600' },
    { label: { en: 'Branch Admins', ar: 'مدراء الفروع' }, value: stats.supervisors, icon: 'M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z', color: 'from-pink-400 to-pink-600' },
    { label: { en: 'Total Coaches', ar: 'إجمالي المدربين' }, value: stats.coaches, icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', color: 'from-emerald-400 to-emerald-600' },
    { label: { en: 'Total Players', ar: 'إجمالي اللاعبين' }, value: stats.players, icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', color: 'from-blue-400 to-blue-600' },
    { label: { en: 'Registered Accounts', ar: 'الحسابات المسجلة' }, value: stats.accounts, icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', color: 'from-orange-400 to-orange-600' },
    { label: { en: 'Total Revenue', ar: 'إجمالي الإيرادات' }, value: stats.revenue, icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'from-teal-400 to-teal-600' },
  ]

  const formatCurrency = (amount) => `SAR ${amount.toLocaleString()}`

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <svg className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" fill="none" viewBox="0 0 24 24">
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
            {language === 'ar' ? 'لوحة تحكم النظام' : 'System Dashboard'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {language === 'ar' ? 'نظرة عامة على النظام بالكامل' : 'Complete system overview'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-500/20 dark:to-pink-500/20 text-purple-600 dark:text-purple-400 rounded-xl font-bold">
            {new Date().toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* System Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {systemStats.map((stat, idx) => (
          <GlassCard key={idx} className="p-4">
            <div className="flex flex-col items-center text-center">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg mb-3`}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                </svg>
              </div>
              <p className="text-2xl font-bold text-secondary dark:text-white">{stat.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label[language]}</p>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Branch Performance */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-secondary dark:text-white">
              {language === 'ar' ? 'أداء الفروع' : 'Branch Performance'}
            </h2>
            <Link to="/super-admin/branches" className="text-sm text-purple-500 hover:text-purple-600 font-semibold">
              {language === 'ar' ? 'عرض الكل' : 'View All'}
            </Link>
          </div>
          {branches.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <p className="text-gray-500 mb-4">{language === 'ar' ? 'لا توجد فروع بعد' : 'No branches yet'}</p>
              <Link to="/super-admin/branches" className="text-purple-500 hover:underline font-semibold">
                {language === 'ar' ? 'إضافة فرع جديد' : 'Add a branch'}
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {branches.map((branch) => (
                <div key={branch.id} className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${branch.status === 'healthy' ? 'bg-emerald-500' : 'bg-yellow-500'}`}></div>
                      <span className="font-semibold text-secondary dark:text-white">{branch.name[language]}</span>
                    </div>
                    <span className="font-bold text-purple-600 dark:text-purple-400">{formatCurrency(branch.revenue)}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{branch.players} {language === 'ar' ? 'لاعب' : 'players'}</span>
                    <span>•</span>
                    <span>{branch.coaches} {language === 'ar' ? 'مدرب' : 'coaches'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Getting Started / Quick Info */}
        <GlassCard className="p-6">
          <h2 className="text-lg font-bold text-secondary dark:text-white mb-4">
            {language === 'ar' ? 'البدء السريع' : 'Getting Started'}
          </h2>
          <div className="space-y-3">
            <div className={`flex items-start gap-3 p-3 rounded-xl ${branches.length > 0 ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-gray-50 dark:bg-white/5'}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${branches.length > 0 ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                {branches.length > 0 ? (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="text-white text-sm font-bold">1</span>
                )}
              </div>
              <div>
                <p className="font-semibold text-secondary dark:text-white">{language === 'ar' ? 'إضافة فرع' : 'Add a Branch'}</p>
                <p className="text-sm text-gray-500">{language === 'ar' ? 'أضف فرعك الأول للبدء' : 'Add your first branch to get started'}</p>
              </div>
            </div>
            
            <div className={`flex items-start gap-3 p-3 rounded-xl ${stats.supervisors > 0 ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-gray-50 dark:bg-white/5'}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stats.supervisors > 0 ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                {stats.supervisors > 0 ? (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="text-white text-sm font-bold">2</span>
                )}
              </div>
              <div>
                <p className="font-semibold text-secondary dark:text-white">{language === 'ar' ? 'إضافة مدير فرع' : 'Add Branch Admin'}</p>
                <p className="text-sm text-gray-500">{language === 'ar' ? 'عيّن مديراً لإدارة الفرع' : 'Assign an admin to manage the branch'}</p>
              </div>
            </div>
            
            <div className={`flex items-start gap-3 p-3 rounded-xl ${stats.coaches > 0 ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-gray-50 dark:bg-white/5'}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stats.coaches > 0 ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                {stats.coaches > 0 ? (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="text-white text-sm font-bold">3</span>
                )}
              </div>
              <div>
                <p className="font-semibold text-secondary dark:text-white">{language === 'ar' ? 'إضافة مدربين' : 'Add Coaches'}</p>
                <p className="text-sm text-gray-500">{language === 'ar' ? 'أضف المدربين لتدريب اللاعبين' : 'Add coaches to train players'}</p>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Quick Actions */}
      <GlassCard className="p-6">
        <h2 className="text-lg font-bold text-secondary dark:text-white mb-4">
          {language === 'ar' ? 'إجراءات سريعة' : 'Quick Actions'}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: { en: 'Add Branch', ar: 'إضافة فرع' }, path: '/super-admin/branches', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', color: 'bg-purple-500' },
            { label: { en: 'Add Admin', ar: 'إضافة مدير' }, path: '/super-admin/users', icon: 'M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z', color: 'bg-pink-500' },
            { label: { en: 'Add Coach', ar: 'إضافة مدرب' }, path: '/super-admin/users', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', color: 'bg-emerald-500' },
            { label: { en: 'Add Program', ar: 'إضافة برنامج' }, path: '/super-admin/programs', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', color: 'bg-blue-500' },
            { label: { en: 'Add Product', ar: 'إضافة منتج' }, path: '/super-admin/products', icon: 'M20 13V7a2 2 0 00-2-2h-3V3H9v2H6a2 2 0 00-2 2v6m16 0v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6m16 0h-4m-8 0H4m6 0v2m0 4h.01', color: 'bg-indigo-500' },
            { label: { en: 'View Reports', ar: 'عرض التقارير' }, path: '/super-admin/reports', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'bg-teal-500' },
            { label: { en: 'Announcement', ar: 'إعلان' }, path: '/super-admin/announcements', icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z', color: 'bg-orange-500' },
          ].map((action, idx) => (
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
    </div>
  )
}
