import { useState, useEffect, useCallback, useRef } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { paymentsService, branchesService, discountsService } from '../../services'
import playersService from '../../services/players.service'
import programsService from '../../services/programs.service'
import GlassCard from '../../components/ui/GlassCard'
import Button from '../../components/ui/Button'
import ChangeHistoryModal from '../../components/common/ChangeHistoryModal'
import NumericInput from '../../components/ui/NumericInput'

export default function Payments() {
  const { language } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [payments, setPayments] = useState([])
  const [stats, setStats] = useState({ totalRevenue: 0, pendingAmount: 0 })
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [branches, setBranches] = useState([])
  const [programs, setPrograms] = useState([])
  const [players, setPlayers] = useState([])
  const [selectedBranchId, setSelectedBranchId] = useState('')
  const [selectedProgramId, setSelectedProgramId] = useState('')
  const [editingPaymentId, setEditingPaymentId] = useState(null)
  const [editingPaymentStatus, setEditingPaymentStatus] = useState(null)
  const [paymentStatus, setPaymentStatus] = useState('pending')
  const receiptFileRef = useRef(null)
  const [receiptPreview, setReceiptPreview] = useState(null)
  const [pricingPlans, setPricingPlans] = useState([])
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [availableDiscounts, setAvailableDiscounts] = useState([])
  const [selectedDiscountId, setSelectedDiscountId] = useState('')
  const [historyTarget, setHistoryTarget] = useState(null)

  const [paymentForm, setPaymentForm] = useState({
    playerId: '',
    amount: '',
    method: 'cash',
    receiptNumber: '',
    notes: '',
    receiptFile: null
  })

  const tabs = [
    { id: 'all', label: { en: 'All Transactions', ar: 'جميع المعاملات' } },
    { id: 'receipts', label: { en: 'Receipts', ar: 'إيصالات' } },
    { id: 'completed', label: { en: 'Completed', ar: 'مكتملة' } },
    { id: 'pending', label: { en: 'Pending', ar: 'معلقة' } },
    { id: 'refunded', label: { en: 'Refunded', ar: 'مستردة' } },
  ]

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true)
      const params = { limit: 50 }
      if (activeTab !== 'all') {
        if (activeTab === 'receipts') {
          params.status = 'pending'
        } else {
          params.status = activeTab
        }
      }
      
      const [paymentsRes, statsRes, branchesRes] = await Promise.all([
        paymentsService.getAll(params),
        paymentsService.getStats(),
        branchesService.getAll({ limit: 200 })
      ])
      
      if (paymentsRes.success) {
        const data = paymentsRes.data || []
        setPayments(activeTab === 'receipts' ? data.filter((p) => p.receipt_url) : data)
      }
      if (statsRes.success) {
        setStats(statsRes.data || { totalRevenue: 0, pendingAmount: 0 })
      }
      if (branchesRes.success) {
        const transformedBranches = (branchesRes.data || []).map((b) => ({
          id: b.id,
          name: { en: b.name, ar: b.name_ar || b.name }
        }))
        setBranches(transformedBranches)
      }
    } catch (err) {
      console.error('Error fetching payments:', err)
      setError(language === 'ar' ? 'فشل في تحميل المدفوعات' : 'Failed to load payments')
    } finally {
      setLoading(false)
    }
  }, [activeTab, language])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  useEffect(() => {
    const fetchProgramsAndPlayers = async () => {
      if (!selectedBranchId) {
        setPrograms([])
        setPlayers([])
        setSelectedProgramId('')
        setPricingPlans([])
        setSelectedPlanId('')
        return
      }
      try {
        const [programsRes, playersRes] = await Promise.all([
          programsService.getByBranch(selectedBranchId),
          playersService.getByBranch(selectedBranchId)
        ])
        if (programsRes.success) {
          const transformedPrograms = (programsRes.data || []).map((p) => ({
            id: p.id,
            name: { en: p.name, ar: p.name_ar || p.name },
            pricingPlans: p.pricing_plans || []
          }))
          setPrograms(transformedPrograms)
        } else {
          setPrograms([])
        }
        if (playersRes.success) {
          const transformedPlayers = (playersRes.data || []).map((p) => ({
            id: p.id,
            parentId: p.parent_id || p.parent?.id || '',
            programId: p.program_id || p.program?.id || '',
            name: {
              en: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
              ar: `${p.first_name_ar || p.first_name || ''} ${p.last_name_ar || p.last_name || ''}`.trim()
            },
            registration: p.registration_number || ''
          }))
          setPlayers(transformedPlayers)
        } else {
          setPlayers([])
        }
      } catch (err) {
        console.error('Error fetching programs/players:', err)
      }
    }

    fetchProgramsAndPlayers()
  }, [selectedBranchId])

  // Update pricing plans when program is selected
  useEffect(() => {
    if (!selectedProgramId) {
      setPricingPlans([])
      setSelectedPlanId('')
      return
    }
    const selectedProgram = programs.find((p) => String(p.id) === String(selectedProgramId))
    if (selectedProgram?.pricingPlans) {
      setPricingPlans(selectedProgram.pricingPlans)
    } else {
      setPricingPlans([])
    }
    setSelectedPlanId('')
  }, [selectedProgramId, programs])

  // Auto-fill amount when plan is selected
  useEffect(() => {
    if (!selectedPlanId) return
    const selectedPlan = pricingPlans.find((p) => String(p.id) === String(selectedPlanId))
    if (selectedPlan?.price) {
      setPaymentForm((prev) => ({ ...prev, amount: String(selectedPlan.price) }))
    }
  }, [selectedPlanId, pricingPlans])

  // Fetch available discounts when player/plan changes
  useEffect(() => {
    setSelectedDiscountId('')
    setAvailableDiscounts([])
    if (!paymentForm.playerId) return
    const fetchDiscounts = async () => {
      try {
        const params = { player_id: paymentForm.playerId }
        if (selectedPlanId) params.pricing_plan_id = selectedPlanId
        const response = await discountsService.getAvailable(params)
        if (response.success) {
          setAvailableDiscounts(response.data || [])
        }
      } catch (err) {
        console.error('Error fetching discounts:', err)
      }
    }
    fetchDiscounts()
  }, [paymentForm.playerId, selectedPlanId])

  useEffect(() => {
    if (!editingPaymentId || !paymentForm.playerId || selectedProgramId) return
    const matchedPlayer = players.find((player) => player.id === paymentForm.playerId)
    if (matchedPlayer?.programId) {
      setSelectedProgramId(matchedPlayer.programId)
    }
  }, [editingPaymentId, paymentForm.playerId, players, selectedProgramId])

  const formatCurrency = (amount) => `SAR ${(parseFloat(amount) || 0).toLocaleString()}`
  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')
  const formatDateTime = (dateStr) => new Date(dateStr).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US')
  const getPaymentDate = (payment) => payment.created_at || payment.createdAt || payment.paid_at || payment.paidAt || null
  const getLastEditorName = (payment) => {
    const editor = payment.last_updated_by
    if (!editor) return language === 'ar' ? 'غير معروف' : 'Unknown'
    const fullName = `${editor.first_name || ''} ${editor.last_name || ''}`.trim()
    return fullName || (language === 'ar' ? 'غير معروف' : 'Unknown')
  }
  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
  const fileBaseUrl = apiBaseUrl.replace(/\/api\/?$/, '')
  const getReceiptUrl = (receiptUrl) => {
    if (!receiptUrl) return ''
    if (receiptUrl.startsWith('http')) return receiptUrl
    return `${fileBaseUrl}${receiptUrl.startsWith('/') ? '' : '/'}${receiptUrl}`
  }
  const handleDownloadReceipt = async (receiptUrl) => {
    try {
      setError(null)
      const url = getReceiptUrl(receiptUrl)
      const token = localStorage.getItem('accessToken')
      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      })
      if (!response.ok) {
        throw new Error('Download failed')
      }
      const blob = await response.blob()
      const fileName = receiptUrl?.split('/').pop() || 'receipt'
      const objectUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(objectUrl)
    } catch (err) {
      console.error('Error downloading receipt:', err)
      setError(language === 'ar' ? 'فشل تنزيل الإيصال' : 'Failed to download receipt')
    }
  }

  const statusLabel = (status) => {
    if (status === 'completed') return language === 'ar' ? 'مكتملة' : 'Completed'
    if (status === 'pending') return language === 'ar' ? 'معلقة' : 'Pending'
    if (status === 'refunded') return language === 'ar' ? 'مستردة' : 'Refunded'
    if (status === 'cancelled') return language === 'ar' ? 'ملغاة' : 'Cancelled'
    if (status === 'failed') return language === 'ar' ? 'فاشلة' : 'Failed'
    return status
  }

  const statusClass = (status) => {
    if (status === 'completed') return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
    if (status === 'pending') return 'bg-yellow-100 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400'
    if (status === 'refunded') return 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
    if (status === 'cancelled') return 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300'
    return 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'
  }

  const allowedStatuses = () => ['pending', 'completed', 'refunded']

  const totalPayments = stats.totalRevenue || 0
  const totalRefunds = payments.filter(p => p.status === 'refunded').reduce((sum, p) => sum + (parseFloat(p.total_amount) || 0), 0)
  const totalPending = stats.pendingAmount || 0

  const handlePaymentSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)
    if (!selectedBranchId) {
      setError(language === 'ar' ? 'اختر فرعاً أولاً' : 'Please select a branch')
      return
    }
    const selectedPlayer = players.find((p) => p.id === paymentForm.playerId)
    if (!selectedPlayer?.id) {
      setError(language === 'ar' ? 'اختر لاعباً أولاً' : 'Please select a player')
      return
    }
    if (!selectedPlayer.parentId) {
      setError(language === 'ar' ? 'بيانات ولي الأمر غير متوفرة لهذا اللاعب' : 'Parent information is missing for this player')
      return
    }
    const normalizedAmount = Number.parseFloat(paymentForm.amount)
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      setError(language === 'ar' ? 'أدخل مبلغاً صحيحاً' : 'Please enter a valid amount')
      return
    }
    setSubmitting(true)
    try {
      let response

      // If there's a receipt file, use the admin receipt endpoint
      if (paymentForm.receiptFile && !editingPaymentId) {
        const formData = new FormData()
        formData.append('receipt', paymentForm.receiptFile)
        formData.append('player_id', selectedPlayer.id)
        formData.append('amount', normalizedAmount.toFixed(2))
        formData.append('payment_method', paymentForm.method)
        formData.append('status', paymentStatus)
        if (paymentForm.notes) formData.append('notes', paymentForm.notes)
        if (paymentForm.receiptNumber) formData.append('receipt_number', paymentForm.receiptNumber)
        if (selectedProgramId) formData.append('program_id', selectedProgramId)
        if (selectedPlanId) formData.append('pricing_plan_id', selectedPlanId)

        response = await paymentsService.createAdminReceipt(formData)
      } else {
        // Calculate discount amount if a discount is selected
        let discountAmount = 0
        if (selectedDiscountId) {
          const disc = availableDiscounts.find(d => d.id === selectedDiscountId)
          if (disc) {
            discountAmount = disc.discount_type === 'percentage'
              ? (normalizedAmount * parseFloat(disc.discount_value) / 100)
              : Math.min(parseFloat(disc.discount_value), normalizedAmount)
          }
        }

        const payload = {
          user_id: selectedPlayer.parentId,
          player_id: selectedPlayer.id,
          branch_id: selectedBranchId,
          amount: normalizedAmount.toFixed(2),
          discount_amount: discountAmount.toFixed(2),
          payment_method: paymentForm.method,
          status: paymentStatus,
          paid_at: paymentStatus === 'pending' ? null : undefined,
          type: 'other',
          description: paymentForm.notes ? 'Manual payment' : undefined,
          notes: paymentForm.notes || undefined,
          pricing_plan_id: selectedPlanId || undefined,
          metadata: paymentForm.receiptNumber ? { receiptNumber: paymentForm.receiptNumber } : undefined
        }
        response = editingPaymentId
          ? await paymentsService.update(editingPaymentId, payload)
          : await paymentsService.create(payload)

        // Mark discount as used after successful payment creation
        if (!editingPaymentId && selectedDiscountId && response.success) {
          try {
            await discountsService.update(selectedDiscountId, {
              status: 'used'
            })
          } catch (discErr) {
            console.error('Error marking discount as used:', discErr)
          }
        }
      }

      if (response.success) {
        const targetId = editingPaymentId || response.data?.id
        if (paymentStatus === 'completed' && targetId && !paymentForm.receiptFile) {
          await paymentsService.complete(targetId, paymentForm.method)
        }
        if (paymentStatus === 'refunded' && targetId) {
          if (editingPaymentStatus !== 'completed') {
            await paymentsService.complete(targetId, paymentForm.method)
          }
          await paymentsService.refund(targetId, {
            reason: paymentForm.notes || (language === 'ar' ? 'استرداد يدوي' : 'Manual refund')
          })
        }
        setSuccessMessage(language === 'ar' ? 'تم تسجيل الدفعة بنجاح' : 'Payment recorded successfully')
        setPaymentForm({ playerId: '', amount: '', method: 'cash', receiptNumber: '', notes: '', receiptFile: null })
        setReceiptPreview(null)
        if (receiptFileRef.current) receiptFileRef.current.value = ''
        setSelectedPlanId('')
        setSelectedBranchId('')
        setSelectedProgramId('')
        setEditingPaymentId(null)
        setEditingPaymentStatus(null)
        setPaymentStatus('pending')
        setShowPaymentForm(false)
        setActiveTab('all')
        fetchPayments()
      }
    } catch (err) {
      const apiErrors = err.response?.data?.errors || []
      const apiMessage = err.response?.data?.message
      const firstError = apiErrors.length > 0 ? apiErrors[0]?.message : null
      console.error('Error creating payment:', err, { apiErrors, apiMessage })
      setError(firstError || apiMessage || (language === 'ar' ? 'فشل في تسجيل الدفعة' : 'Failed to record payment'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleApproveReceipt = async (payment) => {
    setError(null)
    setSuccessMessage(null)
    try {
      await paymentsService.complete(payment.id, 'bank_transfer')
      setSuccessMessage(language === 'ar' ? 'تم اعتماد الإيصال' : 'Receipt approved')
      fetchPayments()
    } catch (err) {
      console.error('Error approving receipt:', err)
      setError(language === 'ar' ? 'فشل اعتماد الإيصال' : 'Failed to approve receipt')
    }
  }

  const handleEditPayment = (payment) => {
    setEditingPaymentId(payment.id)
    setEditingPaymentStatus(payment.status)
    setSelectedBranchId(payment.branch_id || '')
    setSelectedProgramId('')
    setPaymentStatus(payment.status || 'pending')
    setPaymentForm({
      playerId: payment.player_id || '',
      amount: payment.amount || payment.total_amount || '',
      method: payment.payment_method || 'cash',
      receiptNumber: payment.metadata?.receiptNumber || '',
      notes: payment.notes || ''
    })
    setShowPaymentForm(true)
  }

  const handleDeletePayment = async (payment) => {
    const confirmed = window.confirm(language === 'ar' ? 'هل تريد حذف هذه الدفعة نهائياً؟' : 'Delete this payment permanently?')
    if (!confirmed) return
    setSubmitting(true)
    try {
      await paymentsService.delete(payment.id)
      setPayments((prev) => prev.filter((item) => item.id !== payment.id))
      setSuccessMessage(language === 'ar' ? 'تم حذف الدفعة' : 'Payment deleted')
    } catch (err) {
      setError(err.response?.data?.message || (language === 'ar' ? 'فشل في حذف الدفعة' : 'Failed to delete payment'))
    } finally {
      setSubmitting(false)
    }
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-secondary dark:text-white">
            {language === 'ar' ? 'المدفوعات' : 'Payments'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {language === 'ar' ? 'تسجيل وعرض المعاملات المالية' : 'Record and view financial transactions'}
          </p>
        </div>
        <Button
          onClick={() => {
            setShowPaymentForm(true)
            setEditingPaymentId(null)
            setEditingPaymentStatus(null)
            setPaymentForm({ playerId: '', amount: '', method: 'cash', receiptNumber: '', notes: '', receiptFile: null })
            setReceiptPreview(null)
            if (receiptFileRef.current) receiptFileRef.current.value = ''
            setSelectedBranchId('')
            setSelectedProgramId('')
            setSelectedPlanId('')
            setPaymentStatus('pending')
          }}
          className="bg-teal-500 hover:bg-teal-600"
        >
          <svg className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          {language === 'ar' ? 'تسجيل دفعة' : 'Record Payment'}
        </Button>
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-500">{formatCurrency(totalPayments)}</p>
              <p className="text-sm text-gray-500">{language === 'ar' ? 'إجمالي المدفوعات' : 'Total Payments'}</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-500/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-500">{formatCurrency(totalRefunds)}</p>
              <p className="text-sm text-gray-500">{language === 'ar' ? 'إجمالي الاستردادات' : 'Total Refunds'}</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-teal-100 dark:bg-teal-500/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-teal-500">{formatCurrency(totalPayments - totalRefunds)}</p>
              <p className="text-sm text-gray-500">{language === 'ar' ? 'الصافي' : 'Net'}</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-teal-500 text-white'
                : 'bg-white/50 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'
            }`}
          >
            {tab.label[language]}
          </button>
        ))}
      </div>

      {/* Payment Form Modal */}
      {showPaymentForm && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-secondary dark:text-white">
              {language === 'ar' ? 'تسجيل دفعة جديدة' : 'Record New Payment'}
            </h3>
            <button onClick={() => setShowPaymentForm(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {branches.length === 0 ? (
            <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-xl p-4 mb-4">
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                {language === 'ar' ? 'لا توجد فروع مسجلة لتسجيل دفعة. أضف فروع أولاً.' : 'No branches available to record a payment. Add branches first.'}
              </p>
            </div>
          ) : (
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'ar' ? 'الفرع' : 'Branch'}
                  </label>
                  <select
                    value={selectedBranchId}
                    onChange={(e) => {
                      setSelectedBranchId(e.target.value)
                      setSelectedProgramId('')
                      setSelectedPlanId('')
                      setPaymentForm((prev) => ({ ...prev, playerId: '' }))
                    }}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  >
                    <option value="">{language === 'ar' ? 'اختر الفرع' : 'Select a branch'}</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name[language]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {/* Program Selection */}
              {programs.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'ar' ? 'البرنامج' : 'Program'} *
                  </label>
                  <select
                    value={selectedProgramId}
                    onChange={(e) => {
                      setSelectedProgramId(e.target.value)
                      setPaymentForm((prev) => ({ ...prev, playerId: '' }))
                    }}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    disabled={!selectedBranchId || programs.length === 0}
                  >
                    <option value="">{language === 'ar' ? 'اختر البرنامج' : 'Select a program'}</option>
                    {programs.map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.name[language]}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {selectedBranchId && players.length === 0 ? (
                <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-xl p-4">
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    {language === 'ar' ? 'لا يوجد لاعبون في هذا الفرع.' : 'No players in this branch.'}
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'ar' ? 'اللاعب' : 'Player'}
                  </label>
                  <select
                    value={paymentForm.playerId}
                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, playerId: e.target.value }))}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    disabled={!selectedBranchId}
                    required
                  >
                    <option value="">{language === 'ar' ? 'اختر لاعباً' : 'Select a player'}</option>
                    {players
                      .filter((player) => (selectedProgramId ? String(player.programId) === String(selectedProgramId) : true))
                      .map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.name[language]} {player.registration ? `(${player.registration})` : ''}
                        </option>
                      ))}
                  </select>
                </div>
              )}
              {/* Plan Selection */}
              {pricingPlans.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'ar' ? 'الخطة' : 'Plan'} *
                  </label>
                  <select
                    value={selectedPlanId}
                    onChange={(e) => setSelectedPlanId(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">{language === 'ar' ? 'اختر خطة' : 'Select a plan'}</option>
                    {pricingPlans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} - SAR {plan.price} ({plan.duration_months} {language === 'ar' ? 'شهر' : 'months'})
                      </option>
                    ))}
                  </select>
                  {selectedPlanId && (() => {
                    const selectedPlan = pricingPlans.find(p => String(p.id) === String(selectedPlanId))
                    if (selectedPlan) {
                      const days = (selectedPlan.duration_months || 1) * 30
                      return (
                        <p className="text-sm text-green-600 mt-2 font-medium">
                          {language === 'ar' ? `المدة: ${days} يوم` : `Duration: ${days} days`}
                        </p>
                      )
                    }
                    return null
                  })()}
                </div>
              )}
              <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-500/10 border border-blue-200/60 dark:border-blue-500/20">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  {language === 'ar'
                    ? 'ملاحظة التجديد: إذا تم التجديد بعد انتهاء الاشتراك، يبدأ الاشتراك الجديد من تاريخ انتهاء الاشتراك السابق (وليس من تاريخ الدفع).'
                    : 'Renewal note: if renewal is made after expiry, the new subscription starts from the previous subscription end date (not the payment date).'}
                </p>
              </div>
              {/* Available Discounts */}
              {availableDiscounts.length > 0 && (
                <div className="p-4 rounded-xl bg-green-50/50 dark:bg-green-900/10 border border-green-200/50 dark:border-green-800/30">
                  <label className="block text-sm font-medium text-green-700 dark:text-green-400 mb-2">
                    <svg className="w-4 h-4 inline-block mr-1 rtl:mr-0 rtl:ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    {language === 'ar' ? 'خصومات متاحة' : 'Available Discounts'}
                  </label>
                  <select
                    value={selectedDiscountId}
                    onChange={(e) => {
                      setSelectedDiscountId(e.target.value)
                      // Auto-adjust amount if a discount is selected
                      if (e.target.value && paymentForm.amount) {
                        const disc = availableDiscounts.find(d => d.id === e.target.value)
                        if (disc) {
                          const baseAmount = parseFloat(paymentForm.amount)
                          let discountAmt = disc.discount_type === 'percentage'
                            ? (baseAmount * parseFloat(disc.discount_value) / 100)
                            : parseFloat(disc.discount_value)
                          discountAmt = Math.min(discountAmt, baseAmount)
                          // Show the original amount, discount is applied on submit
                        }
                      }
                    }}
                    className="w-full px-4 py-2 rounded-xl border border-green-200 dark:border-green-800/30 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">{language === 'ar' ? 'بدون خصم' : 'No discount'}</option>
                    {availableDiscounts.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.discount_type === 'percentage' ? `${d.discount_value}%` : `${d.discount_value} SAR`}
                        {d.reason ? ` - ${d.reason}` : ''}
                        {d.player ? ` (${d.player.first_name})` : d.parent ? ` (${d.parent.first_name})` : ''}
                      </option>
                    ))}
                  </select>
                  {selectedDiscountId && paymentForm.amount && (() => {
                    const disc = availableDiscounts.find(d => d.id === selectedDiscountId)
                    if (!disc) return null
                    const baseAmount = parseFloat(paymentForm.amount) || 0
                    const discountAmt = disc.discount_type === 'percentage'
                      ? (baseAmount * parseFloat(disc.discount_value) / 100)
                      : Math.min(parseFloat(disc.discount_value), baseAmount)
                    const finalAmount = Math.max(0, baseAmount - discountAmt)
                    return (
                      <div className="mt-2 text-sm space-y-1">
                        <div className="flex justify-between text-gray-600 dark:text-gray-400">
                          <span>{language === 'ar' ? 'المبلغ الأصلي:' : 'Original:'}</span>
                          <span>{baseAmount.toFixed(2)} SAR</span>
                        </div>
                        <div className="flex justify-between text-green-600 dark:text-green-400 font-medium">
                          <span>{language === 'ar' ? 'الخصم:' : 'Discount:'}</span>
                          <span>-{discountAmt.toFixed(2)} SAR</span>
                        </div>
                        <div className="flex justify-between text-secondary dark:text-white font-bold border-t border-green-200 dark:border-green-800/30 pt-1">
                          <span>{language === 'ar' ? 'المبلغ النهائي:' : 'Final:'}</span>
                          <span>{finalAmount.toFixed(2)} SAR</span>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'ar' ? 'المبلغ' : 'Amount'}
                  </label>
                  <NumericInput
                    min="0"
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
                  </label>
                  <select
                    value={paymentForm.method}
                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, method: e.target.value }))}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="cash">{language === 'ar' ? 'نقداً' : 'Cash'}</option>
                    <option value="credit_card">{language === 'ar' ? 'بطاقة ائتمان' : 'Credit Card'}</option>
                    <option value="bank_transfer">{language === 'ar' ? 'تحويل بنكي' : 'Bank Transfer'}</option>
                    <option value="mada">Mada</option>
                    <option value="apple_pay">Apple Pay</option>
                    <option value="stc_pay">STC Pay</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'ar' ? 'الحالة' : 'Status'}
                </label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {allowedStatuses().map((status) => (
                    <option key={status} value={status}>
                      {statusLabel(status)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'ar' ? 'رقم الإيصال' : 'Receipt Number'}
                </label>
                <input
                  type="text"
                  value={paymentForm.receiptNumber}
                  onChange={(e) => setPaymentForm((prev) => ({ ...prev, receiptNumber: e.target.value }))}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder={language === 'ar' ? 'اختياري' : 'Optional'}
                />
              </div>
              {paymentForm.method !== 'cash' && !editingPaymentId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'ar' ? 'صورة الإيصال' : 'Receipt Image'}
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      ref={receiptFileRef}
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        setPaymentForm((prev) => ({ ...prev, receiptFile: file || null }))
                        if (file && file.type.startsWith('image/')) {
                          const reader = new FileReader()
                          reader.onload = (ev) => setReceiptPreview(ev.target?.result)
                          reader.readAsDataURL(file)
                        } else {
                          setReceiptPreview(null)
                        }
                      }}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                    />
                  </div>
                  {receiptPreview && (
                    <div className="mt-3">
                      <img src={receiptPreview} alt="Receipt preview" className="max-w-xs max-h-40 rounded-lg border border-gray-200 dark:border-white/10" />
                    </div>
                  )}
                  {paymentForm.receiptFile && !receiptPreview && (
                    <p className="mt-2 text-sm text-gray-500">{paymentForm.receiptFile.name}</p>
                  )}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'ar' ? 'ملاحظات' : 'Notes'}
                </label>
                <textarea
                  rows={3}
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder={language === 'ar' ? 'تفاصيل إضافية' : 'Additional details'}
                />
              </div>
              <div className="flex items-center gap-3">
                <Button type="submit" className="bg-teal-500 hover:bg-teal-600" disabled={submitting}>
                  {submitting
                    ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                    : editingPaymentId
                      ? (language === 'ar' ? 'تحديث الدفعة' : 'Update Payment')
                      : (language === 'ar' ? 'تسجيل الدفعة' : 'Record Payment')}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentForm(false)
                    setEditingPaymentId(null)
                    setEditingPaymentStatus(null)
                    setPaymentStatus('pending')
                  }}
                  className="px-4 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </form>
          )}
        </GlassCard>
      )}

      {payments.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-gray-500 mb-2">{language === 'ar' ? 'لا توجد معاملات بعد' : 'No transactions yet'}</p>
          <p className="text-sm text-gray-400">{language === 'ar' ? 'ستظهر المعاملات هنا عند تسجيلها' : 'Transactions will appear here when recorded'}</p>
        </GlassCard>
      ) : (
        <GlassCard className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-secondary dark:text-white">
              {language === 'ar' ? 'سجل المعاملات' : 'Transactions'}
            </h2>
            <span className="text-xs text-gray-400">{payments.length}</span>
          </div>

          {/* Mobile Cards View */}
          <div className="md:hidden space-y-4">
            {payments.map((payment) => {
              // Only use the pricing plan name from the database (set by Super Admin)
              const planName = payment.pricing_plan?.name || '-';
              const daysRemaining = payment.days_remaining;
              
              return (
              <div
                key={payment.id}
                className="p-4 rounded-2xl bg-white/70 dark:bg-white/5 border border-white/60 dark:border-white/10 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-secondary dark:text-white">
                      {payment.player ? `${payment.player.first_name || ''} ${payment.player.last_name || ''}`.trim() : '-'}
                    </p>
                    <p className="text-xs text-gray-500">{payment.invoice_number || payment.id}</p>
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusClass(payment.status)}`}>
                    {statusLabel(payment.status)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-gray-400">{language === 'ar' ? 'المبلغ' : 'Amount'}</p>
                    <p className="font-semibold text-teal-600">{formatCurrency(payment.total_amount || payment.amount || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{language === 'ar' ? 'التاريخ' : 'Date'}</p>
                    <p className="text-gray-600 dark:text-gray-300">{getPaymentDate(payment) ? formatDate(getPaymentDate(payment)) : '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{language === 'ar' ? 'الفرع' : 'Branch'}</p>
                    <p className="text-gray-600 dark:text-gray-300">{payment.branch?.name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{language === 'ar' ? 'البرنامج' : 'Program'}</p>
                    <p className="text-gray-600 dark:text-gray-300">{payment.player?.program?.name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{language === 'ar' ? 'الخطة' : 'Plan'}</p>
                    <p className="text-primary font-medium">{planName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{language === 'ar' ? 'الأيام المتبقية' : 'Days Left'}</p>
                    <p className={`font-semibold ${daysRemaining != null ? (daysRemaining <= 7 ? 'text-red-500' : daysRemaining <= 30 ? 'text-yellow-500' : 'text-emerald-500') : 'text-gray-400'}`}>
                      {daysRemaining != null ? `${daysRemaining} ${language === 'ar' ? 'يوم' : 'days'}` : '-'}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  {language === 'ar' ? 'آخر تحديث بواسطة:' : 'Last updated by:'} {getLastEditorName(payment)}
                  {' • '}
                  {payment.last_updated_at ? formatDateTime(payment.last_updated_at) : '-'}
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-white/10">
                  {payment.receipt_url ? (
                    <button
                      type="button"
                      onClick={() => handleDownloadReceipt(payment.receipt_url)}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      {language === 'ar' ? 'تحميل الإيصال' : 'Download Receipt'}
                    </button>
                  ) : <span />}
                  <div className="flex items-center gap-2">
                    {payment.status === 'pending' && payment.receipt_url && (
                      <button
                        type="button"
                        onClick={() => handleApproveReceipt(payment)}
                        className="px-3 py-1.5 text-xs rounded-lg bg-emerald-500 text-white hover:bg-emerald-600"
                      >
                        {language === 'ar' ? 'اعتماد' : 'Approve'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleEditPayment(payment)}
                      disabled={payment.status === 'cancelled'}
                      className="p-2 rounded-lg text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-500/10 disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryTarget({ entityType: 'payment', entityId: payment.id, title: payment.invoice_number || payment.id })}
                      className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePayment(payment)}
                      disabled={payment.status === 'refunded' || payment.status === 'cancelled'}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )})}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <div className="min-w-[1100px] space-y-3">
              <div className="grid grid-cols-12 gap-3 text-xs font-semibold text-gray-500 px-2">
                <span>{language === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}</span>
                <span>{language === 'ar' ? 'اللاعب' : 'Player'}</span>
                <span>{language === 'ar' ? 'ولي الأمر' : 'Parent'}</span>
                <span>{language === 'ar' ? 'الفرع' : 'Branch'}</span>
                <span>{language === 'ar' ? 'البرنامج' : 'Program'}</span>
                <span>{language === 'ar' ? 'الخطة' : 'Plan'}</span>
                <span>{language === 'ar' ? 'الأيام' : 'Days'}</span>
                <span>{language === 'ar' ? 'المبلغ' : 'Amount'}</span>
                <span>{language === 'ar' ? 'الإيصال' : 'Receipt'}</span>
                <span>{language === 'ar' ? 'الحالة' : 'Status'}</span>
                <span>{language === 'ar' ? 'التاريخ' : 'Date'}</span>
                <span>{language === 'ar' ? 'إجراءات' : 'Actions'}</span>
              </div>
              {payments.map((payment) => {
                // Only use the pricing plan name from the database (set by Super Admin)
                const planName = payment.pricing_plan?.name || '-';
                const daysRemaining = payment.days_remaining;
                
                return (
                <div
                  key={payment.id}
                  className="grid grid-cols-12 gap-3 items-center p-4 rounded-2xl bg-white/70 dark:bg-white/5 border border-white/60 dark:border-white/10 shadow-sm"
                >
                  <span className="text-sm font-semibold text-secondary dark:text-white truncate">{payment.invoice_number || payment.id}</span>
                  <span className="text-sm text-gray-500 truncate">
                    {payment.player ? `${payment.player.first_name || ''} ${payment.player.last_name || ''}`.trim() : '-'}
                  </span>
                  <span className="text-sm text-gray-500 truncate">
                    {payment.user ? `${payment.user.first_name || ''} ${payment.user.last_name || ''}`.trim() : '-'}
                  </span>
                  <span className="text-sm text-gray-500 truncate">{payment.branch?.name || '-'}</span>
                  <span className="text-sm text-gray-500 truncate">{payment.player?.program?.name || '-'}</span>
                  <span className="text-sm text-primary font-medium truncate">{planName}</span>
                  <span className={`text-sm font-semibold ${daysRemaining != null ? (daysRemaining <= 7 ? 'text-red-500' : daysRemaining <= 30 ? 'text-yellow-500' : 'text-emerald-500') : 'text-gray-400'}`}>
                    {daysRemaining != null ? `${daysRemaining} ${language === 'ar' ? 'يوم' : 'd'}` : '-'}
                  </span>
                  <span className="text-sm font-semibold text-secondary dark:text-white">{formatCurrency(payment.total_amount || payment.amount || 0)}</span>
                  <span className="text-sm text-gray-500">
                    {payment.receipt_url ? (
                      <button
                        type="button"
                        onClick={() => handleDownloadReceipt(payment.receipt_url)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        {language === 'ar' ? 'تحميل' : 'Download'}
                      </button>
                    ) : '-'}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full w-fit ${statusClass(payment.status)}`}>
                    {statusLabel(payment.status)}
                  </span>
                  <span className="text-sm text-gray-500">
                    {getPaymentDate(payment) ? formatDate(getPaymentDate(payment)) : '-'}
                    <span className="block text-[11px] text-gray-400">
                      {getLastEditorName(payment)}
                    </span>
                  </span>
                  <div className="flex items-center gap-1">
                    {payment.status === 'pending' && payment.receipt_url && (
                      <button
                        type="button"
                        onClick={() => handleApproveReceipt(payment)}
                        className="px-2 py-1 text-xs rounded-lg bg-emerald-500 text-white hover:bg-emerald-600"
                      >
                        {language === 'ar' ? 'اعتماد' : 'Approve'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleEditPayment(payment)}
                      disabled={payment.status === 'cancelled'}
                      className="p-1.5 rounded-lg text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-500/10 disabled:opacity-50"
                      aria-label={language === 'ar' ? 'تعديل' : 'Edit'}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryTarget({ entityType: 'payment', entityId: payment.id, title: payment.invoice_number || payment.id })}
                      className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
                      aria-label={language === 'ar' ? 'السجل' : 'History'}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePayment(payment)}
                      disabled={payment.status === 'refunded' || payment.status === 'cancelled'}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50"
                      aria-label={language === 'ar' ? 'حذف' : 'Delete'}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              )})}
            </div>
          </div>
        </GlassCard>
      )}

      <ChangeHistoryModal
        open={Boolean(historyTarget)}
        onClose={() => setHistoryTarget(null)}
        entityType={historyTarget?.entityType}
        entityId={historyTarget?.entityId}
        title={historyTarget?.title}
      />
    </div>
  )
}
