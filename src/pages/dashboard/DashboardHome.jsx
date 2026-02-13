import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../hooks/useLanguage'
import { useAuth } from '../../hooks/useAuth'
import { statsService, playersService, subscriptionsService, evaluationService, paymentsService } from '../../services'
import GlassCard from '../../components/ui/GlassCard'

export default function DashboardHome() {
  const { language } = useLanguage()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [children, setChildren] = useState([])
  const [selectedChild, setSelectedChild] = useState(null)
  const [stats, setStats] = useState(null)
  const [subscriptions, setSubscriptions] = useState([])
  const [payments, setPayments] = useState([])
  const [performanceScore, setPerformanceScore] = useState(null)

  const fetchData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const [childrenRes, statsRes, subscriptionsRes, paymentsRes] = await Promise.all([
        playersService.getByParent(user.id),
        statsService.getParentStats(user.id),
        subscriptionsService.getAll({ limit: 100 }),
        paymentsService.getByUser(user.id)
      ])
      if (childrenRes.success) {
        const transformedChildren = (childrenRes.data || []).map((child) => ({
          id: child.id,
          name: {
            en: `${child.first_name || ''} ${child.last_name || ''}`.trim(),
            ar: child.first_name_ar
              ? `${child.first_name_ar} ${child.last_name_ar || ''}`.trim()
              : `${child.first_name || ''} ${child.last_name || ''}`.trim()
          },
          fullName: `${child.first_name || ''} ${child.last_name || ''}`.trim(),
          program: child.program ? { en: child.program.name, ar: child.program.name_ar || child.program.name } : null,
          status: child.status,
          registrationNumber: child.registration_number || '',
          hasParentLinked: child.self_user_id && child.parent_id && child.parent_id !== child.self_user_id
        }))
        setChildren(transformedChildren)
        if (transformedChildren.length > 0) {
          setSelectedChild(transformedChildren[0])
        }
      }
      if (statsRes.success) {
        setStats(statsRes.data)
      }
      if (subscriptionsRes.success) {
        setSubscriptions(subscriptionsRes.data || [])
      }
      if (paymentsRes.success) {
        setPayments(paymentsRes.data || [])
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    let isMounted = true

    const fetchPerformanceScore = async () => {
      if (!selectedChild?.id) {
        setPerformanceScore(null)
        return
      }
      try {
        const response = await evaluationService.getPlayerSummary(selectedChild.id)
        if (isMounted && response.success) {
          const summary = response.data || {}
          const score = summary.averageRating ?? summary.average_rating ?? summary.quick_average ?? null
          setPerformanceScore(score !== null ? Number(score) : null)
        }
      } catch (err) {
        console.error('Error fetching performance score:', err)
        if (isMounted) setPerformanceScore(null)
      }
    }

    fetchPerformanceScore()
    return () => {
      isMounted = false
    }
  }, [selectedChild?.id])

  const selectedChildId = selectedChild?.id
  const selectedChildName = selectedChild?.name?.[language] || ''

  const filteredSubscriptions = selectedChildId
    ? subscriptions.filter((sub) => sub.player_id === selectedChildId || sub.player?.id === selectedChildId)
    : subscriptions

  const activeSubscription = filteredSubscriptions
    .filter((sub) => sub.status === 'active' || sub.status === 'pending')
    .sort((a, b) => new Date(b.end_date) - new Date(a.end_date))[0]

  // Find latest completed payment for selected child
  const latestPayment = selectedChildId
    ? payments.find(p => p.player_id === selectedChildId && p.status === 'completed')
    : null

  const calculateRemainingDays = (endDate) => {
    if (!endDate) return 0
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const end = new Date(endDate)
    const diffMs = end - now
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
  }

  // Calculate subscription data from subscription OR payment
  let remainingDays = 0
  let totalDays = 1
  let startDate = null
  let endDate = null
  let planName = null
  let hasActiveSubscription = false

  // Priority: Use pricing plan from payment
  if (latestPayment?.pricing_plan?.name) {
    planName = latestPayment.pricing_plan.name
  }

  if (activeSubscription?.end_date) {
    // Use subscription data
    endDate = new Date(activeSubscription.end_date)
    startDate = activeSubscription.start_date ? new Date(activeSubscription.start_date) : null
    remainingDays = calculateRemainingDays(endDate)
    hasActiveSubscription = remainingDays > 0
    if (startDate) {
      totalDays = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)))
    }
  } else if (latestPayment?.pricing_plan) {
    // Calculate from payment if no subscription
    const pricingPlan = latestPayment.pricing_plan
    const durationMonths = pricingPlan.duration_months || 1
    const paymentDate = new Date(latestPayment.payment_date || latestPayment.paid_at || latestPayment.created_at)
    startDate = paymentDate
    endDate = new Date(paymentDate)
    endDate.setMonth(endDate.getMonth() + durationMonths)
    remainingDays = calculateRemainingDays(endDate)
    totalDays = durationMonths * 30 // Approximate
    hasActiveSubscription = remainingDays > 0
  }

  const progressPercent = Math.min(100, Math.max(0, Math.round(((totalDays - remainingDays) / totalDays) * 100)))

  const attendanceRate = stats?.attendance_summary?.this_month_rate ?? 0
  const performanceScoreDisplay = performanceScore !== null
    ? `${Number(performanceScore).toFixed(1)}/5`
    : '--/5'

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const upcomingSessions = stats?.upcoming_sessions || []
  // Filter sessions for the selected child only - try multiple matching strategies
  const selectedChildSession = selectedChildId
    ? upcomingSessions.find((session) => 
        session.player_id === selectedChildId ||
        session.player_name === selectedChild?.fullName ||
        session.player_name === selectedChildName
      )
    : null
  // Only show session if it belongs to selected child (don't fall back to other children's sessions)
  const nextSession = selectedChildSession || null
  const nextSessionDate = nextSession?.date ? new Date(nextSession.date) : null

  const isSelfPlayer = user?.account_type === 'self_player'
  const registrationCode = selectedChild?.registrationNumber || ''

  const quickActions = isSelfPlayer
    ? [
        { label: { en: 'View Schedule', ar: 'عرض الجدول' }, path: '/dashboard/schedule', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', color: 'bg-blue-500' },
        { label: { en: 'Store', ar: 'المتجر' }, path: '/dashboard/store', icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z', color: 'bg-green-500' },
        { label: { en: 'Settings', ar: 'الإعدادات' }, path: '/dashboard/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', color: 'bg-primary' },
      ]
    : [
        { label: { en: 'View Schedule', ar: 'عرض الجدول' }, path: '/dashboard/schedule', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', color: 'bg-blue-500' },
        { label: { en: 'Make Payment', ar: 'دفع' }, path: '/dashboard/payments', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', color: 'bg-green-500' },
        { label: { en: 'Add Player', ar: 'إضافة لاعب' }, path: '/dashboard/children', icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z', color: 'bg-primary' },
      ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <svg className="w-12 h-12 text-primary animate-spin mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-500">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
        </div>
      </div>
    )
  }

  // No children registered yet
  if (children.length === 0) {
    return (
      <div className="space-y-6">
        {/* Welcome Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-secondary dark:text-white">
            {language === 'ar' ? 'مرحباً بك' : 'Welcome'} {user?.first_name || ''} 👋
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {user?.account_type === 'self_player' 
              ? (language === 'ar' ? 'لوحة تحكم اللاعب' : 'Player Dashboard')
              : (language === 'ar' ? 'لوحة تحكم ولي الأمر' : 'Parent Dashboard')
            }
          </p>
        </div>

        {/* Empty State */}
        <GlassCard className="p-8 text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-primary/20 to-yellow-300/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-secondary dark:text-white mb-2">
            {language === 'ar' ? 'لم يتم تسجيل أي لاعب بعد' : 'No Players Registered Yet'}
          </h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            {language === 'ar' 
              ? 'قم بتسجيل اللاعب للبدء في متابعة جداول التدريب والحضور والأداء'
              : 'Register your player to start tracking training schedules, attendance, and performance'}
          </p>
          <Link 
            to="/dashboard/children" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-yellow-400 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {language === 'ar' ? 'تسجيل لاعب جديد' : 'Register a Player'}
          </Link>
        </GlassCard>

        {/* Quick Actions */}
        <GlassCard className="p-4 md:p-6">
          <h2 className="text-base md:text-lg font-bold text-secondary dark:text-white mb-3 md:mb-4">
            {language === 'ar' ? 'إجراءات سريعة' : 'Quick Actions'}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 md:gap-3">
            {quickActions.map((action, idx) => (
              <Link
                key={idx}
                to={action.path}
                className="flex flex-col items-center gap-1.5 sm:gap-2 p-3 sm:p-4 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-center"
              >
                <div className={`w-10 h-10 sm:w-12 sm:h-12 ${action.color} rounded-xl flex items-center justify-center shadow-lg`}>
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={action.icon} />
                  </svg>
                </div>
                <span className="font-semibold text-xs sm:text-sm text-secondary dark:text-white">{action.label[language]}</span>
              </Link>
            ))}
          </div>
        </GlassCard>

        {/* Getting Started Guide */}
        <GlassCard className="p-6">
          <h2 className="text-lg font-bold text-secondary dark:text-white mb-4">
            {language === 'ar' ? 'كيفية البدء' : 'Getting Started'}
          </h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
              <div className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center font-bold">1</div>
              <div>
                <p className="font-semibold text-secondary dark:text-white">
                  {language === 'ar' ? 'تسجيل اللاعب' : 'Register Your Player'}
                </p>
                <p className="text-sm text-gray-500">
                  {language === 'ar' ? 'أضف بيانات اللاعب واختر البرنامج المناسب' : 'Add your player\'s information and select a suitable program'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
              <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 text-white rounded-lg flex items-center justify-center font-bold">2</div>
              <div>
                <p className="font-semibold text-secondary dark:text-white">
                  {language === 'ar' ? 'اختيار البرنامج' : 'Choose a Program'}
                </p>
                <p className="text-sm text-gray-500">
                  {language === 'ar' ? 'اختر برنامج التدريب المناسب لعمر اللاعب' : 'Select a training program suitable for your player\'s age'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
              <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 text-white rounded-lg flex items-center justify-center font-bold">3</div>
              <div>
                <p className="font-semibold text-secondary dark:text-white">
                  {language === 'ar' ? 'إتمام الدفع' : 'Complete Payment'}
                </p>
                <p className="text-sm text-gray-500">
                  {language === 'ar' ? 'ادفع رسوم الاشتراك لتفعيل التسجيل' : 'Pay the subscription fee to activate registration'}
                </p>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    )
  }

  // Has children - show dashboard with data
  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-secondary dark:text-white">
            {language === 'ar' ? 'مرحباً بك' : 'Welcome back'} 👋
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            {isSelfPlayer
              ? (language === 'ar' ? 'لوحة تحكم اللاعب' : 'Player Dashboard')
              : (language === 'ar' ? 'إليك نظرة عامة على نشاط اللاعب' : "Here's an overview of your player's activity")
            }
          </p>
        </div>
        {children.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              {language === 'ar' ? 'اللاعب الحالي:' : 'Current player:'}
            </span>
            <select
              value={selectedChild?.id || ''}
              onChange={(e) => setSelectedChild(children.find(c => String(c.id) === e.target.value))}
              className="px-3 py-2 sm:px-4 sm:py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white text-sm sm:text-base font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {children.map(child => (
                <option key={child.id} value={child.id}>{child.name?.[language]}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Registration Code - for self-players to share with parent (hidden once parent is linked) */}
      {isSelfPlayer && registrationCode && !selectedChild?.hasParentLinked && (
        <GlassCard className="p-4 border border-emerald-200/50 dark:border-emerald-800/30 bg-emerald-50/30 dark:bg-emerald-900/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {language === 'ar' ? 'رمز التسجيل الخاص بك (شاركه مع ولي أمرك)' : 'Your Registration Code (share with your parent)'}
                </p>
                <p className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 tracking-wider">{registrationCode}</p>
              </div>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(registrationCode)
              }}
              className="p-2 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-800/20 transition-colors"
              title={language === 'ar' ? 'نسخ' : 'Copy'}
            >
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </GlassCard>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-secondary dark:text-white">{remainingDays}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{language === 'ar' ? 'الأيام المتبقية' : 'Remaining days'}</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-yellow-500 flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-secondary dark:text-white">
                {performanceScoreDisplay}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{language === 'ar' ? 'الأداء' : 'Performance'}</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-secondary dark:text-white">{attendanceRate}%</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{language === 'ar' ? 'نسبة الحضور' : 'Attendance rate'}</p>
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Subscription Status */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-secondary dark:text-white">
              {language === 'ar' ? 'حالة الاشتراك' : 'Subscription status'}
            </h2>
            <Link to="/dashboard/payments" className="text-sm text-primary font-semibold hover:text-yellow-500">
              {language === 'ar' ? 'تجديد الاشتراك' : 'Renew subscription'}
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{
                background: `conic-gradient(#F6C344 ${progressPercent}%, #E5E7EB ${progressPercent}%)`
              }}
            >
              <div className="w-20 h-20 rounded-full bg-white dark:bg-secondary flex items-center justify-center">
                <div className="text-center">
                  <div className="text-lg font-bold text-secondary dark:text-white">{remainingDays}</div>
                  <div className="text-xs text-gray-500">{language === 'ar' ? 'يوم متبق' : 'days left'}</div>
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-secondary dark:text-white">{selectedChildName}</p>
              <p className="text-sm text-gray-500">
                {selectedChild?.program?.[language] || (language === 'ar' ? 'لا يوجد برنامج' : 'No program')}
              </p>
              {planName && (
                <p className="text-xs text-primary font-medium">{planName}</p>
              )}
              <p className="text-xs text-gray-400">
                {hasActiveSubscription && endDate
                  ? `${language === 'ar' ? 'ينتهي في' : 'Ends on'} ${endDate.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}`
                  : (language === 'ar' ? 'لا يوجد اشتراك نشط' : 'No active subscription')}
              </p>
            </div>
          </div>
          {activeSubscription?.notes && activeSubscription.notes.includes('[Freeze]') && (
            <div className="mt-3 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 flex items-start gap-2">
              <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                {language === 'ar'
                  ? 'تم تمديد اشتراكك تلقائياً بسبب فترة تجميد (إجازة). لا حاجة لأي إجراء.'
                  : 'Your subscription was automatically extended due to a freeze period (holiday). No action needed.'}
              </p>
            </div>
          )}
        </GlassCard>

        {/* Next Session */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-secondary dark:text-white">
              {language === 'ar' ? 'الجلسة القادمة' : 'Next session'}
            </h2>
            <Link to="/dashboard/schedule" className="text-sm text-primary font-semibold hover:text-yellow-500">
              {language === 'ar' ? 'عرض الكل' : 'View all'}
            </Link>
          </div>
          {nextSession ? (
            <div className="flex items-center justify-between gap-4 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-500/10 dark:to-amber-500/10 rounded-xl">
              <div>
                <p className="text-sm text-gray-500">{language === 'ar' ? 'التاريخ' : 'Date'}</p>
                <p className="font-semibold text-secondary dark:text-white">
                  {nextSessionDate.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{language === 'ar' ? 'الوقت' : 'Time'}</p>
                <p className="font-semibold text-secondary dark:text-white">{nextSession.time}</p>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">{language === 'ar' ? 'البرنامج' : 'Program'}</p>
                <p className="font-semibold text-secondary dark:text-white">{nextSession.program_name}</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">•</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-500">
                {language === 'ar' ? 'لا توجد جلسات قادمة لهذا اللاعب' : 'No upcoming sessions for this player'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {language === 'ar' ? 'سيتم عرض الجلسات عند جدولتها' : 'Sessions will appear when scheduled'}
              </p>
            </div>
          )}
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
