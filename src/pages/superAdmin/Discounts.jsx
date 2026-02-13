import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { useAuth } from '../../hooks/useAuth'
import { discountsService, branchesService, programsService, playersService, usersService } from '../../services'
import GlassCard from '../../components/ui/GlassCard'
import Button from '../../components/ui/Button'
import ChangeHistoryModal from '../../components/common/ChangeHistoryModal'

export default function Discounts() {
  const { language } = useLanguage()
  const { user } = useAuth()
  const isBranchAdmin = user?.role === 'branch_admin'
  const [loading, setLoading] = useState(true)
  const [discounts, setDiscounts] = useState([])
  const [pagination, setPagination] = useState({})
  const [page, setPage] = useState(1)
  const [message, setMessage] = useState({ type: '', text: '' })

  // Filters
  const [filterBranch, setFilterBranch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [historyTarget, setHistoryTarget] = useState(null)

  // Cascading dropdown data
  const [branches, setBranches] = useState([])
  const [programs, setPrograms] = useState([])
  const [parents, setParents] = useState([])
  const [players, setPlayers] = useState([])
  const [pricingPlans, setPricingPlans] = useState([])

  // Form fields
  const [form, setForm] = useState({
    branch_id: '',
    program_id: '',
    user_id: '',
    player_id: '',
    pricing_plan_id: '',
    discount_type: 'fixed',
    discount_value: '',
    reason: '',
    expires_at: ''
  })

  const fetchDiscounts = useCallback(async () => {
    try {
      setLoading(true)
      const params = { page, limit: 20 }
      if (isBranchAdmin && user?.branch_id) {
        params.branch_id = user.branch_id
      } else if (filterBranch) {
        params.branch_id = filterBranch
      }
      if (filterStatus) params.status = filterStatus
      const response = await discountsService.getAll(params)
      if (response.success) {
        setDiscounts(response.data || [])
        setPagination(response.pagination || {})
      }
    } catch (err) {
      console.error('Error fetching discounts:', err)
    } finally {
      setLoading(false)
    }
  }, [filterBranch, filterStatus, isBranchAdmin, page, user?.branch_id])

  const fetchBranches = useCallback(async () => {
    if (isBranchAdmin) {
      setBranches(user?.branch ? [user.branch] : [])
      setFilterBranch(user?.branch_id || '')
      return
    }
    try {
      const response = await branchesService.getAll()
      if (response.success) {
        setBranches(response.data || [])
      }
    } catch (err) {
      console.error('Error fetching branches:', err)
    }
  }, [isBranchAdmin, user?.branch, user?.branch_id])

  useEffect(() => {
    fetchDiscounts()
  }, [fetchDiscounts])

  useEffect(() => {
    fetchBranches()
  }, [fetchBranches])

  useEffect(() => {
    if (isBranchAdmin && user?.branch_id) {
      setForm(prev => ({ ...prev, branch_id: user.branch_id }))
    }
  }, [isBranchAdmin, user?.branch_id])

  // Cascade: when branch changes, load programs
  useEffect(() => {
    if (!form.branch_id) {
      setPrograms([])
      return
    }
    const loadPrograms = async () => {
      try {
        const response = await programsService.getAll({ branch_id: form.branch_id, limit: 100 })
        if (response.success) {
          setPrograms(response.data || [])
        }
      } catch (err) {
        console.error('Error loading programs:', err)
      }
    }
    loadPrograms()
  }, [form.branch_id])

  // Cascade: when branch changes, load parents and ALL players in that branch
  // Players are ALWAYS loaded by branch (not filtered by program)
  // because discounts may target players who haven't joined a program yet
  useEffect(() => {
    if (!form.branch_id) {
      setParents([])
      setPlayers([])
      return
    }
    const loadData = async () => {
      try {
        // Load parents
        const parentsResponse = await usersService.getByRole('parent')
        if (parentsResponse.success) {
          setParents(parentsResponse.data || [])
        }

        // Always load ALL players in this branch (regardless of program)
        const playersResponse = await playersService.getByBranch(form.branch_id)
        if (playersResponse.success) {
          setPlayers(playersResponse.data || [])
        }
      } catch (err) {
        console.error('Error loading data:', err)
      }
    }
    loadData()
  }, [form.branch_id])

  // Cascade: when parent changes, filter players (still by branch, not program)
  useEffect(() => {
    if (!form.branch_id) {
      setPlayers([])
      return
    }

    if (!form.user_id) {
      // No parent selected - load all players in the branch
      const loadAllPlayers = async () => {
        try {
          const response = await playersService.getByBranch(form.branch_id)
          if (response.success) {
            setPlayers(response.data || [])
          }
        } catch (err) {
          console.error('Error loading all players:', err)
        }
      }
      loadAllPlayers()
    } else {
      // Parent selected - load only their children
      const loadParentPlayers = async () => {
        try {
          const response = await playersService.getByParent(form.user_id)
          if (response.success) {
            setPlayers(response.data || [])
          }
        } catch (err) {
          console.error('Error loading parent players:', err)
        }
      }
      loadParentPlayers()
    }
  }, [form.user_id, form.branch_id])

  // Cascade: when program changes, extract pricing plans from already-loaded programs
  useEffect(() => {
    if (!form.program_id) {
      setPricingPlans([])
      return
    }
    const selectedProgram = programs.find(p => String(p.id) === String(form.program_id))
    if (selectedProgram?.pricing_plans) {
      setPricingPlans(selectedProgram.pricing_plans)
    } else {
      setPricingPlans([])
    }
  }, [form.program_id, programs])

  const resetForm = () => {
    setForm({
      branch_id: '',
      program_id: '',
      user_id: '',
      player_id: '',
      pricing_plan_id: '',
      discount_type: 'fixed',
      discount_value: '',
      reason: '',
      expires_at: ''
    })
    setPrograms([])
    setParents([])
    setPlayers([])
    setPricingPlans([])
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    const effectiveBranchId = isBranchAdmin ? user?.branch_id : form.branch_id
    if (!effectiveBranchId || !form.discount_value) {
      setMessage({ type: 'error', text: language === 'ar' ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields' })
      return
    }

    setFormLoading(true)
    try {
      if (editingId) {
        // Update existing discount
        const payload = {
          discount_type: form.discount_type,
          discount_value: parseFloat(form.discount_value),
          reason: form.reason || null,
          expires_at: form.expires_at || null
        }
        const response = await discountsService.update(editingId, payload)
        if (response.success) {
          setMessage({ type: 'success', text: language === 'ar' ? 'تم تعديل الخصم بنجاح' : 'Discount updated successfully' })
          setShowForm(false)
          setEditingId(null)
          resetForm()
          fetchDiscounts()
        }
      } else {
        // Create new discount
        const payload = {
          branch_id: effectiveBranchId,
          program_id: form.program_id || null,
          user_id: form.user_id || null,
          player_id: form.player_id || null,
          pricing_plan_id: form.pricing_plan_id || null,
          discount_type: form.discount_type,
          discount_value: parseFloat(form.discount_value),
          reason: form.reason || null,
          expires_at: form.expires_at || null
        }
        const response = await discountsService.create(payload)
        if (response.success) {
          setMessage({ type: 'success', text: language === 'ar' ? 'تم إنشاء الخصم بنجاح' : 'Discount created successfully' })
          setShowForm(false)
          resetForm()
          fetchDiscounts()
        }
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || (language === 'ar' ? 'حدث خطأ' : 'An error occurred') })
    } finally {
      setFormLoading(false)
    }
  }

  const handleEdit = (d) => {
    setEditingId(d.id)
    setForm({
      branch_id: d.branch_id || '',
      program_id: d.program_id || '',
      user_id: d.user_id || '',
      player_id: d.player_id || '',
      pricing_plan_id: d.pricing_plan_id || '',
      discount_type: d.discount_type || 'fixed',
      discount_value: d.discount_value || '',
      reason: d.reason || '',
      expires_at: d.expires_at || ''
    })
    setShowForm(true)
  }

  const handleCancel = async (id) => {
    try {
      const response = await discountsService.update(id, { status: 'cancelled' })
      if (response.success) {
        setMessage({ type: 'success', text: language === 'ar' ? 'تم إلغاء الخصم' : 'Discount cancelled' })
        fetchDiscounts()
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || (language === 'ar' ? 'حدث خطأ' : 'An error occurred') })
    }
  }

  const getScopeLabel = (d) => {
    if (d.player) return `${d.player.first_name} ${d.player.last_name}`
    if (d.parent) return language === 'ar' ? `أبناء ${d.parent.first_name} ${d.parent.last_name}` : `Children of ${d.parent.first_name} ${d.parent.last_name}`
    if (d.program) return language === 'ar' ? `كل ${d.program.name_ar || d.program.name}` : `All in ${d.program.name}`
    if (d.branch) return language === 'ar' ? `كل ${d.branch.name_ar || d.branch.name}` : `All in ${d.branch.name}`
    return '--'
  }

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      used: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      expired: 'bg-gray-100 text-gray-600 dark:bg-gray-700/30 dark:text-gray-400',
      cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    }
    const labels = {
      active: language === 'ar' ? 'نشط' : 'Active',
      used: language === 'ar' ? 'مستخدم' : 'Used',
      expired: language === 'ar' ? 'منتهي' : 'Expired',
      cancelled: language === 'ar' ? 'ملغي' : 'Cancelled'
    }
    return (
      <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${styles[status] || styles.active}`}>
        {labels[status] || status}
      </span>
    )
  }

  const getValueDisplay = (d) => {
    if (d.discount_type === 'percentage') return `${d.discount_value}%`
    return `${d.discount_value} SAR`
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '--'
    return new Date(dateStr).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }
  const getLastEditorName = (discount) => {
    const editor = discount.last_updated_by
    if (!editor) return language === 'ar' ? 'غير معروف' : 'Unknown'
    const fullName = `${editor.first_name || ''} ${editor.last_name || ''}`.trim()
    return fullName || (language === 'ar' ? 'غير معروف' : 'Unknown')
  }

  // Auto-clear messages
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => setMessage({ type: '', text: '' }), 4000)
      return () => clearTimeout(timer)
    }
  }, [message])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-secondary dark:text-white">
            {language === 'ar' ? 'الخصومات' : 'Discounts'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
            {language === 'ar' ? 'إدارة الخصومات للاعبين والبرامج' : 'Manage discounts for players and programs'}
          </p>
        </div>
        <Button
          onClick={() => { setShowForm(true); setEditingId(null); resetForm() }}
          className="bg-primary hover:bg-primary/90"
        >
          <svg className="w-5 h-5 inline-block mr-1 rtl:mr-0 rtl:ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          {language === 'ar' ? 'إضافة خصم' : 'Add Discount'}
        </Button>
      </div>

      {/* Messages */}
      {message.text && (
        <div className={`p-4 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'}`}>
          {message.text}
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <GlassCard className="p-6">
          <h2 className="text-lg font-bold text-secondary dark:text-white mb-4">
            {editingId
              ? (language === 'ar' ? 'تعديل الخصم' : 'Edit Discount')
              : (language === 'ar' ? 'إنشاء خصم جديد' : 'Create New Discount')}
          </h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Branch (required) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'ar' ? 'الفرع *' : 'Branch *'}
                </label>
                <select
                  value={isBranchAdmin ? (user?.branch_id || '') : form.branch_id}
                  onChange={(e) => setForm({ ...form, branch_id: e.target.value, program_id: '', user_id: '', player_id: '', pricing_plan_id: '' })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
                  required
                  disabled={isBranchAdmin}
                >
                  <option value="">{language === 'ar' ? 'اختر الفرع' : 'Select Branch'}</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{language === 'ar' ? (b.name_ar || b.name) : b.name}</option>
                  ))}
                </select>
              </div>

              {/* Program (optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'ar' ? 'البرنامج' : 'Program'}
                </label>
                <select
                  value={form.program_id}
                  onChange={(e) => setForm({ ...form, program_id: e.target.value, pricing_plan_id: '' })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={!form.branch_id}
                >
                  <option value="">{language === 'ar' ? 'الكل (اختياري)' : 'All (optional)'}</option>
                  {programs.map(p => (
                    <option key={p.id} value={p.id}>{language === 'ar' ? (p.name_ar || p.name) : p.name}</option>
                  ))}
                </select>
              </div>

              {/* Parent (optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'ar' ? 'ولي الأمر' : 'Parent'}
                </label>
                <select
                  value={form.user_id}
                  onChange={(e) => setForm({ ...form, user_id: e.target.value, player_id: '' })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={!form.branch_id}
                >
                  <option value="">{language === 'ar' ? 'الكل (اختياري)' : 'All (optional)'}</option>
                  {parents.map(p => (
                    <option key={p.id} value={p.id}>{p.first_name} {p.last_name} {p.phone ? `(${p.phone})` : ''}</option>
                  ))}
                </select>
              </div>

              {/* Player (optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'ar' ? 'اللاعب' : 'Player'}
                </label>
                <select
                  value={form.player_id}
                  onChange={(e) => setForm({ ...form, player_id: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={!form.branch_id}
                >
                  <option value="">{language === 'ar' ? 'الكل (اختياري)' : 'All (optional)'}</option>
                  {players.map(p => (
                    <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                  ))}
                </select>
              </div>

              {/* Pricing Plan (optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'ar' ? 'خطة التسعير' : 'Pricing Plan'}
                </label>
                <select
                  value={form.pricing_plan_id}
                  onChange={(e) => setForm({ ...form, pricing_plan_id: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={!form.program_id}
                >
                  <option value="">{language === 'ar' ? 'الكل (اختياري)' : 'All (optional)'}</option>
                  {pricingPlans.map(p => (
                    <option key={p.id} value={p.id}>{language === 'ar' ? (p.name_ar || p.name) : p.name} - {p.price} SAR</option>
                  ))}
                </select>
              </div>

              {/* Discount Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'ar' ? 'نوع الخصم *' : 'Discount Type *'}
                </label>
                <select
                  value={form.discount_type}
                  onChange={(e) => setForm({ ...form, discount_type: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="fixed">{language === 'ar' ? 'مبلغ ثابت (ريال)' : 'Fixed Amount (SAR)'}</option>
                  <option value="percentage">{language === 'ar' ? 'نسبة مئوية (%)' : 'Percentage (%)'}</option>
                </select>
              </div>

              {/* Value */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'ar' ? 'القيمة *' : 'Value *'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={form.discount_type === 'percentage' ? 100 : undefined}
                  value={form.discount_value}
                  onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={form.discount_type === 'percentage' ? '10' : '50'}
                  required
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'ar' ? 'السبب' : 'Reason'}
                </label>
                <input
                  type="text"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={language === 'ar' ? 'سبب الخصم' : 'Discount reason'}
                />
              </div>

              {/* Expires at */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'ar' ? 'تاريخ الانتهاء' : 'Expires At'}
                </label>
                <input
                  type="date"
                  value={form.expires_at}
                  onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button type="submit" disabled={formLoading} className="bg-primary hover:bg-primary/90 w-full sm:w-auto">
                {formLoading
                  ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                  : editingId
                    ? (language === 'ar' ? 'حفظ التعديلات' : 'Save Changes')
                    : (language === 'ar' ? 'إنشاء الخصم' : 'Create Discount')}
              </Button>
              <Button type="button" onClick={() => { setShowForm(false); setEditingId(null); resetForm() }} className="bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-white/20 w-full sm:w-auto">
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
            </div>
          </form>
        </GlassCard>
      )}

      {/* Filters */}
      <GlassCard className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 sm:items-center">
          <select
            value={isBranchAdmin ? (user?.branch_id || '') : filterBranch}
            onChange={(e) => { setFilterBranch(e.target.value); setPage(1) }}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isBranchAdmin}
          >
            <option value="">{language === 'ar' ? 'كل الفروع' : 'All Branches'}</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{language === 'ar' ? (b.name_ar || b.name) : b.name}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">{language === 'ar' ? 'كل الحالات' : 'All Statuses'}</option>
            <option value="active">{language === 'ar' ? 'نشط' : 'Active'}</option>
            <option value="used">{language === 'ar' ? 'مستخدم' : 'Used'}</option>
            <option value="expired">{language === 'ar' ? 'منتهي' : 'Expired'}</option>
            <option value="cancelled">{language === 'ar' ? 'ملغي' : 'Cancelled'}</option>
          </select>
          <span className="text-sm text-gray-500 dark:text-gray-400 text-center sm:text-left">
            {language === 'ar' ? `${pagination.total || 0} خصم` : `${pagination.total || 0} discounts`}
          </span>
        </div>
      </GlassCard>

      {/* Discounts List */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <svg className="w-10 h-10 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      ) : discounts.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400">
            {language === 'ar' ? 'لا توجد خصومات بعد' : 'No discounts yet'}
          </p>
        </GlassCard>
      ) : (
        <>
          {/* Desktop Table (lg+) */}
          <div className="hidden lg:block">
            <GlassCard className="overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5">
                    <th className="text-start px-3 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400">{language === 'ar' ? 'النطاق' : 'Scope'}</th>
                    <th className="text-start px-3 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400">{language === 'ar' ? 'الفرع' : 'Branch'}</th>
                    <th className="text-start px-3 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400">{language === 'ar' ? 'البرنامج' : 'Program'}</th>
                    <th className="text-start px-3 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400">{language === 'ar' ? 'ولي الأمر' : 'Parent'}</th>
                    <th className="text-start px-3 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400">{language === 'ar' ? 'الخطة' : 'Plan'}</th>
                    <th className="text-start px-3 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400">{language === 'ar' ? 'القيمة' : 'Value'}</th>
                    <th className="text-start px-3 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400">{language === 'ar' ? 'السبب' : 'Reason'}</th>
                    <th className="text-start px-3 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                    <th className="text-start px-3 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                    <th className="text-start px-3 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400">{language === 'ar' ? 'الإجراء' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody>
                  {discounts.map(d => (
                    <tr key={d.id} className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-3 py-3 text-sm text-gray-800 dark:text-white font-medium whitespace-nowrap">{getScopeLabel(d)}</td>
                      <td className="px-3 py-3 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">{language === 'ar' ? (d.branch?.name_ar || d.branch?.name) : d.branch?.name || '--'}</td>
                      <td className="px-3 py-3 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">{d.program ? (language === 'ar' ? (d.program.name_ar || d.program.name) : d.program.name) : '--'}</td>
                      <td className="px-3 py-3 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">{d.parent ? `${d.parent.first_name} ${d.parent.last_name}` : '--'}</td>
                      <td className="px-3 py-3 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">{d.pricingPlan ? (language === 'ar' ? (d.pricingPlan.name_ar || d.pricingPlan.name) : d.pricingPlan.name) : '--'}</td>
                      <td className="px-3 py-3 text-sm font-bold text-primary whitespace-nowrap">{getValueDisplay(d)}</td>
                      <td className="px-3 py-3 text-xs text-gray-600 dark:text-gray-300 max-w-[120px] truncate">{d.reason || '--'}</td>
                      <td className="px-3 py-3 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {formatDate(d.created_at || d.createdAt)}
                        <span className="block text-[10px] text-gray-400">{getLastEditorName(d)}</span>
                      </td>
                      <td className="px-3 py-3">{getStatusBadge(d.status)}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setHistoryTarget({ entityType: 'discount', entityId: d.id, title: d.reason || getScopeLabel(d) })}
                            className="text-xs text-indigo-500 hover:text-indigo-700 font-medium"
                          >
                            {language === 'ar' ? 'السجل' : 'History'}
                          </button>
                          {d.status === 'active' && (
                            <>
                              <button
                                onClick={() => handleEdit(d)}
                                className="text-xs text-blue-500 hover:text-blue-700 font-medium"
                              >
                                {language === 'ar' ? 'تعديل' : 'Edit'}
                              </button>
                              <span className="text-gray-300 dark:text-gray-600">|</span>
                              <button
                                onClick={() => handleCancel(d.id)}
                                className="text-xs text-red-500 hover:text-red-700 font-medium"
                              >
                                {language === 'ar' ? 'إلغاء' : 'Cancel'}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </GlassCard>
          </div>

          {/* Tablet View (md to lg) */}
          <div className="hidden md:block lg:hidden space-y-3">
            {discounts.map(d => (
              <GlassCard key={d.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-secondary dark:text-white text-sm">{getScopeLabel(d)}</p>
                      {getStatusBadge(d.status)}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {language === 'ar' ? (d.branch?.name_ar || d.branch?.name) : d.branch?.name}
                      {d.program ? ` / ${language === 'ar' ? (d.program.name_ar || d.program.name) : d.program.name}` : ''}
                    </p>
                  </div>
                  <span className="text-lg font-bold text-primary ml-4">{getValueDisplay(d)}</span>
                </div>
                <div className="grid grid-cols-4 gap-3 text-xs text-gray-500 dark:text-gray-400 py-2 border-t border-gray-100 dark:border-white/5">
                  <div>
                    <p className="font-medium text-gray-600 dark:text-gray-300 mb-0.5">{language === 'ar' ? 'ولي الأمر' : 'Parent'}</p>
                    <p>{d.parent ? `${d.parent.first_name} ${d.parent.last_name}` : '--'}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-600 dark:text-gray-300 mb-0.5">{language === 'ar' ? 'الخطة' : 'Plan'}</p>
                    <p>{d.pricingPlan ? (language === 'ar' ? (d.pricingPlan.name_ar || d.pricingPlan.name) : d.pricingPlan.name) : '--'}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-600 dark:text-gray-300 mb-0.5">{language === 'ar' ? 'السبب' : 'Reason'}</p>
                    <p className="truncate">{d.reason || '--'}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-600 dark:text-gray-300 mb-0.5">{language === 'ar' ? 'التاريخ' : 'Date'}</p>
                    <p>{formatDate(d.created_at || d.createdAt)}</p>
                    <p className="text-[10px] text-gray-400">{getLastEditorName(d)}</p>
                  </div>
                </div>
                {d.status === 'active' && (
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-white/5 mt-2">
                    <button
                      onClick={() => handleEdit(d)}
                      className="px-3 py-1.5 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                    >
                      {language === 'ar' ? 'تعديل' : 'Edit'}
                    </button>
                    <button
                      onClick={() => handleCancel(d.id)}
                      className="px-3 py-1.5 text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    >
                      {language === 'ar' ? 'إلغاء' : 'Cancel'}
                    </button>
                  </div>
                )}
                {d.status !== 'active' && (
                  <div className="pt-2 border-t border-gray-100 dark:border-white/5 mt-2">
                    <button
                      onClick={() => setHistoryTarget({ entityType: 'discount', entityId: d.id, title: d.reason || getScopeLabel(d) })}
                      className="px-3 py-1.5 text-xs bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
                    >
                      {language === 'ar' ? 'السجل' : 'History'}
                    </button>
                  </div>
                )}
              </GlassCard>
            ))}
          </div>

          {/* Mobile Cards (< md) */}
          <div className="md:hidden space-y-3">
            {discounts.map(d => (
              <GlassCard key={d.id} className="p-4">
                {/* Top: Scope + Status */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-secondary dark:text-white text-sm truncate">{getScopeLabel(d)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {language === 'ar' ? (d.branch?.name_ar || d.branch?.name) : d.branch?.name}
                      {d.program ? ` / ${language === 'ar' ? (d.program.name_ar || d.program.name) : d.program.name}` : ''}
                    </p>
                  </div>
                  <div className="shrink-0">{getStatusBadge(d.status)}</div>
                </div>

                {/* Value highlight */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl font-bold text-primary">{getValueDisplay(d)}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {d.discount_type === 'percentage' ? (language === 'ar' ? 'نسبة' : 'percentage') : (language === 'ar' ? 'ثابت' : 'fixed')}
                  </span>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs border-t border-gray-100 dark:border-white/5 pt-3">
                  <div>
                    <p className="text-gray-400 dark:text-gray-500">{language === 'ar' ? 'ولي الأمر' : 'Parent'}</p>
                    <p className="text-gray-700 dark:text-gray-300 font-medium">{d.parent ? `${d.parent.first_name} ${d.parent.last_name}` : '--'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 dark:text-gray-500">{language === 'ar' ? 'الخطة' : 'Plan'}</p>
                    <p className="text-gray-700 dark:text-gray-300 font-medium">{d.pricingPlan ? (language === 'ar' ? (d.pricingPlan.name_ar || d.pricingPlan.name) : d.pricingPlan.name) : '--'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 dark:text-gray-500">{language === 'ar' ? 'السبب' : 'Reason'}</p>
                    <p className="text-gray-700 dark:text-gray-300 font-medium truncate">{d.reason || '--'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 dark:text-gray-500">{language === 'ar' ? 'التاريخ' : 'Date'}</p>
                    <p className="text-gray-700 dark:text-gray-300 font-medium">{formatDate(d.created_at || d.createdAt)}</p>
                    <p className="text-[10px] text-gray-400">{getLastEditorName(d)}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 mt-3 border-t border-gray-100 dark:border-white/5">
                  <button
                    onClick={() => setHistoryTarget({ entityType: 'discount', entityId: d.id, title: d.reason || getScopeLabel(d) })}
                    className="flex-1 px-3 py-2 text-xs bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl font-semibold text-center hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
                  >
                    {language === 'ar' ? 'السجل' : 'History'}
                  </button>
                  {d.status === 'active' && (
                    <>
                    <button
                      onClick={() => handleEdit(d)}
                      className="flex-1 px-3 py-2 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl font-semibold text-center hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5 inline-block mr-1 rtl:mr-0 rtl:ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      {language === 'ar' ? 'تعديل' : 'Edit'}
                    </button>
                    <button
                      onClick={() => handleCancel(d.id)}
                      className="flex-1 px-3 py-2 text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-semibold text-center hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5 inline-block mr-1 rtl:mr-0 rtl:ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      {language === 'ar' ? 'إلغاء' : 'Cancel'}
                    </button>
                    </>
                  )}
                </div>
              </GlassCard>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-white text-sm"
              >
                {language === 'ar' ? 'السابق' : 'Previous'}
              </Button>
              <span className="flex items-center px-4 text-sm text-gray-600 dark:text-gray-400">
                {page} / {pagination.totalPages}
              </span>
              <Button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-white text-sm"
              >
                {language === 'ar' ? 'التالي' : 'Next'}
              </Button>
            </div>
          )}
        </>
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
