import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { useAuth } from '../../hooks/useAuth'
import { programsService, branchesService } from '../../services'
import GlassCard from '../../components/ui/GlassCard'
import Button from '../../components/ui/Button'
import NumericInput from '../../components/ui/NumericInput'

export default function Programs() {
  const { language } = useLanguage()
  const { user } = useAuth()
  const isBranchAdmin = user?.role === 'branch_admin'
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingProgram, setEditingProgram] = useState(null)
  const [expandedProgramId, setExpandedProgramId] = useState(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  const [programs, setPrograms] = useState([])
  const [branches, setBranches] = useState([])

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    ageRange: '',
    branchId: '',
    pricingPlans: [{ name: '', price: '', duration_months: '' }]
  })

  // Fetch programs
  const fetchPrograms = useCallback(async () => {
    try {
      const response = await programsService.getAll({
        limit: 500,
        ...(isBranchAdmin ? { branch_id: user?.branch_id } : {})
      })
      if (response.success && response.data) {
        const transformed = response.data.map(p => ({
          id: p.id,
          name: p.name || p.name_ar || '',
          description: p.description || '',
          ageRange: `${p.age_group_min || 0}-${p.age_group_max || 18}`,
          pricingPlans: p.pricing_plans || [],
          // Fallback to old pricing if no plans exist
          pricing: { 
            monthly: p.price_monthly || 0, 
            quarterly: p.price_quarterly || 0, 
            annual: p.price_annual || 0 
          },
          branchId: p.branch_id,
          branch: p.branch?.name || '',
          players: p.current_enrollment || 0,
          coaches: p.coach_count || 0,
          status: p.is_active ? 'active' : 'inactive',
          createdAt: p.created_at ? new Date(p.created_at).toLocaleDateString() : ''
        }))
        setPrograms(transformed)
      }
    } catch (err) {
      console.error('Error fetching programs:', err)
      setError(language === 'ar' ? 'فشل في تحميل البرامج' : 'Failed to load programs')
    }
  }, [isBranchAdmin, language, user?.branch_id])

  // Fetch branches
  const fetchBranches = useCallback(async () => {
    if (isBranchAdmin) {
      setBranches(user?.branch ? [{
        id: user.branch.id || user.branch_id,
        name: { en: user.branch.name, ar: user.branch.name_ar || user.branch.name }
      }] : [])
      return
    }
    try {
      const response = await branchesService.getAll()
      if (response.success && response.data) {
        setBranches(response.data.map(b => ({
          id: b.id,
          name: { en: b.name, ar: b.name_ar || b.name }
        })))
      }
    } catch (err) {
      console.error('Error fetching branches:', err)
    }
  }, [isBranchAdmin, user?.branch, user?.branch_id])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      await Promise.all([fetchPrograms(), fetchBranches()])
      setLoading(false)
    }
    fetchData()
  }, [fetchPrograms, fetchBranches])

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  const resetForm = () => {
    setFormData({
      name: '', description: '', ageRange: '', branchId: '',
      pricingPlans: [{ name: '', price: '', duration_months: '' }]
    })
    setEditingProgram(null)
  }

  const formatCurrency = (amount) => `SAR ${Number(amount || 0).toLocaleString()}`

  const handleEdit = (program) => {
    setEditingProgram(program)
    
    // Convert pricing plans or use legacy pricing
    let plans = []
    if (program.pricingPlans && program.pricingPlans.length > 0) {
      plans = program.pricingPlans.map(p => ({
        name: p.name || '',
        price: p.price?.toString() || '',
        duration_months: p.duration_months?.toString() || ''
      }))
    } else {
      // Fallback: convert legacy pricing to plans
      if (program.pricing.monthly > 0) {
        plans.push({ name: language === 'ar' ? 'شهري' : 'Monthly', price: program.pricing.monthly.toString(), duration_months: '1' })
      }
      if (program.pricing.quarterly > 0) {
        plans.push({ name: language === 'ar' ? 'ربع سنوي' : 'Quarterly', price: program.pricing.quarterly.toString(), duration_months: '3' })
      }
      if (program.pricing.annual > 0) {
        plans.push({ name: language === 'ar' ? 'سنوي' : 'Annual', price: program.pricing.annual.toString(), duration_months: '12' })
      }
      if (plans.length === 0) {
        plans.push({ name: '', price: '', duration_months: '' })
      }
    }

    setFormData({
      name: program.name || '',
      description: program.description || '',
      ageRange: program.ageRange,
      branchId: isBranchAdmin ? String(user?.branch_id || program.branchId || '') : (program.branchId?.toString() || ''),
      pricingPlans: plans
    })
    setShowAddForm(true)
  }

  const addPricingPlan = () => {
    setFormData({
      ...formData,
      pricingPlans: [...formData.pricingPlans, { name: '', price: '', duration_months: '' }]
    })
  }

  const removePricingPlan = (index) => {
    if (formData.pricingPlans.length <= 1) return
    setFormData({
      ...formData,
      pricingPlans: formData.pricingPlans.filter((_, i) => i !== index)
    })
  }

  const updatePricingPlan = (index, field, value) => {
    const updated = [...formData.pricingPlans]
    updated[index] = { ...updated[index], [field]: value }
    setFormData({ ...formData, pricingPlans: updated })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    // Validate required fields
    if (!formData.name.trim()) {
      setError(language === 'ar' ? 'اسم البرنامج مطلوب' : 'Program name is required')
      setSubmitting(false)
      return
    }

    if (!(isBranchAdmin ? user?.branch_id : formData.branchId)) {
      setError(language === 'ar' ? 'الفرع مطلوب. يرجى إنشاء فرع أولاً.' : 'Branch is required. Please create a branch first.')
      setSubmitting(false)
      return
    }

    // Validate at least one pricing plan with name, price, and duration
    const validPlans = formData.pricingPlans.filter(p => p.name.trim() && p.price && p.duration_months)
    if (validPlans.length === 0) {
      setError(language === 'ar' ? 'أضف خطة تسعير واحدة على الأقل مع الاسم والسعر والمدة' : 'Add at least one pricing plan with name, price, and duration')
      setSubmitting(false)
      return
    }

    try {
      const [minAge, maxAge] = formData.ageRange.split('-').map(n => parseInt(n.trim()))
      const effectiveBranchId = isBranchAdmin ? user?.branch_id : formData.branchId
      const programData = {
        name: formData.name,
        name_ar: formData.name,
        description: formData.description,
        description_ar: formData.description,
        age_group_min: minAge || 0,
        age_group_max: maxAge || 18,
        branch_id: effectiveBranchId,
        is_active: true,
        pricing_plans: validPlans.map((p, index) => ({
          name: p.name,
          price: parseFloat(p.price) || 0,
          duration_months: parseInt(p.duration_months) || 1,
          sort_order: index
        }))
      }

      let response
      if (editingProgram) {
        response = await programsService.update(editingProgram.id, programData)
      } else {
        response = await programsService.create(programData)
      }

      if (response.success) {
        setSuccessMessage(
          editingProgram 
            ? (language === 'ar' ? 'تم تحديث البرنامج بنجاح' : 'Program updated successfully')
            : (language === 'ar' ? 'تم إنشاء البرنامج بنجاح' : 'Program created successfully')
        )
        setShowAddForm(false)
        resetForm()
        fetchPrograms()
      }
    } catch (err) {
      console.error('Error saving program:', err)
      setError(err.message || (language === 'ar' ? 'فشل في حفظ البرنامج' : 'Failed to save program'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirmId) return
    
    setSubmitting(true)
    try {
      await programsService.delete(deleteConfirmId)
      setSuccessMessage(language === 'ar' ? 'تم حذف البرنامج بنجاح' : 'Program deleted successfully')
      fetchPrograms()
    } catch (err) {
      console.error('Error deleting program:', err)
      setError(err.message || (language === 'ar' ? 'فشل في حذف البرنامج' : 'Failed to delete program'))
    } finally {
      setSubmitting(false)
      setDeleteConfirmId(null)
    }
  }

  // Get display price for a program (first plan or legacy monthly)
  const getDisplayPrice = (program) => {
    if (program.pricingPlans && program.pricingPlans.length > 0) {
      const firstPlan = program.pricingPlans[0]
      return {
        price: firstPlan.price,
        label: firstPlan.name
      }
    }
    return { price: program.pricing.monthly, label: language === 'ar' ? 'شهري' : 'Monthly' }
  }

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
      {/* Messages */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 p-4 bg-emerald-500 text-white rounded-xl shadow-lg flex items-center gap-3">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{successMessage}</span>
        </div>
      )}
      {error && (
        <div className="fixed top-4 right-4 z-50 p-4 bg-red-500 text-white rounded-xl shadow-lg flex items-center gap-3">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-secondary dark:text-white">
            {language === 'ar' ? 'إدارة البرامج' : 'Programs Management'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {language === 'ar' ? 'إدارة برامج التدريب والأسعار' : 'Manage training programs and pricing'}
          </p>
        </div>
        {!showAddForm && (
          <Button onClick={() => { setShowAddForm(true); resetForm() }} className="bg-gradient-to-r from-purple-500 to-pink-500">
            <svg className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {language === 'ar' ? 'إضافة برنامج' : 'Add Program'}
          </Button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-secondary dark:text-white">
              {editingProgram ? (language === 'ar' ? 'تعديل البرنامج' : 'Edit Program') : (language === 'ar' ? 'إضافة برنامج جديد' : 'Add New Program')}
            </h3>
            <button onClick={() => { setShowAddForm(false); resetForm() }} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{language === 'ar' ? 'اسم البرنامج' : 'Program Name'} *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{language === 'ar' ? 'الفئة العمرية' : 'Age Range'}</label>
                <input type="text" value={formData.ageRange} onChange={(e) => setFormData({ ...formData, ageRange: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="e.g., 6-10" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{language === 'ar' ? 'الفرع' : 'Branch'}</label>
                <select value={isBranchAdmin ? String(user?.branch_id || '') : formData.branchId} onChange={(e) => setFormData({ ...formData, branchId: e.target.value })} disabled={isBranchAdmin} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-60 disabled:cursor-not-allowed">
                  <option value="">{language === 'ar' ? 'اختر الفرع' : 'Select Branch'}</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name[language]}</option>)}
                </select>
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{language === 'ar' ? 'الوصف' : 'Description'}</label>
              <textarea 
                value={formData.description} 
                onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder={language === 'ar' ? 'وصف البرنامج...' : 'Program description...'}
              />
            </div>

            {/* Pricing Plans Section */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {language === 'ar' ? 'خطط التسعير' : 'Pricing Plans'} *
                </label>
                <button
                  type="button"
                  onClick={addPricingPlan}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-semibold text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  {language === 'ar' ? 'إضافة خطة' : 'Add Plan'}
                </button>
              </div>

              <div className="space-y-3">
                {formData.pricingPlans.map((plan, index) => (
                  <div key={index} className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">{language === 'ar' ? 'اسم الخطة' : 'Plan Name'} *</label>
                        <input
                          type="text"
                          value={plan.name}
                          onChange={(e) => updatePricingPlan(index, 'name', e.target.value)}
                          placeholder={language === 'ar' ? 'مثال: شهري' : 'e.g., Monthly'}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div className="w-28">
                        <label className="block text-xs text-gray-500 mb-1">{language === 'ar' ? 'المدة (شهر)' : 'Duration (mo)'} *</label>
                        <NumericInput
                          integer
                          min="1"
                          value={plan.duration_months}
                          onChange={(e) => updatePricingPlan(index, 'duration_months', e.target.value)}
                          placeholder="1"
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div className="w-28">
                        <label className="block text-xs text-gray-500 mb-1">{language === 'ar' ? 'السعر (SAR)' : 'Price (SAR)'} *</label>
                        <NumericInput
                          value={plan.price}
                          onChange={(e) => updatePricingPlan(index, 'price', e.target.value)}
                          placeholder="0"
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      {formData.pricingPlans.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePricingPlan(index)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="submit" className="bg-gradient-to-r from-purple-500 to-pink-500" disabled={submitting}>
                {submitting ? '...' : (editingProgram ? (language === 'ar' ? 'حفظ التغييرات' : 'Save Changes') : (language === 'ar' ? 'إضافة البرنامج' : 'Add Program'))}
              </Button>
              <button type="button" onClick={() => { setShowAddForm(false); resetForm() }} className="px-6 py-2 text-gray-600 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-100 dark:hover:bg-white/10">
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </form>
        </GlassCard>
      )}

      {/* Programs List */}
      <GlassCard className="overflow-hidden">
        {programs.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-gray-500 mb-4">{language === 'ar' ? 'لا توجد برامج بعد' : 'No programs yet'}</p>
            <Button onClick={() => setShowAddForm(true)} className="bg-gradient-to-r from-purple-500 to-pink-500">
              {language === 'ar' ? 'إضافة برنامج جديد' : 'Add New Program'}
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-white/5">
            {programs.map((program) => {
              const displayPrice = getDisplayPrice(program)
              return (
                <div key={program.id} className={`hover:bg-gray-50 dark:hover:bg-white/5 ${expandedProgramId === program.id ? 'bg-gray-50 dark:bg-white/5' : ''}`}>
                  <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-bold">
                        {program.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-secondary dark:text-white">{program.name}</p>
                        <p className="text-sm text-gray-500">{program.ageRange} {language === 'ar' ? 'سنة' : 'years'}</p>
                      </div>
                    </div>
                    <div className="hidden md:flex items-center gap-6">
                      <div className="text-center">
                        <p className="font-bold text-secondary dark:text-white">{program.players}</p>
                        <p className="text-xs text-gray-500">{language === 'ar' ? 'لاعب' : 'Players'}</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-purple-600">{formatCurrency(displayPrice.price)}</p>
                        <p className="text-xs text-gray-500">{displayPrice.label}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setExpandedProgramId(expandedProgramId === program.id ? null : program.id)} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg">
                        <svg className={`w-5 h-5 transition-transform ${expandedProgramId === program.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <button onClick={() => handleEdit(program)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {!isBranchAdmin && (
                        <button onClick={() => setDeleteConfirmId(program.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                  {deleteConfirmId === program.id && (
                    <div className="px-6 pb-4">
                      <div className="p-4 bg-red-50 dark:bg-red-500/10 rounded-xl">
                        <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-3">{language === 'ar' ? `حذف "${program.name}"؟` : `Delete "${program.name}"?`}</p>
                        <div className="flex gap-2">
                          <button onClick={handleDelete} disabled={submitting} className="px-4 py-2 text-sm font-semibold text-white bg-red-500 rounded-lg">{submitting ? '...' : (language === 'ar' ? 'حذف' : 'Delete')}</button>
                          <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg">{language === 'ar' ? 'إلغاء' : 'Cancel'}</button>
                        </div>
                      </div>
                    </div>
                  )}
                  {expandedProgramId === program.id && deleteConfirmId !== program.id && (
                    <div className="px-6 pb-4">
                      <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                        <p className="text-xs text-gray-500 mb-3 font-medium">{language === 'ar' ? 'خطط التسعير' : 'Pricing Plans'}</p>
                        {program.pricingPlans && program.pricingPlans.length > 0 ? (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {program.pricingPlans.map((plan, idx) => (
                              <div key={idx}>
                                <p className="text-xs text-gray-500 mb-1">{plan.name} ({plan.duration_months} {language === 'ar' ? 'شهر' : 'mo'})</p>
                                <p className="font-bold text-secondary dark:text-white">{formatCurrency(plan.price)}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">{language === 'ar' ? 'الشهري' : 'Monthly'}</p>
                              <p className="font-bold text-secondary dark:text-white">{formatCurrency(program.pricing.monthly)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">{language === 'ar' ? 'الفصلي' : 'Quarterly'}</p>
                              <p className="font-bold text-secondary dark:text-white">{formatCurrency(program.pricing.quarterly)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">{language === 'ar' ? 'السنوي' : 'Annual'}</p>
                              <p className="font-bold text-secondary dark:text-white">{formatCurrency(program.pricing.annual)}</p>
                            </div>
                          </div>
                        )}
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-white/10">
                          <p className="text-xs text-gray-500">{language === 'ar' ? 'الفرع' : 'Branch'}: <span className="font-medium text-secondary dark:text-white">{program.branch || (language === 'ar' ? 'جميع الفروع' : 'All Branches')}</span></p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </GlassCard>
    </div>
  )
}
