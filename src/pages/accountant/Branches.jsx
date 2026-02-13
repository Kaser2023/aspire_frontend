import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import GlassCard from '../../components/ui/GlassCard'
import { branchesService, statsService } from '../../services'

export default function Branches() {
  const { language } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [branches, setBranches] = useState([])

  const fetchBranches = useCallback(async () => {
    try {
      setLoading(true)
      const [branchesRes, financialRes] = await Promise.all([
        branchesService.getAll({ limit: 200 }),
        statsService.getFinancialStats()
      ])
      const revenueByBranch = financialRes.success
        ? (financialRes.data?.revenue_by_branch || [])
        : []

      if (branchesRes.success && branchesRes.data) {
        const transformed = branchesRes.data.map((b) => {
          const revenueMatch = revenueByBranch.find((r) => r.branch_id === b.id)
          return {
          id: b.id,
          name: { en: b.name, ar: b.name_ar || b.name },
          location: { en: b.address || '', ar: b.address || '' },
          players: b.player_count || 0,
          programs: b.program_count || 0,
          coaches: b.coach_count || 0,
          monthlyRevenue: revenueMatch?.total || 0,
          color: 'bg-teal-500'
          }
        })
        setBranches(transformed)
      }
    } catch (err) {
      console.error('Error fetching accountant branches:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBranches()
  }, [fetchBranches])

  const formatCurrency = (amount) => `SAR ${amount.toLocaleString()}`

  const totalStats = {
    players: branches.reduce((sum, b) => sum + (b.players || 0), 0),
    programs: branches.reduce((sum, b) => sum + (b.programs || 0), 0),
    coaches: branches.reduce((sum, b) => sum + (b.coaches || 0), 0),
    revenue: branches.reduce((sum, b) => sum + (b.monthlyRevenue || 0), 0),
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
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-secondary dark:text-white">
          {language === 'ar' ? 'نظرة عامة على الفروع' : 'Branches Overview'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {language === 'ar' ? 'الوضع المالي لجميع الفروع' : 'Financial status for all branches'}
        </p>
      </div>

      {/* Total Summary */}
      <GlassCard className="p-6 border-2 border-teal-200 dark:border-teal-500/30">
        <h2 className="text-lg font-bold text-secondary dark:text-white mb-4">
          {language === 'ar' ? 'الإجمالي - جميع الفروع' : 'Total - All Branches'}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-teal-600 dark:text-teal-400">{totalStats.players}</p>
            <p className="text-sm text-gray-500">{language === 'ar' ? 'لاعب' : 'Players'}</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-teal-600 dark:text-teal-400">{totalStats.programs}</p>
            <p className="text-sm text-gray-500">{language === 'ar' ? 'برنامج' : 'Programs'}</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-emerald-500">{formatCurrency(totalStats.revenue)}</p>
            <p className="text-sm text-gray-500">{language === 'ar' ? 'إيرادات الشهر' : "Month's Revenue"}</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-yellow-500">{totalStats.coaches}</p>
            <p className="text-sm text-gray-500">{language === 'ar' ? 'مدرب' : 'Coaches'}</p>
          </div>
        </div>
      </GlassCard>

      {/* Empty State */}
      {branches.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <p className="text-gray-500 mb-2">{language === 'ar' ? 'لا توجد فروع بعد' : 'No branches yet'}</p>
          <p className="text-sm text-gray-400">{language === 'ar' ? 'ستظهر الفروع هنا عند إنشائها بواسطة المدير' : 'Branches will appear here when created by the admin'}</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {branches.map(branch => (
            <GlassCard key={branch.id} className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 ${branch.color || 'bg-teal-500'} rounded-xl flex items-center justify-center text-white font-bold`}>
                  {branch.name?.[language]?.charAt(0) || 'B'}
                </div>
                <div>
                  <p className="font-bold text-secondary dark:text-white">{branch.name?.[language]}</p>
                  <p className="text-sm text-gray-500">{branch.location?.[language]}</p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="font-bold text-secondary dark:text-white">{branch.players || 0}</p>
                  <p className="text-xs text-gray-500">{language === 'ar' ? 'لاعب' : 'Players'}</p>
                </div>
                <div>
                  <p className="font-bold text-secondary dark:text-white">{branch.programs || 0}</p>
                  <p className="text-xs text-gray-500">{language === 'ar' ? 'برنامج' : 'Programs'}</p>
                </div>
                <div>
                  <p className="font-bold text-secondary dark:text-white">{branch.coaches || 0}</p>
                  <p className="text-xs text-gray-500">{language === 'ar' ? 'مدرب' : 'Coaches'}</p>
                </div>
                <div>
                  <p className="font-bold text-emerald-500">{formatCurrency(branch.monthlyRevenue || 0)}</p>
                  <p className="text-xs text-gray-500">{language === 'ar' ? 'الإيرادات' : 'Revenue'}</p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}
