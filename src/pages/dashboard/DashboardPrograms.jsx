import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { useAuth } from '../../hooks/useAuth'
import { programsService, playersService, paymentsService, discountsService } from '../../services'
import GlassCard from '../../components/ui/GlassCard'
import Button from '../../components/ui/Button'

export default function DashboardPrograms() {
  const { language } = useLanguage()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [programs, setPrograms] = useState([])
  const [children, setChildren] = useState([])
  const [selectedProgram, setSelectedProgram] = useState(null)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [selectedChild, setSelectedChild] = useState('')
  const [receiptFile, setReceiptFile] = useState(null)
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [paymentSuccess, setPaymentSuccess] = useState('')
  const [availableDiscounts, setAvailableDiscounts] = useState([])
  const [appliedDiscount, setAppliedDiscount] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer') // 'online' (coming soon) or 'bank_transfer'

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [programsRes, childrenRes] = await Promise.all([
        programsService.getPublic(user?.branch_id ? { branch_id: user.branch_id } : {}),
        user?.id ? playersService.getByParent(user.id) : Promise.resolve({ success: true, data: [] })
      ])
      if (programsRes.success) {
        const formatSchedule = (schedule = [], lang = 'en') => {
          if (!Array.isArray(schedule) || schedule.length === 0) return lang === 'ar' ? 'غير محدد' : 'Not set'
          const dayMap = {
            sunday: { en: 'Sun', ar: 'الأحد' },
            monday: { en: 'Mon', ar: 'الإثنين' },
            tuesday: { en: 'Tue', ar: 'الثلاثاء' },
            wednesday: { en: 'Wed', ar: 'الأربعاء' },
            thursday: { en: 'Thu', ar: 'الخميس' },
            friday: { en: 'Fri', ar: 'الجمعة' },
            saturday: { en: 'Sat', ar: 'السبت' }
          }
          return schedule
            .map((item) => {
              const label = dayMap[item.day?.toLowerCase?.()]?.[lang] || item.day || ''
              const time = item.start_time && item.end_time ? `${item.start_time} - ${item.end_time}` : ''
              return `${label} ${time}`.trim()
            })
            .filter(Boolean)
            .join('، ')
        }

        const typeLabel = (type, lang = 'en') => {
          const map = {
            training: { en: 'Training', ar: 'تدريب' },
            competition: { en: 'Competition', ar: 'منافسات' },
            camp: { en: 'Camp', ar: 'معسكر' },
            private: { en: 'Private', ar: 'خاص' }
          }
          return map[type]?.[lang] || type || (lang === 'ar' ? 'غير محدد' : 'Not set')
        }

        const normalized = (programsRes.data || []).map((program) => ({
          ...program,
          name: { en: program.name, ar: program.name_ar || program.name },
          description: { en: program.description, ar: program.description_ar || program.description },
          pricingPlans: program.pricing_plans || [],
          price: program.price_monthly ?? program.price ?? 0,
          capacity: program.capacity ?? null,
          current_enrollment: program.current_enrollment ?? 0,
          ageRange: program.age_group_min && program.age_group_max
            ? `${program.age_group_min}-${program.age_group_max}`
            : (language === 'ar' ? 'غير محدد' : 'Not set'),
          schedule: {
            en: formatSchedule(program.schedule, 'en'),
            ar: formatSchedule(program.schedule, 'ar')
          },
          duration: {
            en: typeLabel(program.type, 'en'),
            ar: typeLabel(program.type, 'ar')
          }
        }))
        setPrograms(normalized)
      }
      if (childrenRes.success) {
        const normalizedChildren = (childrenRes.data || []).map((child) => {
          const firstName = child.first_name || child.firstName || ''
          const lastName = child.last_name || child.lastName || ''
          const fullName = `${firstName} ${lastName}`.trim()
          const fullNameAr = child.first_name_ar
            ? `${child.first_name_ar} ${child.last_name_ar || ''}`.trim()
            : fullName

          return {
            ...child,
            name: {
              en: child.name?.en || fullName || child.name?.ar || child.name || '',
              ar: child.name?.ar || fullNameAr || fullName || child.name?.en || child.name || ''
            }
          }
        })
        setChildren(normalizedChildren)
        
        // Auto-select self for self_player accounts
        if (user?.account_type === 'self_player' && normalizedChildren.length > 0) {
          // Find the player record that matches this user (self_user_id = user.id)
          const selfPlayer = normalizedChildren.find(c => c.self_user_id === user.id) || normalizedChildren[0]
          if (selfPlayer) {
            setSelectedChild(selfPlayer.id)
          }
        }
      }
    } catch (err) {
      console.error('Error fetching programs:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.id, user?.account_type])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Fetch available discounts when player and plan are selected
  useEffect(() => {
    setAvailableDiscounts([])
    setAppliedDiscount(null)
    if (!selectedChild || !selectedPlan) return
    const fetchDiscounts = async () => {
      try {
        const params = { player_id: selectedChild }
        if (selectedPlan?.id) params.pricing_plan_id = selectedPlan.id
        console.log('🎯 Fetching discounts with params:', params)
        const response = await discountsService.getAvailable(params)
        console.log('🎯 Discount response:', response)
        if (response.success && response.data?.length > 0) {
          console.log('🎯 Found discounts:', response.data.length)
          setAvailableDiscounts(response.data)
          // Auto-apply the best discount (first one, sorted by value DESC from backend)
          setAppliedDiscount(response.data[0])
        } else {
          console.log('🎯 No discounts found')
        }
      } catch (err) {
        console.error('🎯 Error fetching discounts:', err)
      }
    }
    fetchDiscounts()
  }, [selectedChild, selectedPlan])

  const formatCurrency = (amount) => `SAR ${Number(amount || 0).toLocaleString()}`

  const handleReceiptChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setReceiptFile(file)
      setPaymentError('')
      setPaymentSuccess('')
    }
  }

  const handleSubmitReceipt = async () => {
    if (!selectedChild || !receiptFile || !selectedProgram || !selectedPlan) {
      setPaymentError(language === 'ar' ? 'يرجى اختيار اللاعب والخطة ورفع إيصال الدفع' : 'Please select a player, plan, and upload a receipt')
      return
    }

    try {
      setIsSubmittingPayment(true)
      setPaymentError('')

      // Calculate discounted amount
      const basePrice = parseFloat(selectedPlan.price) || 0
      let finalAmount = basePrice
      let discountAmount = 0
      if (appliedDiscount) {
        discountAmount = appliedDiscount.discount_type === 'percentage'
          ? (basePrice * parseFloat(appliedDiscount.discount_value) / 100)
          : Math.min(parseFloat(appliedDiscount.discount_value), basePrice)
        finalAmount = Math.max(0, basePrice - discountAmount)
      }

      const formData = new FormData()
      formData.append('player_id', selectedChild)
      formData.append('program_id', selectedProgram.id)
      formData.append('pricing_plan_id', selectedPlan.id)
      formData.append('amount', finalAmount.toFixed(2))
      if (discountAmount > 0) {
        formData.append('discount_amount', discountAmount.toFixed(2))
      }
      if (appliedDiscount) {
        formData.append('discount_id', appliedDiscount.id)
      }
      formData.append('description', `Program enrollment: ${selectedProgram.name?.[language] || selectedProgram.name} - ${selectedPlan.name}`)
      formData.append('receipt', receiptFile)

      const response = await paymentsService.createReceipt(formData)
      if (response.success) {
        setPaymentSuccess(language === 'ar' ? 'تم رفع الإيصال بنجاح، سيتم مراجعته' : 'Receipt uploaded successfully. It will be reviewed.')
        setSelectedProgram(null)
        setSelectedPlan(null)
        setSelectedChild('')
        setReceiptFile(null)
        setAvailableDiscounts([])
        setAppliedDiscount(null)
      } else {
        setPaymentError(response.message || (language === 'ar' ? 'فشل رفع الإيصال' : 'Failed to submit receipt'))
      }
    } catch (err) {
      console.error('Error submitting receipt:', err)
      setPaymentError(language === 'ar' ? 'فشل رفع الإيصال' : 'Failed to submit receipt')
    } finally {
      setIsSubmittingPayment(false)
    }
  }

  const resetSelection = () => {
    setSelectedProgram(null)
    setSelectedPlan(null)
    setSelectedChild('')
    setReceiptFile(null)
    setPaymentError('')
    setPaymentSuccess('')
    setAvailableDiscounts([])
    setAppliedDiscount(null)
    setPaymentMethod('bank_transfer')
  }

  // Handle online payment
  const handleOnlinePayment = async () => {
    if (!selectedChild || !selectedProgram || !selectedPlan) {
      setPaymentError(language === 'ar' ? 'يرجى اختيار اللاعب والخطة' : 'Please select a player and plan')
      return
    }

    try {
      setIsSubmittingPayment(true)
      setPaymentError('')

      const response = await paymentsService.initiateOnlinePayment({
        player_id: selectedChild,
        pricing_plan_id: selectedPlan.id,
        discount_id: appliedDiscount?.id || null,
        description: `${selectedProgram.name?.[language] || selectedProgram.name} - ${selectedPlan.name}`
      })

      if (response.success && response.data?.redirect_url) {
        // Redirect to payment gateway
        window.location.href = response.data.redirect_url
      } else {
        setPaymentError(response.message || (language === 'ar' ? 'فشل بدء الدفع' : 'Failed to initiate payment'))
      }
    } catch (err) {
      console.error('Error initiating online payment:', err)
      setPaymentError(language === 'ar' ? 'فشل بدء الدفع الإلكتروني' : 'Failed to initiate online payment')
    } finally {
      setIsSubmittingPayment(false)
    }
  }

  // Get display price for a program
  const getDisplayPrice = (program) => {
    if (program.pricingPlans && program.pricingPlans.length > 0) {
      const firstPlan = program.pricingPlans[0]
      return { price: firstPlan.price, label: firstPlan.name }
    }
    return { price: program.price, label: language === 'ar' ? 'شهري' : 'Monthly' }
  }

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
          {language === 'ar' ? 'البرامج المتاحة' : 'Available Programs'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {language === 'ar' ? 'استعرض البرامج وسجل لاعبيك' : 'Browse programs and enroll your players'}
        </p>
      </div>

      {/* No Children Warning */}
      {children.length === 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-yellow-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-semibold text-yellow-700 dark:text-yellow-400">
                {language === 'ar' ? 'لم يتم تسجيل أي لاعب بعد' : 'No players registered yet'}
              </p>
              <p className="text-sm text-yellow-600 dark:text-yellow-300 mt-1">
                {language === 'ar' ? 'قم بتسجيل اللاعب أولاً من صفحة "أبنائي" قبل التسجيل في البرامج' : 'Register your player first from "My Children" page before enrolling in programs'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Programs Grid */}
      {programs.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <p className="text-gray-500 mb-2">{language === 'ar' ? 'لا توجد برامج متاحة حالياً' : 'No programs available yet'}</p>
          <p className="text-sm text-gray-400">{language === 'ar' ? 'ستظهر البرامج هنا عند إضافتها من قبل الإدارة' : 'Programs will appear here when added by the administration'}</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.map(program => {
            const isSelected = selectedProgram?.id === program.id
            const displayPrice = getDisplayPrice(program)
            const hasPlans = program.pricingPlans && program.pricingPlans.length > 0
            
            return (
            <GlassCard key={program.id} className="overflow-hidden">
              <div className={`h-2 bg-gradient-to-r ${program.color || 'from-primary to-yellow-400'}`}></div>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{program.icon || '⚽'}</span>
                  <div>
                    <h3 className="font-bold text-secondary dark:text-white">{program.name?.[language]}</h3>
                    <p className="text-sm text-gray-500">{language === 'ar' ? 'الفئة العمرية:' : 'Age:'} {program.ageRange}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">{program.description?.[language]}</p>
                
                {/* Pricing Plans Display */}
                {hasPlans ? (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-2">{language === 'ar' ? 'خطط الأسعار:' : 'Pricing Plans:'}</p>
                    <div className="flex flex-wrap gap-2">
                      {program.pricingPlans.map((plan, idx) => (
                        <div key={idx} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-lg">
                          {plan.name}: {formatCurrency(plan.price)}
                          {plan.duration_months && <span className="text-gray-500"> ({plan.duration_months} {language === 'ar' ? 'شهر' : 'mo'})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {program.schedule?.[language]}
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-white/10">
                  <div>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(displayPrice.price)}</p>
                    <p className="text-xs text-gray-500">{displayPrice.label}</p>
                  </div>
                  <Button
                    onClick={() => {
                      setSelectedProgram(program)
                      setSelectedPlan(hasPlans ? program.pricingPlans[0] : null)
                      // For self_player, auto-re-select their player; for parent, reset to allow selection
                      if (user?.account_type === 'self_player') {
                        const selfPlayer = children.find(c => c.self_user_id === user?.id) || children[0]
                        if (selfPlayer) setSelectedChild(selfPlayer.id)
                      } else {
                        setSelectedChild('')
                      }
                      setReceiptFile(null)
                      setPaymentError('')
                    }}
                    disabled={children.length === 0}
                    className={`${children.length === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-primary hover:bg-primary/90'}`}
                  >
                    {language === 'ar' ? 'تسجيل' : 'Enroll'}
                  </Button>
                </div>
              </div>

              {isSelected && children.length > 0 && (
                <div className="border-t border-gray-200 dark:border-white/10 p-5 bg-gray-50/60 dark:bg-white/5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-secondary dark:text-white">
                      {language === 'ar' ? 'تسجيل في البرنامج' : 'Enroll in Program'}
                    </h4>
                    <button onClick={resetSelection} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Select Child - hidden for self_player, they are auto-selected */}
                    {user?.account_type === 'self_player' ? (
                      <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <span className="font-medium">{language === 'ar' ? 'التسجيل باسم:' : 'Enrolling as:'}</span>{' '}
                          {children.find(c => c.id === selectedChild)?.name?.[language] || user?.first_name + ' ' + user?.last_name}
                        </p>
                      </div>
                    ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {language === 'ar' ? 'اختر اللاعب' : 'Select Player'}
                      </label>
                      <select
                        value={selectedChild}
                        onChange={(e) => setSelectedChild(e.target.value)}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">{language === 'ar' ? 'اختر لاعباً' : 'Select a player'}</option>
                        {children.map(child => (
                          <option key={child.id} value={child.id}>
                            {child.name?.[language] || child.name?.en || child.name?.ar || ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    )}

                    {/* Select Pricing Plan */}
                    {hasPlans && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {language === 'ar' ? 'اختر خطة الاشتراك' : 'Select Subscription Plan'}
                        </label>
                        <div className="space-y-2">
                          {program.pricingPlans.map((plan) => (
                            <label
                              key={plan.id}
                              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                                selectedPlan?.id === plan.id
                                  ? 'border-primary bg-primary/10'
                                  : 'border-gray-200 dark:border-white/10 hover:border-primary/50'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="radio"
                                  name="pricing_plan"
                                  checked={selectedPlan?.id === plan.id}
                                  onChange={() => setSelectedPlan(plan)}
                                  className="w-4 h-4 text-primary focus:ring-primary"
                                />
                                <div>
                                  <p className="font-medium text-secondary dark:text-white">{plan.name}</p>
                                  {plan.duration_months && (
                                    <p className="text-xs text-gray-500">
                                      {plan.duration_months} {language === 'ar' ? 'شهر' : 'months'}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <p className="font-bold text-primary">{formatCurrency(plan.price)}</p>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Payment Method Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {language === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {/* Online Payment Option - Coming Soon */}
                        <div
                          className="flex flex-col items-center p-4 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 opacity-60 cursor-not-allowed relative"
                        >
                          <div className="absolute top-2 right-2 rtl:right-auto rtl:left-2">
                            <span className="text-[10px] bg-yellow-500 text-white px-2 py-0.5 rounded-full font-medium">
                              {language === 'ar' ? 'قريباً' : 'Soon'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                          </div>
                          <span className="text-sm font-medium text-gray-400">
                            {language === 'ar' ? 'دفع إلكتروني' : 'Online Payment'}
                          </span>
                          <span className="text-xs text-gray-400 mt-1 text-center">
                            {language === 'ar' ? 'مدى، STC Pay، Apple Pay' : 'Mada, STC Pay, Apple Pay'}
                          </span>
                        </div>

                        {/* Bank Transfer Option */}
                        <label
                          className={`flex flex-col items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            paymentMethod === 'bank_transfer'
                              ? 'border-primary bg-primary/10'
                              : 'border-gray-200 dark:border-white/10 hover:border-primary/50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="payment_method"
                            value="bank_transfer"
                            checked={paymentMethod === 'bank_transfer'}
                            onChange={() => setPaymentMethod('bank_transfer')}
                            className="sr-only"
                          />
                          <div className="flex items-center gap-2 mb-2">
                            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <span className="text-sm font-medium text-secondary dark:text-white">
                            {language === 'ar' ? 'تحويل بنكي' : 'Bank Transfer'}
                          </span>
                          <span className="text-xs text-gray-500 mt-1 text-center">
                            {language === 'ar' ? 'رفع إيصال التحويل' : 'Upload transfer receipt'}
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* Upload Receipt */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {language === 'ar' ? 'إيصال الدفع' : 'Payment Receipt'}
                      </label>
                      <div className="border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl p-4 text-center">
                        <label className="cursor-pointer text-sm text-gray-500">
                          {receiptFile ? receiptFile.name : (language === 'ar' ? 'اضغط لرفع الإيصال' : 'Click to upload receipt')}
                          <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleReceiptChange} />
                        </label>
                      </div>
                    </div>

                    {/* Amount Display */}
                    {selectedPlan && (
                        <div className="mt-2">
                          {appliedDiscount ? (
                            <div className="p-3 rounded-xl bg-green-50/80 dark:bg-green-900/10 border border-green-200/50 dark:border-green-800/30 space-y-1">
                              <div className="flex items-center gap-2 mb-1">
                                <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                                <span className="text-xs font-semibold text-green-700 dark:text-green-400">
                                  {language === 'ar' ? 'خصم مطبق!' : 'Discount Applied!'}
                                </span>
                              </div>
                              <div className="flex justify-between text-xs text-gray-500">
                                <span>{language === 'ar' ? 'السعر الأصلي:' : 'Original price:'}</span>
                                <span className="line-through">{formatCurrency(selectedPlan.price)}</span>
                              </div>
                              <div className="flex justify-between text-xs text-green-600 dark:text-green-400">
                                <span>{language === 'ar' ? 'الخصم:' : 'Discount:'}</span>
                                <span>
                                  -{appliedDiscount.discount_type === 'percentage'
                                    ? `${appliedDiscount.discount_value}%`
                                    : formatCurrency(appliedDiscount.discount_value)}
                                  {appliedDiscount.reason ? ` (${appliedDiscount.reason})` : ''}
                                </span>
                              </div>
                              {(() => {
                                const base = parseFloat(selectedPlan.price) || 0
                                const discAmt = appliedDiscount.discount_type === 'percentage'
                                  ? (base * parseFloat(appliedDiscount.discount_value) / 100)
                                  : Math.min(parseFloat(appliedDiscount.discount_value), base)
                                const final_ = Math.max(0, base - discAmt)
                                return (
                                  <div className="flex justify-between text-sm font-bold text-primary border-t border-green-200 dark:border-green-800/30 pt-1 mt-1">
                                    <span>{language === 'ar' ? 'المبلغ المطلوب:' : 'Amount due:'}</span>
                                    <span>{formatCurrency(final_.toFixed(2))}</span>
                                  </div>
                                )
                              })()}
                            </div>
                          ) : (
                            <p className="text-sm text-primary font-medium">
                              {language === 'ar' ? 'المبلغ المطلوب:' : 'Amount due:'} {formatCurrency(selectedPlan.price)}
                            </p>
                          )}
                        </div>
                      )}
                    {paymentError && (
                      <p className="text-sm text-red-500 mt-2">{paymentError}</p>
                    )}
                    {paymentSuccess && (
                      <p className="text-sm text-emerald-600 mt-2">{paymentSuccess}</p>
                    )}

                    <div className="flex gap-3">
                      <Button
                        onClick={handleSubmitReceipt}
                        disabled={!selectedChild || !receiptFile || isSubmittingPayment || (hasPlans && !selectedPlan)}
                        className="flex-1 bg-primary hover:bg-primary/90 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {isSubmittingPayment
                          ? (language === 'ar' ? 'جاري الإرسال...' : 'Submitting...')
                          : (language === 'ar' ? 'إرسال الإيصال' : 'Submit Receipt')}
                      </Button>
                      <Button onClick={resetSelection} className="bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-white/20">
                        {language === 'ar' ? 'إلغاء' : 'Cancel'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </GlassCard>
          )})}
        </div>
      )}

    </div>
  )
}
