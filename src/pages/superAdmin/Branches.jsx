import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { branchesService, usersService } from '../../services'
import GlassCard from '../../components/ui/GlassCard'
import Button from '../../components/ui/Button'
import PhoneInput from '../../components/ui/PhoneInput'
import { DEFAULT_COUNTRY_CODE, formatPhoneForApi, parsePhoneToCountryAndLocal } from '../../utils/phone'

export default function Branches() {
  const { language } = useLanguage()
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingBranch, setEditingBranch] = useState(null)
  const [expandedBranchId, setExpandedBranchId] = useState(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  const [branches, setBranches] = useState([])
  const [availableSupervisors, setAvailableSupervisors] = useState([])

  const [formData, setFormData] = useState({
    name: '',
    locationEn: '',
    locationAr: '',
    contactCountryCode: DEFAULT_COUNTRY_CODE,
    contact: ''
  })

  // Fetch branches
  const fetchBranches = useCallback(async () => {
    try {
      const response = await branchesService.getAll()
      if (response.success && response.data) {
        const transformed = response.data.map(b => ({
          id: b.id,
          name: { en: b.name, ar: b.name_ar || b.name },
          location: { en: b.address || '', ar: b.address || '' },
          supervisor: b.manager ? { 
            id: b.manager.id, 
            en: `${b.manager.first_name} ${b.manager.last_name}`, 
            ar: b.manager.name_ar || `${b.manager.first_name} ${b.manager.last_name}` 
          } : null,
          programs: b.program_count || 0,
          coaches: b.coach_count || 0,
          players: b.player_count || 0,
          revenue: b.revenue || 0,
          status: b.is_active ? 'active' : 'inactive',
          contact: b.phone || '',
          createdAt: b.created_at ? new Date(b.created_at).toLocaleDateString() : ''
        }))
        setBranches(transformed)
      }
    } catch (err) {
      console.error('Error fetching branches:', err)
      setError(language === 'ar' ? 'فشل في تحميل الفروع' : 'Failed to load branches')
    }
  }, [language])

  // Fetch available supervisors (branch admins without a branch)
  const fetchSupervisors = useCallback(async () => {
    try {
      const response = await usersService.getByRole('branch_admin', { limit: 100 })
      if (response.success && response.data) {
        const transformed = response.data.map(u => ({
          id: u.id,
          name: { 
            en: `${u.first_name || ''} ${u.last_name || ''}`.trim(), 
            ar: u.name_ar || `${u.first_name || ''} ${u.last_name || ''}`.trim() 
          },
          assigned: !!u.branch_id
        }))
        setAvailableSupervisors(transformed)
      }
    } catch (err) {
      console.error('Error fetching supervisors:', err)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      await Promise.all([fetchBranches(), fetchSupervisors()])
      setLoading(false)
    }
    fetchData()
  }, [fetchBranches, fetchSupervisors])

  // Clear messages
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
      name: '',
      locationEn: '',
      locationAr: '',
      contactCountryCode: DEFAULT_COUNTRY_CODE,
      contact: ''
    })
    setEditingBranch(null)
  }

  const totalStats = {
    branches: branches.length,
    coaches: branches.reduce((sum, b) => sum + b.coaches, 0),
    players: branches.reduce((sum, b) => sum + b.players, 0),
    revenue: branches.reduce((sum, b) => sum + b.revenue, 0),
  }

  const formatCurrency = (amount) => `SAR ${amount.toLocaleString()}`

  const handleEdit = (branch) => {
    const phoneData = parsePhoneToCountryAndLocal(branch.contact || '')
    setEditingBranch(branch)
    setFormData({
      name: branch.name.en || branch.name.ar,
      locationEn: branch.location.en,
      locationAr: branch.location.ar,
      contactCountryCode: phoneData.countryCode,
      contact: phoneData.localNumber
    })
    setShowAddForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const branchData = {
        name: formData.name,
        name_ar: formData.name,
        address: formData.locationEn,
        phone: formatPhoneForApi(formData.contact, formData.contactCountryCode),
        is_active: true
      }

      let response
      if (editingBranch) {
        response = await branchesService.update(editingBranch.id, branchData)
      } else {
        response = await branchesService.create(branchData)
      }

      if (response.success) {
        setSuccessMessage(
          editingBranch 
            ? (language === 'ar' ? 'تم تحديث الفرع بنجاح' : 'Branch updated successfully')
            : (language === 'ar' ? 'تم إنشاء الفرع بنجاح' : 'Branch created successfully')
        )
        setShowAddForm(false)
        resetForm()
        fetchBranches()
        fetchSupervisors()
      }
    } catch (err) {
      console.error('Error saving branch:', JSON.stringify(err, null, 2))
      console.error('Error response:', err.response?.data)
      setError(err.response?.data?.message || err.message || (language === 'ar' ? 'فشل في حفظ الفرع' : 'Failed to save branch'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirmId) return
    
    setSubmitting(true)
    try {
      await branchesService.delete(deleteConfirmId)
      setSuccessMessage(language === 'ar' ? 'تم حذف الفرع بنجاح' : 'Branch deleted successfully')
      fetchBranches()
    } catch (err) {
      console.error('Error deleting branch:', err)
      setError(err.message || (language === 'ar' ? 'فشل في حذف الفرع' : 'Failed to delete branch'))
    } finally {
      setSubmitting(false)
      setDeleteConfirmId(null)
    }
  }

  const renderAddForm = () => {
    const isEditing = editingBranch !== null

    return (
      <GlassCard className="mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-secondary dark:text-white flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                {isEditing ? (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                )}
              </div>
              {isEditing 
                ? (language === 'ar' ? 'تعديل الفرع' : 'Edit Branch')
                : (language === 'ar' ? 'إضافة فرع جديد' : 'Add New Branch')}
            </h3>
            <button
              onClick={() => { setShowAddForm(false); resetForm() }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl text-gray-500"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'ar' ? 'اسم الفرع' : 'Branch Name'} *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder={language === 'ar' ? 'مثال: فرع الدمام' : 'e.g., Dammam'}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'ar' ? 'الموقع' : 'Location'}
                </label>
                <input
                  type="text"
                  value={formData.locationEn}
                  onChange={(e) => setFormData({ ...formData, locationEn: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., Al Olaya District, Riyadh"
                />
              </div>

              <div>
                <PhoneInput
                  label={language === 'ar' ? 'رقم الاتصال' : 'Contact Number'}
                  value={formData.contact}
                  onChange={(value) => setFormData({ ...formData, contact: value })}
                  countryCode={formData.contactCountryCode}
                  onCountryCodeChange={(code) => setFormData({ ...formData, contactCountryCode: code })}
                  className="w-full"
                  required={false}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-white/10">
              <Button 
                type="submit" 
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                disabled={submitting}
              >
                {submitting ? (
                  <svg className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {isEditing 
                  ? (language === 'ar' ? 'حفظ التغييرات' : 'Save Changes')
                  : (language === 'ar' ? 'إضافة الفرع' : 'Add Branch')}
              </Button>
              <button
                type="button"
                onClick={() => { setShowAddForm(false); resetForm() }}
                className="px-6 py-2 text-gray-600 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </form>
        </div>
      </GlassCard>
    )
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
      {/* Success/Error Messages */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 p-4 bg-emerald-500 text-white rounded-xl shadow-lg flex items-center gap-3">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="ml-2 hover:opacity-80">✕</button>
        </div>
      )}

      {error && (
        <div className="fixed top-4 right-4 z-50 p-4 bg-red-500 text-white rounded-xl shadow-lg flex items-center gap-3">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-2 hover:opacity-80">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-secondary dark:text-white">
            {language === 'ar' ? 'إدارة الفروع' : 'Branches Management'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {language === 'ar' ? 'إدارة جميع الفروع والمشرفين' : 'Manage all branches and supervisors'}
          </p>
        </div>
        {!showAddForm && (
          <Button onClick={() => { setShowAddForm(true); resetForm() }} className="bg-gradient-to-r from-purple-500 to-pink-500">
            <svg className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {language === 'ar' ? 'إضافة فرع' : 'Add Branch'}
          </Button>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: { en: 'Total Branches', ar: 'إجمالي الفروع' }, value: totalStats.branches, color: 'from-purple-400 to-purple-600', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
          { label: { en: 'Total Coaches', ar: 'إجمالي المدربين' }, value: totalStats.coaches, color: 'from-emerald-400 to-emerald-600', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
          { label: { en: 'Total Players', ar: 'إجمالي اللاعبين' }, value: totalStats.players, color: 'from-blue-400 to-blue-600', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
          { label: { en: 'Total Revenue', ar: 'إجمالي الإيرادات' }, value: formatCurrency(totalStats.revenue), color: 'from-teal-400 to-teal-600', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
        ].map((stat, idx) => (
          <GlassCard key={idx} className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                </svg>
              </div>
              <div>
                <p className="text-xl font-bold text-secondary dark:text-white">{stat.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label[language]}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Add/Edit Form */}
      {showAddForm && renderAddForm()}

      {/* Branches List */}
      <GlassCard className="overflow-hidden">
        {branches.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <p className="text-gray-500 mb-4">{language === 'ar' ? 'لا توجد فروع بعد' : 'No branches yet'}</p>
            <Button onClick={() => setShowAddForm(true)} className="bg-gradient-to-r from-purple-500 to-pink-500">
              {language === 'ar' ? 'إضافة فرع جديد' : 'Add New Branch'}
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-white/5">
            {branches.map((branch) => (
              <div key={branch.id}>
                <div className={`hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${expandedBranchId === branch.id ? 'bg-gray-50 dark:bg-white/5' : ''}`}>
                  <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                        {branch.name.en.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-secondary dark:text-white">{branch.name[language]}</p>
                        <p className="text-sm text-gray-500 truncate">{branch.location[language]}</p>
                      </div>
                    </div>

                    <div className="hidden md:flex items-center gap-8">
                      <div className="text-center">
                        <p className="text-lg font-bold text-secondary dark:text-white">{branch.players}</p>
                        <p className="text-xs text-gray-500">{language === 'ar' ? 'لاعب' : 'Players'}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-secondary dark:text-white">{branch.coaches}</p>
                        <p className="text-xs text-gray-500">{language === 'ar' ? 'مدرب' : 'Coaches'}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{formatCurrency(branch.revenue)}</p>
                        <p className="text-xs text-gray-500">{language === 'ar' ? 'الإيرادات' : 'Revenue'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setExpandedBranchId(expandedBranchId === branch.id ? null : branch.id)}
                        className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg"
                      >
                        <svg className={`w-5 h-5 transition-transform ${expandedBranchId === branch.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <button onClick={() => handleEdit(branch)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => setDeleteConfirmId(branch.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {deleteConfirmId === branch.id && (
                    <div className="px-6 pb-4">
                      <div className="p-4 bg-red-50 dark:bg-red-500/10 rounded-xl border border-red-200 dark:border-red-500/20">
                        <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-3">
                          {language === 'ar' ? `هل أنت متأكد من حذف "${branch.name[language]}"؟` : `Delete "${branch.name[language]}"?`}
                        </p>
                        <div className="flex gap-2">
                          <button onClick={handleDelete} disabled={submitting} className="px-4 py-2 text-sm font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50">
                            {submitting ? '...' : (language === 'ar' ? 'حذف' : 'Delete')}
                          </button>
                          <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg">
                            {language === 'ar' ? 'إلغاء' : 'Cancel'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {expandedBranchId === branch.id && deleteConfirmId !== branch.id && (
                    <div className="px-6 pb-4">
                      <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">{language === 'ar' ? 'مدير الفرع' : 'Branch Manager'}</p>
                          <p className="text-sm font-medium text-secondary dark:text-white">
                            {branch.supervisor?.[language] || (language === 'ar' ? 'غير معين' : 'Not Assigned')}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">{language === 'ar' ? 'رقم الاتصال' : 'Contact'}</p>
                          <p className="text-sm font-medium text-secondary dark:text-white">{branch.contact || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">{language === 'ar' ? 'البرامج' : 'Programs'}</p>
                          <p className="text-sm font-medium text-secondary dark:text-white">{branch.programs}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">{language === 'ar' ? 'تاريخ الإنشاء' : 'Created'}</p>
                          <p className="text-sm font-medium text-secondary dark:text-white">{branch.createdAt}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  )
}
