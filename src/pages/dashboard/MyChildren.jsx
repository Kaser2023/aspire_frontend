import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { useAuth } from '../../hooks/useAuth'
import { playersService, attendanceService, evaluationService, branchesService } from '../../services'
import GlassCard from '../../components/ui/GlassCard'
import Button from '../../components/ui/Button'

const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '')

export default function MyChildren() {
  const { language } = useLanguage()
  const { user } = useAuth()
  const isSelfPlayer = user?.account_type === 'self_player'
  const [loading, setLoading] = useState(true)
  const [children, setChildren] = useState([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [imagePreview, setImagePreview] = useState(null)
  const [idDocPreview, setIdDocPreview] = useState(null)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  // Link player states (for parents to link self-registered players)
  const [showLinkForm, setShowLinkForm] = useState(false)
  const [linkCode, setLinkCode] = useState('')
  const [linkError, setLinkError] = useState(null)
  const [linkSuccess, setLinkSuccess] = useState(null)
  const [linkLoading, setLinkLoading] = useState(false)
  // Branch is determined by parent's signup branch (user.branch_id)
  // Fallback: if parent has no branch, show branch selector
  const [branches, setBranches] = useState([])
  const parentHasBranch = !!user?.branch_id
  const [expandedChildId, setExpandedChildId] = useState(null)
  const [editingChildId, setEditingChildId] = useState(null)
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    nationality: '',
    address: '',
    birthDate: '',
    healthNotes: '',
    avatar: null,
    idDocument: null
  })
  const [editImagePreview, setEditImagePreview] = useState(null)
  const [editIdDocPreview, setEditIdDocPreview] = useState(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState(null)
  const [editMessage, setEditMessage] = useState(null)

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    nationality: '',
    address: '',
    birthDate: '',
    branchId: '',
    idType: 'id',
    healthNotes: '',
    image: null,
    idDocument: null
  })

  const fetchChildren = useCallback(async () => {
    if (!user?.id) return
    try {
      setLoading(true)
      const response = await playersService.getByParent(user.id)
      if (response.success && response.data) {
        const transformed = response.data.map(p => ({
          id: p.id,
          firstName: p.first_name || '',
          lastName: p.last_name || '',
          name: { 
            en: `${p.first_name} ${p.last_name}`, 
            ar: p.first_name_ar ? `${p.first_name_ar} ${p.last_name_ar || ''}` : `${p.first_name} ${p.last_name}` 
          },
          registrationNumber: p.registration_number || '',
          selfUserId: p.self_user_id || null,
          selfUserPhone: p.selfUser?.phone || null,
          nationality: p.nationality || '',
          address: p.address || '',
          avatar: p.avatar,
          idDocument: p.id_document,
          program: p.program ? { en: p.program.name, ar: p.program.name_ar || p.program.name } : null,
          birthDate: p.date_of_birth,
          status: p.status,
          branch: p.branch?.name,
          branchId: p.branch_id || '',
          healthNotes: p.medical_notes || '',
          attendanceRate: null,
          performanceRating: null
        }))
        const summaries = await Promise.all(
          transformed.map(async (child) => {
            const [attendanceRes, evaluationRes] = await Promise.all([
              attendanceService.getPlayerSummary(child.id),
              evaluationService.getPlayerSummary(child.id)
            ])
            return {
              id: child.id,
              attendanceRate: attendanceRes.success ? attendanceRes.data?.attendance_rate ?? null : null,
              performanceRating: evaluationRes.success
                ? (evaluationRes.data?.averageRating ?? evaluationRes.data?.average_rating ?? evaluationRes.data?.quick_average ?? null)
                : null
            }
          })
        )

        const summaryMap = summaries.reduce((acc, item) => {
          acc[item.id] = item
          return acc
        }, {})

        const withStats = transformed.map((child) => ({
          ...child,
          attendanceRate: summaryMap[child.id]?.attendanceRate ?? null,
          performanceRating: summaryMap[child.id]?.performanceRating ?? null
        }))

        setChildren(withStats)
      }
    } catch (err) {
      console.error('Error fetching children:', err)
      setError(language === 'ar' ? 'فشل في تحميل البيانات' : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [user?.id, language])

  useEffect(() => {
    fetchChildren()
  }, [fetchChildren])

  // Fetch branches only if parent doesn't have one assigned
  useEffect(() => {
    if (parentHasBranch) return
    const fetchBranches = async () => {
      try {
        const response = await branchesService.getPublic()
        if (response.success && response.data) {
          setBranches(response.data.map(b => ({
            id: b.id,
            name: { en: b.name, ar: b.name_ar || b.name }
          })))
        }
      } catch (err) {
        console.error('Error fetching branches:', err)
      }
    }
    fetchBranches()
  }, [parentHasBranch])

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setFormData({ ...formData, image: file })
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleIdDocChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setFormData({ ...formData, idDocument: file })
      const reader = new FileReader()
      reader.onloadend = () => {
        setIdDocPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleViewChild = (child) => {
    if (expandedChildId === child.id) {
      setExpandedChildId(null)
      setEditingChildId(null)
      setEditError(null)
      setEditMessage(null)
      setEditImagePreview(null)
      setEditIdDocPreview(null)
      return
    }
    setExpandedChildId(child.id)
    setEditingChildId(null)
    setEditError(null)
    setEditMessage(null)
    setEditImagePreview(null)
    setEditIdDocPreview(null)
    setEditForm({
      firstName: child.firstName || '',
      lastName: child.lastName || '',
      nationality: child.nationality || '',
      address: child.address || '',
      birthDate: child.birthDate || '',
      healthNotes: child.healthNotes || '',
      avatar: null,
      idDocument: null
    })
  }

  const handleEditChild = (child) => {
    setEditingChildId(child.id)
    setEditError(null)
    setEditMessage(null)
    setEditImagePreview(child.avatar || null)
    setEditIdDocPreview(child.idDocument || null)
    setEditForm({
      firstName: child.firstName || '',
      lastName: child.lastName || '',
      nationality: child.nationality || '',
      address: child.address || '',
      birthDate: child.birthDate || '',
      healthNotes: child.healthNotes || '',
      avatar: null,
      idDocument: null
    })
  }

  const handleEditImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setEditForm({ ...editForm, avatar: file })
      const reader = new FileReader()
      reader.onloadend = () => {
        setEditImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleEditIdDocChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setEditForm({ ...editForm, idDocument: file })
      const reader = new FileReader()
      reader.onloadend = () => {
        setEditIdDocPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCancelEdit = () => {
    setEditingChildId(null)
    setEditError(null)
    setEditMessage(null)
  }

  const handleSaveEdit = async (childId) => {
    try {
      setEditSaving(true)
      setEditError(null)
      setEditMessage(null)
      
      // Update basic info first
      const payload = {
        first_name: editForm.firstName.trim(),
        last_name: editForm.lastName.trim(),
        nationality: editForm.nationality?.trim() || undefined,
        address: editForm.address?.trim() || undefined,
        date_of_birth: editForm.birthDate || undefined,
        medical_notes: editForm.healthNotes || undefined
      }
      const response = await playersService.update(childId, payload)
      
      if (!response.success) {
        setEditError(response.message || (language === 'ar' ? 'فشل حفظ بيانات اللاعب' : 'Failed to update player'))
        return
      }
      
      // Upload avatar if changed
      if (editForm.avatar) {
        const avatarRes = await playersService.uploadPhoto(childId, editForm.avatar)
        if (!avatarRes.success) {
          console.error('Failed to upload avatar:', avatarRes.message)
        }
      }
      
      // Upload ID document if changed
      if (editForm.idDocument) {
        const docRes = await playersService.uploadIdDocument(childId, editForm.idDocument)
        if (!docRes.success) {
          console.error('Failed to upload ID document:', docRes.message)
        }
      }
      
      await fetchChildren()
      setEditingChildId(null)
      setEditImagePreview(null)
      setEditIdDocPreview(null)
      setEditMessage(language === 'ar' ? 'تم حفظ بيانات اللاعب' : 'Player details updated')
    } catch (err) {
      console.error('Error updating child:', err)
      setEditError(language === 'ar' ? 'فشل حفظ بيانات اللاعب' : 'Failed to update player')
    } finally {
      setEditSaving(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const branchId = user.branch_id || formData.branchId
      if (!branchId) {
        setError(language === 'ar' ? 'يرجى اختيار الفرع' : 'Please select a branch')
        setSubmitting(false)
        return
      }

      const playerData = {
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        nationality: formData.nationality?.trim() || undefined,
        address: formData.address?.trim() || undefined,
        date_of_birth: formData.birthDate,
        gender: 'male',
        branch_id: branchId,
        medical_notes: formData.healthNotes || undefined
      }

      const response = await playersService.create(playerData)
      if (response.success) {
        const newPlayerId = response.data?.id
        
        // Upload photo if provided
        if (newPlayerId && formData.image) {
          const avatarRes = await playersService.uploadPhoto(newPlayerId, formData.image)
          if (!avatarRes.success) {
            console.error('Failed to upload avatar:', avatarRes.message)
          }
        }
        
        // Upload ID document if provided
        if (newPlayerId && formData.idDocument) {
          const docRes = await playersService.uploadIdDocument(newPlayerId, formData.idDocument)
          if (!docRes.success) {
            console.error('Failed to upload ID document:', docRes.message)
          }
        }
        
        await fetchChildren()
        setShowAddForm(false)
        setImagePreview(null)
        setIdDocPreview(null)
        setFormData({ firstName: '', lastName: '', nationality: '', address: '', birthDate: '', branchId: '', idType: 'id', healthNotes: '', image: null, idDocument: null })
      } else {
        setError(response.message || (language === 'ar' ? 'فشل في تسجيل اللاعب' : 'Failed to register player'))
      }
    } catch (err) {
      console.error('Error creating child:', err)
      setError(err?.message || (language === 'ar' ? 'فشل في تسجيل اللاعب' : 'Failed to register player'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    setShowAddForm(false)
    setImagePreview(null)
    setIdDocPreview(null)
    setFormData({ firstName: '', lastName: '', nationality: '', address: '', birthDate: '', branchId: '', idType: 'id', healthNotes: '', image: null, idDocument: null })
  }

  const handleLinkPlayer = async (e) => {
    e.preventDefault()
    setLinkError(null)
    setLinkSuccess(null)
    
    if (!linkCode.trim()) {
      setLinkError(language === 'ar' ? 'يرجى إدخال رمز التسجيل' : 'Please enter registration code')
      return
    }

    setLinkLoading(true)
    try {
      const response = await playersService.linkPlayer(linkCode.trim())
      if (response.success) {
        setLinkSuccess(language === 'ar' 
          ? `تم ربط اللاعب ${response.data?.first_name || ''} ${response.data?.last_name || ''} بحسابك بنجاح` 
          : `Player ${response.data?.first_name || ''} ${response.data?.last_name || ''} linked to your account successfully`)
        setLinkCode('')
        await fetchChildren()
        setTimeout(() => {
          setShowLinkForm(false)
          setLinkSuccess(null)
        }, 2000)
      } else {
        setLinkError(response.message || (language === 'ar' ? 'فشل في ربط اللاعب' : 'Failed to link player'))
      }
    } catch (err) {
      setLinkError(err?.message || (language === 'ar' ? 'فشل في ربط اللاعب' : 'Failed to link player'))
    } finally {
      setLinkLoading(false)
    }
  }

  const getIdTypeLabel = (type) => {
    const labels = {
      id: { en: 'National ID', ar: 'بطاقة الهوية' },
      passport: { en: 'Passport', ar: 'جواز السفر' },
      iqama: { en: 'Iqama', ar: 'الإقامة' }
    }
    return labels[type]?.[language] || type
  }

  const getAgeLabel = (birthDate) => {
    if (!birthDate) return ''
    const birth = new Date(birthDate)
    if (Number.isNaN(birth.getTime())) return ''
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age -= 1
    }
    return language === 'ar' ? `${age} سنة` : `${age} yrs`
  }

  const renderStars = (rating) => {
    const value = Number.isFinite(rating) ? rating : 0
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-4 h-4 ${star <= Math.round(value) ? 'text-yellow-400' : 'text-gray-300'}`}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        ))}
      </div>
    )
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-secondary dark:text-white">
            {isSelfPlayer
              ? (language === 'ar' ? 'ملفي' : 'My Profile')
              : (language === 'ar' ? 'أبنائي' : 'My Children')
            }
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {isSelfPlayer
              ? (language === 'ar' ? 'ملف اللاعب الخاص بك' : 'Your player profile')
              : (language === 'ar' ? 'إدارة ملفات الأبناء' : 'Manage your children profiles')
            }
          </p>
        </div>
        <div className="flex gap-2">
          {!isSelfPlayer && (
            <>
              <Button onClick={() => setShowLinkForm(true)} variant="outline" className="border-primary text-primary hover:bg-primary/10">
                <svg className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                {language === 'ar' ? 'ربط لاعب' : 'Link Player'}
              </Button>
              <Button onClick={() => setShowAddForm(true)} className="bg-primary hover:bg-primary/90">
                <svg className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {language === 'ar' ? 'إضافة أبناء' : 'Add Child'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Link Player Form */}
      {showLinkForm && (
        <GlassCard className="p-6">
          <h2 className="text-xl font-bold text-secondary dark:text-white mb-4">
            {language === 'ar' ? 'ربط لاعب بحسابك' : 'Link Player to Your Account'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
            {language === 'ar' 
              ? 'أدخل رمز التسجيل الخاص باللاعب (يحصل عليه اللاعب عند تسجيل حسابه)'
              : 'Enter the player\'s registration code (the player gets it when they create their account)'}
          </p>
          {linkError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
              {linkError}
            </div>
          )}
          {linkSuccess && (
            <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 text-sm">
              {linkSuccess}
            </div>
          )}
          <form onSubmit={handleLinkPlayer} className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {language === 'ar' ? 'رمز التسجيل' : 'Registration Code'}
              </label>
              <input
                type="text"
                value={linkCode}
                onChange={(e) => setLinkCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary font-mono text-lg tracking-wider"
                placeholder="PLR-2026-00001"
                dir="ltr"
              />
            </div>
            <Button type="submit" disabled={linkLoading} className="bg-primary hover:bg-primary/90">
              {linkLoading 
                ? (language === 'ar' ? 'جاري الربط...' : 'Linking...')
                : (language === 'ar' ? 'ربط' : 'Link')
              }
            </Button>
            <Button type="button" variant="outline" onClick={() => { setShowLinkForm(false); setLinkError(null); setLinkSuccess(null); setLinkCode(''); }}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
          </form>
        </GlassCard>
      )}

      {/* Add Child Form */}
      {showAddForm && (
        <GlassCard className="p-6">
          <h2 className="text-xl font-bold text-secondary dark:text-white mb-6">
            {language === 'ar' ? 'تسجيل أبناء جدد' : 'Register New Child'}
          </h2>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Child Photo */}
            <div className="flex flex-col items-center gap-4">
              <div className="w-32 h-32 rounded-2xl bg-gray-100 dark:bg-white/10 overflow-hidden flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-white/20">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </div>
              <label className="cursor-pointer px-4 py-2 bg-gray-100 dark:bg-white/10 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-white/20 transition-colors">
                {language === 'ar' ? 'اختر صورة' : 'Choose Photo'}
                <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'ar' ? 'الاسم الأول' : 'First Name'} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={language === 'ar' ? 'أدخل الاسم الأول' : 'Enter first name'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'ar' ? 'اسم العائلة' : 'Last Name'} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={language === 'ar' ? 'أدخل اسم العائلة' : 'Enter last name'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'ar' ? 'الجنسية' : 'Nationality'}
                </label>
                <input
                  type="text"
                  value={formData.nationality}
                  onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={language === 'ar' ? 'أدخل الجنسية' : 'Enter nationality'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'ar' ? 'تاريخ الميلاد' : 'Date of Birth'} *
                </label>
                <input
                  type="date"
                  required
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              {/* Branch selector - only shown if parent has no branch from signup */}
              {!parentHasBranch && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'ar' ? 'الفرع' : 'Branch'} *
                  </label>
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">{language === 'ar' ? 'اختر الفرع' : 'Select branch'}</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>{branch.name[language]}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className={parentHasBranch ? 'md:col-span-2' : ''}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'ar' ? 'العنوان' : 'Address'}
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={language === 'ar' ? 'أدخل العنوان' : 'Enter address'}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {language === 'ar' ? 'نوع الوثيقة' : 'ID Type'} *
              </label>
              <select
                value={formData.idType}
                onChange={(e) => setFormData({ ...formData, idType: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="id">{language === 'ar' ? 'بطاقة الهوية' : 'National ID'}</option>
                <option value="passport">{language === 'ar' ? 'جواز السفر' : 'Passport'}</option>
                <option value="iqama">{language === 'ar' ? 'الإقامة' : 'Iqama'}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {language === 'ar' ? 'ملاحظات صحية' : 'Health Notes'}
              </label>
              <textarea
                value={formData.healthNotes}
                onChange={(e) => setFormData({ ...formData, healthNotes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder={language === 'ar' ? 'أي حساسية أو حالات صحية يجب معرفتها' : 'Any allergies or health conditions we should know'}
              />
            </div>

            {/* ID Document Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {language === 'ar' ? 'صورة الوثيقة' : 'ID Document'}
              </label>
              <div className="border-2 border-dashed border-gray-300 dark:border-white/20 rounded-xl p-6 text-center">
                {idDocPreview ? (
                  <div className="space-y-2">
                    <img src={idDocPreview} alt="ID Preview" className="max-h-40 mx-auto rounded-lg" />
                    <button type="button" onClick={() => { setIdDocPreview(null); setFormData({ ...formData, idDocument: null }) }} className="text-red-500 text-sm">
                      {language === 'ar' ? 'إزالة' : 'Remove'}
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-sm text-gray-500">{language === 'ar' ? 'اضغط لرفع الوثيقة' : 'Click to upload document'}</p>
                    <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleIdDocChange} />
                  </label>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              {error && (
                <div className="flex-shrink-0 w-full p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}
              <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90" disabled={submitting}>
                {submitting
                  ? (language === 'ar' ? 'جاري التسجيل...' : 'Registering...')
                  : (language === 'ar' ? 'تسجيل الأبناء' : 'Register Child')}
              </Button>
              <Button type="button" onClick={handleCancel} className="bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-white/20">
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
            </div>
          </form>
        </GlassCard>
      )}

      {/* Empty State */}
      {children.length === 0 && !showAddForm && (
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
              ? 'قم بتسجيل اللاعب لبدء متابعة تقدمه في الأكاديمية'
              : 'Register your player to start tracking their progress at the academy'}
          </p>
          <Button onClick={() => setShowAddForm(true)} className="bg-primary hover:bg-primary/90">
            <svg className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {language === 'ar' ? 'تسجيل لاعب جديد' : 'Register a Player'}
          </Button>
        </GlassCard>
      )}

      {/* Children List (when populated) */}
      {children.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {children.map(child => {
            const rating = Number.isFinite(child.performanceRating) ? child.performanceRating : null
            const attendanceRate = Number.isFinite(child.attendanceRate) ? child.attendanceRate : null
            return (
              <GlassCard key={child.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-yellow-400 flex items-center justify-center text-xl overflow-hidden">
                      {child.avatar ? (
                        <img 
                          src={child.avatar.startsWith('http') ? child.avatar : `${BASE_URL}${child.avatar}`} 
                          alt={child.name?.[language]} 
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block' }}
                        />
                      ) : null}
                      <span style={{ display: child.avatar ? 'none' : 'block' }}>⚽</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-secondary dark:text-white">{child.name?.[language]}</span>
                        {child.status && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">
                            {language === 'ar' ? 'نشط' : 'Active'}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {getAgeLabel(child.birthDate)}
                        {child.program?.[language] ? ` • ${child.program?.[language]}` : ''}
                      </p>
                      {/* Registration code - shown for self-players to share with their parent */}
                      {isSelfPlayer && child.registrationNumber && (
                        <p className="text-xs text-primary font-mono mt-1">
                          {language === 'ar' ? 'رمز التسجيل: ' : 'Reg. Code: '}{child.registrationNumber}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleViewChild(child)}
                    className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10"
                    aria-label={language === 'ar' ? 'عرض التفاصيل' : 'View details'}
                  >
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-500">{language === 'ar' ? 'التقييم' : 'Rating'}</span>
                      <span className="text-sm font-bold text-secondary dark:text-white">
                        {rating !== null ? rating.toFixed(1) : '--'}
                      </span>
                    </div>
                    {renderStars(rating || 0)}
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-500">{language === 'ar' ? 'الحضور' : 'Attendance'}</span>
                      <span className="text-sm font-bold text-secondary dark:text-white">
                        {attendanceRate !== null ? `${attendanceRate}%` : '--'}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-green-500"
                        style={{ width: `${Math.min(100, Math.max(0, attendanceRate ?? 0))}%` }}
                      />
                    </div>
                  </div>
                </div>

                {expandedChildId === child.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-secondary dark:text-white">
                        {language === 'ar' ? 'تفاصيل اللاعب' : 'Player Details'}
                      </h3>
                      {editingChildId === child.id ? (
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleSaveEdit(child.id)}
                            disabled={editSaving}
                            className="bg-primary hover:bg-primary/90"
                          >
                            {editSaving ? (language === 'ar' ? 'جارٍ الحفظ...' : 'Saving...') : (language === 'ar' ? 'حفظ' : 'Save')}
                          </Button>
                          <Button
                            onClick={handleCancelEdit}
                            className="bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-white/20"
                          >
                            {language === 'ar' ? 'إلغاء' : 'Cancel'}
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => handleEditChild(child)}
                          className="bg-primary hover:bg-primary/90"
                        >
                          {language === 'ar' ? 'تعديل' : 'Edit'}
                        </Button>
                      )}
                    </div>

                    {editError && (
                      <p className="text-sm text-red-500 mb-3">{editError}</p>
                    )}
                    {editMessage && (
                      <p className="text-sm text-emerald-600 mb-3">{editMessage}</p>
                    )}

                    {editingChildId === child.id ? (
                      <div className="space-y-4">
                        {/* Photo Upload */}
                        <div className="flex flex-col items-center gap-3 pb-4 border-b border-gray-200 dark:border-white/10">
                          <div className="w-24 h-24 rounded-2xl bg-gray-100 dark:bg-white/10 overflow-hidden flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-white/20">
                            {editImagePreview ? (
                              <img 
                                src={editImagePreview.startsWith('data:') || editImagePreview.startsWith('http') ? editImagePreview : `${BASE_URL}${editImagePreview}`} 
                                alt="Preview" 
                                className="w-full h-full object-cover" 
                              />
                            ) : (
                              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            )}
                          </div>
                          <label className="cursor-pointer px-3 py-1.5 bg-gray-100 dark:bg-white/10 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-white/20 transition-colors">
                            {language === 'ar' ? 'تغيير الصورة' : 'Change Photo'}
                            <input type="file" className="hidden" accept="image/*" onChange={handleEditImageChange} />
                          </label>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              {language === 'ar' ? 'الاسم الأول' : 'First Name'}
                            </label>
                            <input
                              type="text"
                              value={editForm.firstName}
                              onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                              className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              {language === 'ar' ? 'اسم العائلة' : 'Last Name'}
                            </label>
                            <input
                              type="text"
                              value={editForm.lastName}
                              onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                              className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              {language === 'ar' ? 'الجنسية' : 'Nationality'}
                            </label>
                            <input
                              type="text"
                              value={editForm.nationality}
                              onChange={(e) => setEditForm({ ...editForm, nationality: e.target.value })}
                              className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              {language === 'ar' ? 'تاريخ الميلاد' : 'Date of Birth'}
                            </label>
                            <input
                              type="date"
                              value={editForm.birthDate || ''}
                              onChange={(e) => setEditForm({ ...editForm, birthDate: e.target.value })}
                              className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              {language === 'ar' ? 'العنوان' : 'Address'}
                            </label>
                            <input
                              type="text"
                              value={editForm.address}
                              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                              className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              {language === 'ar' ? 'ملاحظات صحية' : 'Health Notes'}
                            </label>
                            <textarea
                              value={editForm.healthNotes}
                              onChange={(e) => setEditForm({ ...editForm, healthNotes: e.target.value })}
                              className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                              rows={3}
                            />
                          </div>
                        </div>
                        
                        {/* ID Document Upload */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {language === 'ar' ? 'صورة الوثيقة' : 'ID Document'}
                          </label>
                          <div className="border-2 border-dashed border-gray-300 dark:border-white/20 rounded-xl p-4 text-center">
                            {editIdDocPreview ? (
                              <div className="space-y-2">
                                <img 
                                  src={editIdDocPreview.startsWith('data:') || editIdDocPreview.startsWith('http') ? editIdDocPreview : `${BASE_URL}${editIdDocPreview}`} 
                                  alt="ID Preview" 
                                  className="max-h-32 mx-auto rounded-lg" 
                                />
                                <label className="cursor-pointer text-primary text-sm font-medium hover:underline">
                                  {language === 'ar' ? 'تغيير الوثيقة' : 'Change Document'}
                                  <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleEditIdDocChange} />
                                </label>
                              </div>
                            ) : (
                              <label className="cursor-pointer block">
                                <svg className="w-10 h-10 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                <p className="text-sm text-gray-500">{language === 'ar' ? 'اضغط لرفع الوثيقة' : 'Click to upload document'}</p>
                                <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleEditIdDocChange} />
                              </label>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Photo and ID Document Display */}
                        <div className="flex flex-wrap gap-4 pb-4 border-b border-gray-200 dark:border-white/10">
                          {/* Photo */}
                          <div className="text-center">
                            <p className="text-xs text-gray-500 mb-2">{language === 'ar' ? 'الصورة الشخصية' : 'Photo'}</p>
                            <div className="w-20 h-20 rounded-xl bg-gray-100 dark:bg-white/10 overflow-hidden flex items-center justify-center">
                              {child.avatar ? (
                                <img 
                                  src={child.avatar.startsWith('http') ? child.avatar : `${BASE_URL}${child.avatar}`} 
                                  alt={child.name?.[language]} 
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-2xl">⚽</span>
                              )}
                            </div>
                          </div>
                          {/* ID Document */}
                          <div className="text-center">
                            <p className="text-xs text-gray-500 mb-2">{language === 'ar' ? 'صورة الوثيقة' : 'ID Document'}</p>
                            <div className="w-20 h-20 rounded-xl bg-gray-100 dark:bg-white/10 overflow-hidden flex items-center justify-center">
                              {child.idDocument ? (
                                <a 
                                  href={child.idDocument.startsWith('http') ? child.idDocument : `${BASE_URL}${child.idDocument}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="w-full h-full"
                                >
                                  <img 
                                    src={child.idDocument.startsWith('http') ? child.idDocument : `${BASE_URL}${child.idDocument}`} 
                                    alt="ID Document" 
                                    className="w-full h-full object-cover"
                                  />
                                </a>
                              ) : (
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Registration Code - visible to parent only when child hasn't created their own account yet */}
                        {!isSelfPlayer && child.registrationNumber && !child.selfUserId && (
                          <div className="mb-4 p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200/50 dark:border-emerald-800/30 flex items-center justify-between">
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {language === 'ar' ? 'رمز التسجيل (شاركه مع اللاعب لإنشاء حسابه)' : 'Registration Code (share with player to create their account)'}
                              </p>
                              <p className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 tracking-wider mt-0.5">{child.registrationNumber}</p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                navigator.clipboard.writeText(child.registrationNumber)
                              }}
                              className="p-2 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-800/20 transition-colors"
                              title={language === 'ar' ? 'نسخ' : 'Copy'}
                            >
                              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-300">
                          <div>
                            <span className="font-semibold text-gray-700 dark:text-gray-200">
                              {language === 'ar' ? 'الاسم:' : 'Name:'}
                            </span>{' '}
                            {child.name?.[language]}
                          </div>
                          {/* Show child's phone if they have their own account */}
                          {!isSelfPlayer && child.selfUserPhone && (
                            <div>
                              <span className="font-semibold text-gray-700 dark:text-gray-200">
                                {language === 'ar' ? 'جوال اللاعب:' : 'Player Phone:'}
                              </span>{' '}
                              <span dir="ltr">{child.selfUserPhone}</span>
                            </div>
                          )}
                          <div>
                            <span className="font-semibold text-gray-700 dark:text-gray-200">
                              {language === 'ar' ? 'الجنسية:' : 'Nationality:'}
                            </span>{' '}
                            {child.nationality || '--'}
                          </div>
                          <div>
                            <span className="font-semibold text-gray-700 dark:text-gray-200">
                              {language === 'ar' ? 'تاريخ الميلاد:' : 'Birth Date:'}
                            </span>{' '}
                            {child.birthDate || '--'}
                          </div>
                          <div>
                            <span className="font-semibold text-gray-700 dark:text-gray-200">
                              {language === 'ar' ? 'الفرع:' : 'Branch:'}
                            </span>{' '}
                            {child.branch || '--'}
                          </div>
                          <div>
                            <span className="font-semibold text-gray-700 dark:text-gray-200">
                              {language === 'ar' ? 'البرنامج:' : 'Program:'}
                            </span>{' '}
                            {child.program?.[language] || '--'}
                          </div>
                          <div className="md:col-span-2">
                            <span className="font-semibold text-gray-700 dark:text-gray-200">
                              {language === 'ar' ? 'العنوان:' : 'Address:'}
                            </span>{' '}
                            {child.address || '--'}
                          </div>
                          <div className="md:col-span-2">
                            <span className="font-semibold text-gray-700 dark:text-gray-200">
                              {language === 'ar' ? 'ملاحظات صحية:' : 'Health Notes:'}
                            </span>{' '}
                            {child.healthNotes || '--'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </GlassCard>
            )
          })}

          <button
            onClick={() => setShowAddForm(true)}
            className="border-2 border-dashed border-gray-300 dark:border-white/20 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-white/80 dark:bg-white/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <span className="font-semibold">{language === 'ar' ? 'إضافة أبناء جدد' : 'Add New Child'}</span>
          </button>
        </div>
      )}
    </div>
  )
}
