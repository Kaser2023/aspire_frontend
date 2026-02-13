import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { useAuth } from '../../hooks/useAuth'
import { subscriptionsService, paymentsService, playersService } from '../../services'
import GlassCard from '../../components/ui/GlassCard'

export default function Payments() {
  const { language } = useLanguage()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [children, setChildren] = useState([])
  const [invoices, setInvoices] = useState([])

  const fetchData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const [childrenRes, paymentsRes, subsRes] = await Promise.all([
        playersService.getByParent(user.id),
        paymentsService.getByUser(user.id),
        subscriptionsService.getAll({ limit: 100 })
      ])

      if (childrenRes.success) {
        const subscriptions = subsRes.success ? (subsRes.data || []) : []
        const paymentsData = paymentsRes.success ? (paymentsRes.data || []) : []
        
        const childrenData = (childrenRes.data || []).map(child => {
          // Find active/pending subscription for this child
          const subscription = subscriptions.find(s => 
            s.player_id === child.id && 
            (s.status === 'active' || s.status === 'pending')
          )
          
          // Find latest completed payment for this child
          const latestPayment = paymentsData.find(p => 
            p.player_id === child.id && 
            p.status === 'completed'
          )
          
          // Calculate days remaining
          let daysRemaining = 0
          let subscriptionStatus = 'inactive'
          let endDate = null
          let startDate = null
          let planName = null
          let totalAmount = null
          
          // PRIORITY: Use pricing plan name from payment if available
          if (latestPayment?.pricing_plan?.name) {
            planName = latestPayment.pricing_plan.name
          }
          
          // Use subscription dates if available
          if (subscription) {
            if (subscription.end_date) {
              endDate = new Date(subscription.end_date)
              const today = new Date()
              today.setHours(0, 0, 0, 0)
              const diffTime = endDate - today
              daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
              
              if (subscription.status === 'active') {
                if (daysRemaining > 30) {
                  subscriptionStatus = 'active'
                } else if (daysRemaining > 0) {
                  subscriptionStatus = 'expiring'
                } else {
                  subscriptionStatus = 'expired'
                  daysRemaining = 0
                }
              } else if (subscription.status === 'pending') {
                subscriptionStatus = 'pending'
              }
            }
            
            if (subscription.start_date) {
              startDate = new Date(subscription.start_date)
            }
            totalAmount = subscription.total_amount
          } else if (latestPayment) {
            // Use payment data if no subscription exists
            const pricingPlan = latestPayment.pricing_plan
            if (pricingPlan) {
              const durationMonths = pricingPlan.duration_months || 1
              const paymentDate = new Date(latestPayment.payment_date || latestPayment.paid_at || latestPayment.created_at)
              startDate = paymentDate
              endDate = new Date(paymentDate)
              endDate.setMonth(endDate.getMonth() + durationMonths)
              
              const today = new Date()
              today.setHours(0, 0, 0, 0)
              const diffTime = endDate - today
              daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
              
              if (daysRemaining > 30) {
                subscriptionStatus = 'active'
              } else if (daysRemaining > 0) {
                subscriptionStatus = 'expiring'
              } else {
                subscriptionStatus = 'expired'
                daysRemaining = 0
              }
              totalAmount = latestPayment.total_amount || latestPayment.amount
            }
          }

          return {
            ...child,
            name: {
              en: `${child.first_name || ''} ${child.last_name || ''}`.trim(),
              ar: `${child.first_name_ar || child.first_name || ''} ${child.last_name_ar || child.last_name || ''}`.trim()
            },
            program: child.program ? {
              en: child.program.name,
              ar: child.program.name_ar || child.program.name
            } : null,
            subscription,
            daysRemaining,
            subscriptionStatus,
            endDate,
            startDate,
            planName,
            totalAmount
          }
        })
        setChildren(childrenData)
      }

      if (paymentsRes.success) {
        const payments = (paymentsRes.data || []).map(p => {
          // Try multiple date fields
          const dateValue = p.payment_date || p.paid_at || p.created_at || p.createdAt || p.updated_at;
          return {
            ...p,
            formattedDate: dateValue ? new Date(dateValue).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US') : '-',
            playerName: p.player ? `${p.player.first_name || ''} ${p.player.last_name || ''}`.trim() : '-',
            planName: p.pricing_plan?.name || null
          };
        })
        setInvoices(payments)
      }
    } catch (err) {
      console.error('Error fetching payments:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.id, language])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const formatCurrency = (amount) => `SAR ${(parseFloat(amount) || 0).toLocaleString()}`
  const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US') : '-'

  const getStatusBadge = (status) => {
    if (status === 'active') {
      return {
        class: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
        label: language === 'ar' ? 'نشط' : 'Active'
      }
    }
    if (status === 'expiring') {
      return {
        class: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400',
        label: language === 'ar' ? 'ينتهي قريباً' : 'Expiring Soon'
      }
    }
    if (status === 'expired') {
      return {
        class: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400',
        label: language === 'ar' ? 'منتهي' : 'Expired'
      }
    }
    if (status === 'pending') {
      return {
        class: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
        label: language === 'ar' ? 'قيد المراجعة' : 'Pending'
      }
    }
    return {
      class: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400',
      label: language === 'ar' ? 'غير مشترك' : 'No Subscription'
    }
  }


  const getPaymentStatusBadge = (status) => {
    if (status === 'completed') {
      return {
        class: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
        label: language === 'ar' ? 'مكتمل' : 'Completed'
      }
    }
    if (status === 'pending') {
      return {
        class: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400',
        label: language === 'ar' ? 'معلق' : 'Pending'
      }
    }
    if (status === 'refunded') {
      return {
        class: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
        label: language === 'ar' ? 'مسترد' : 'Refunded'
      }
    }
    return {
      class: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400',
      label: status
    }
  }

  const activeCount = children.filter(c => c.subscriptionStatus === 'active').length
  const expiringCount = children.filter(c => c.subscriptionStatus === 'expiring').length

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-secondary dark:text-white">
          {language === 'ar' ? 'المدفوعات' : 'Payments'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {language === 'ar' ? 'إدارة الاشتراكات والمدفوعات' : 'Manage subscriptions and payments'}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{language === 'ar' ? 'الاشتراكات النشطة' : 'Active Subscriptions'}</p>
              <p className="text-2xl font-bold text-secondary dark:text-white">{activeCount}</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{language === 'ar' ? 'تنتهي قريباً' : 'Expiring Soon'}</p>
              <p className="text-2xl font-bold text-yellow-500">{expiringCount}</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-primary to-yellow-400 rounded-2xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{language === 'ar' ? 'الفواتير' : 'Invoices'}</p>
              <p className="text-2xl font-bold text-secondary dark:text-white">{invoices.length}</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Children Subscriptions */}
      <GlassCard className="p-4 md:p-6">
        <h2 className="text-lg font-bold text-secondary dark:text-white mb-4">
          {language === 'ar' ? 'اشتراكات اللاعبين' : 'Players Subscriptions'}
        </h2>
        {children.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-gray-500 mb-2">{language === 'ar' ? 'لا يوجد لاعبين مسجلين' : 'No players registered'}</p>
            <p className="text-sm text-gray-400">{language === 'ar' ? 'قم بتسجيل اللاعب في برنامج للبدء' : 'Register your player in a program to get started'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {children.map(child => {
              const statusBadge = getStatusBadge(child.subscriptionStatus)
              return (
                <div key={child.id} className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center overflow-hidden">
                        {child.avatar ? (
                          <img 
                            src={child.avatar.startsWith('http') ? child.avatar : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${child.avatar}`} 
                            alt={child.name?.[language]} 
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
                          />
                        ) : null}
                        <span 
                          className="text-lg font-bold text-primary w-full h-full items-center justify-center"
                          style={{ display: child.avatar ? 'none' : 'flex' }}
                        >
                          {(child.name?.[language] || child.name?.en || '?')[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-bold text-secondary dark:text-white">{child.name?.[language] || child.name?.en}</p>
                        <p className="text-sm text-gray-500">{child.program?.[language] || (language === 'ar' ? 'غير مسجل في برنامج' : 'Not enrolled in program')}</p>
                        {child.planName && (
                          <p className="text-xs text-primary">{child.planName}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between md:justify-end gap-4">
                      <div className="text-center md:text-end">
                        {child.subscriptionStatus === 'pending' ? (
                          <p className="text-sm text-blue-500">{language === 'ar' ? 'قيد المراجعة' : 'Pending approval'}</p>
                        ) : child.subscriptionStatus !== 'inactive' ? (
                          <>
                            <p className={`text-2xl font-bold ${child.daysRemaining <= 7 ? 'text-red-500' : child.daysRemaining <= 30 ? 'text-yellow-500' : 'text-emerald-500'}`}>
                              {child.daysRemaining}
                            </p>
                            <p className="text-xs text-gray-500">{language === 'ar' ? 'يوم متبقي' : 'days left'}</p>
                          </>
                        ) : (
                          <p className="text-sm text-gray-400">{language === 'ar' ? 'غير مشترك' : 'No subscription'}</p>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusBadge.class}`}>
                        {statusBadge.label}
                      </span>
                    </div>
                  </div>
                  {(child.subscription || child.subscriptionStatus !== 'inactive') && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-white/10 flex flex-wrap gap-4 text-xs text-gray-500">
                      {child.startDate && (
                        <span>{language === 'ar' ? 'بداية:' : 'Start:'} {formatDate(child.startDate)}</span>
                      )}
                      {child.endDate && (
                        <span>{language === 'ar' ? 'نهاية:' : 'End:'} {formatDate(child.endDate)}</span>
                      )}
                      {child.totalAmount && (
                        <span>{language === 'ar' ? 'المبلغ:' : 'Amount:'} {formatCurrency(child.totalAmount)}</span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </GlassCard>

      {/* Payment History */}
      <GlassCard className="p-4 md:p-6">
        <h2 className="text-lg font-bold text-secondary dark:text-white mb-4">
          {language === 'ar' ? 'سجل المدفوعات' : 'Payment History'}
        </h2>
        {invoices.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-500 mb-2">{language === 'ar' ? 'لا توجد فواتير بعد' : 'No invoices yet'}</p>
            <p className="text-sm text-gray-400">{language === 'ar' ? 'ستظهر الفواتير هنا بعد الدفع' : 'Invoices will appear here after payment'}</p>
          </div>
        ) : (
          <>
            {/* Mobile Cards View */}
            <div className="md:hidden space-y-3">
              {invoices.map(invoice => {
                const statusBadge = getPaymentStatusBadge(invoice.status)
                return (
                  <div key={invoice.id} className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-secondary dark:text-white">{invoice.playerName}</p>
                        <p className="text-xs text-gray-500">{invoice.invoice_number || invoice.id?.slice(0, 20)}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusBadge.class}`}>
                        {statusBadge.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-white/10">
                      <p className="text-sm text-gray-500">{invoice.formattedDate}</p>
                      <p className="text-lg font-bold text-primary">{formatCurrency(invoice.total_amount || invoice.amount || 0)}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-start border-b border-gray-200 dark:border-white/10">
                    <th className="pb-3 text-sm font-semibold text-gray-500 text-start">{language === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}</th>
                    <th className="pb-3 text-sm font-semibold text-gray-500 text-start">{language === 'ar' ? 'اللاعب' : 'Player'}</th>
                    <th className="pb-3 text-sm font-semibold text-gray-500 text-start">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                    <th className="pb-3 text-sm font-semibold text-gray-500 text-start">{language === 'ar' ? 'المبلغ' : 'Amount'}</th>
                    <th className="pb-3 text-sm font-semibold text-gray-500 text-start">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(invoice => {
                    const statusBadge = getPaymentStatusBadge(invoice.status)
                    return (
                      <tr key={invoice.id} className="border-b border-gray-100 dark:border-white/5">
                        <td className="py-4 text-sm text-secondary dark:text-white font-mono">{invoice.invoice_number || invoice.id?.slice(0, 20)}</td>
                        <td className="py-4 text-sm text-gray-600 dark:text-gray-300">{invoice.playerName}</td>
                        <td className="py-4 text-sm text-gray-500">{invoice.formattedDate}</td>
                        <td className="py-4 text-sm font-semibold text-primary">{formatCurrency(invoice.total_amount || invoice.amount || 0)}</td>
                        <td className="py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusBadge.class}`}>
                            {statusBadge.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </GlassCard>
    </div>
  )
}
