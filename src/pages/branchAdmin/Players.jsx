import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { useAuth } from '../../hooks/useAuth'
import { usersService, programsService } from '../../services'
import playersService from '../../services/players.service'
import GlassCard from '../../components/ui/GlassCard'
import Button from '../../components/ui/Button'

export default function Players() {
  const { language } = useLanguage()
  const { user: currentUser } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [players, setPlayers] = useState([])
  const [showPendingOnly, setShowPendingOnly] = useState(false)
  const [parents, setParents] = useState([])
  const [programs, setPrograms] = useState([])
  const [coaches, setCoaches] = useState([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState(null)
  const [assigningPlayer, setAssigningPlayer] = useState(null)
  const [assignLoading, setAssignLoading] = useState(false)
  const [assignForm, setAssignForm] = useState({ programId: '', coachId: '' })
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [selectedPlayers, setSelectedPlayers] = useState([])
  
  const [formData, setFormData] = useState({
    name: '',
    nameAr: '',
    birthDate: '',
    gender: 'male',
    parentId: '',
    programId: '',
    healthNotes: ''
  })

  // Fetch players
  const fetchPlayers = useCallback(async () => {
    setLoading(true)
    try {
      const params = { limit: 500 }
      if (currentUser?.branch_id) {
        params.branch_id = currentUser.branch_id
      }
      if (showPendingOnly) {
        params.assignment_status = 'unassigned'
      }
      if (searchQuery) {
        params.search = searchQuery
      }
      
      const response = await playersService.getAll(params)
      if (response.success) {
        const transformed = response.data.map(p => ({
          id: p.id,
          name: { 
            en: `${p.first_name || ''} ${p.last_name || ''}`.trim(), 
            ar: `${p.first_name_ar || p.first_name || ''} ${p.last_name_ar || p.last_name || ''}`.trim()
          },
          phone: p.parent?.phone || '',
          parentName: {
            en: p.parent ? `${p.parent.first_name || ''} ${p.parent.last_name || ''}`.trim() : '',
            ar: p.parent ? (p.parent.name_ar || `${p.parent.first_name || ''} ${p.parent.last_name || ''}`.trim()) : ''
          },
          program: p.program ? { en: p.program.name, ar: p.program.name_ar || p.program.name, id: p.program.id } : null,
          programId: p.program_id,
          coachId: p.coach_id,
          coachName: {
            en: p.coach ? `${p.coach.first_name || ''} ${p.coach.last_name || ''}`.trim() : '',
            ar: p.coach ? (p.coach.name_ar || `${p.coach.first_name || ''} ${p.coach.last_name || ''}`.trim()) : ''
          },
          birthDate: p.date_of_birth,
          gender: p.gender,
          status: p.status || 'active',
          registrationNumber: p.registration_number,
          createdAt: p.created_at
        }))
        setPlayers(transformed)
      }
    } catch (err) {
      console.error('Error fetching players:', err)
    } finally {
      setLoading(false)
    }
  }, [currentUser?.branch_id, searchQuery, showPendingOnly])

  // Fetch parents and programs
  const fetchParentsAndPrograms = useCallback(async () => {
    try {
      console.log('Fetching parents and programs...')
      console.log('Current user branch_id:', currentUser?.branch_id)
      
      const promises = [usersService.getByRole('parent', { limit: 200 })]
      
      // Fetch programs for the branch
      if (currentUser?.branch_id) {
        promises.push(programsService.getAll({ branch_id: currentUser.branch_id }))
        promises.push(usersService.getByRole('coach', { branch_id: currentUser.branch_id, limit: 200 }))
      } else {
        promises.push(programsService.getAll())
        promises.push(usersService.getByRole('coach', { limit: 200 }))
      }
      
      const [parentsRes, programsRes, coachesRes] = await Promise.all(promises)
      
      console.log('Parents response:', parentsRes)
      console.log('Programs response:', programsRes)
      
      if (parentsRes.success && parentsRes.data) {
        const transformedParents = parentsRes.data.map(p => ({
          id: p.id,
          name: { 
            en: `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.phone, 
            ar: p.name_ar || `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.phone 
          },
          phone: p.phone
        }))
        console.log('Transformed parents:', transformedParents)
        setParents(transformedParents)
      } else {
        console.log('No parents found')
      }
      
      if (programsRes.success && programsRes.data) {
        const transformedPrograms = programsRes.data.map(p => ({
          id: p.id,
          name: { en: p.name, ar: p.name_ar || p.name },
          coachName: p.coach ? `${p.coach.first_name || ''} ${p.coach.last_name || ''}`.trim() : ''
        }))
        console.log('Transformed programs:', transformedPrograms)
        setPrograms(transformedPrograms)
      } else {
        console.log('No programs found')
      }

      if (coachesRes.success && coachesRes.data) {
        const transformedCoaches = coachesRes.data.map(c => ({
          id: c.id,
          name: {
            en: `${c.first_name || ''} ${c.last_name || ''}`.trim(),
            ar: c.name_ar || `${c.first_name || ''} ${c.last_name || ''}`.trim()
          },
          programIds: (c.programs || []).map(p => p.id)
        }))
        setCoaches(transformedCoaches)
      } else {
        setCoaches([])
      }
    } catch (err) {
      console.error('Error fetching parents/programs:', err)
    }
  }, [currentUser?.branch_id])

  useEffect(() => {
    fetchPlayers()
    fetchParentsAndPrograms()
  }, [fetchPlayers, fetchParentsAndPrograms])

  // Clear messages after 5 seconds
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
      nameAr: '',
      birthDate: '',
      gender: 'male',
      parentId: '',
      programId: '',
      healthNotes: ''
    })
    setEditingPlayer(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const nameParts = formData.name.split(' ')
      const nameArParts = formData.nameAr.split(' ')
      
      const playerData = {
        first_name: nameParts[0] || '',
        last_name: nameParts.slice(1).join(' ') || nameParts[0] || '',
        first_name_ar: nameArParts[0] || '',
        last_name_ar: nameArParts.slice(1).join(' ') || '',
        date_of_birth: formData.birthDate,
        gender: formData.gender || 'male',
        parent_id: formData.parentId,
        branch_id: currentUser?.branch_id,
        program_id: formData.programId || undefined,
        medical_notes: formData.healthNotes || undefined
      }

      console.log('Submitting player data:', playerData)

      let response
      if (editingPlayer) {
        response = await playersService.update(editingPlayer.id, playerData)
      } else {
        response = await playersService.create(playerData)
      }

      if (response.success) {
        setSuccessMessage(
          editingPlayer 
            ? (language === 'ar' ? 'تم تحديث اللاعب بنجاح' : 'Player updated successfully')
            : (language === 'ar' ? 'تم إضافة اللاعب بنجاح' : 'Player added successfully')
        )
        setShowAddForm(false)
        resetForm()
        fetchPlayers()
      }
    } catch (err) {
      console.error('Error saving player:', err)
      console.error('Error response:', err.response?.data)
      setError(err.response?.data?.message || err.message || (language === 'ar' ? 'فشل في حفظ اللاعب' : 'Failed to save player'))
    } finally {
      setLoading(false)
    }
  }

  const filteredPlayers = players.filter(player =>
    player.name?.en?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    player.name?.ar?.includes(searchQuery)
  )

  const filteredAssignCoaches = assignForm.programId
    ? coaches.filter(c => (c.programIds || []).includes(assignForm.programId))
    : []

  const openAssignPanel = (player) => {
    setAssigningPlayer(player)
    setAssignForm({
      programId: player.programId || '',
      coachId: player.coachId || ''
    })
    setError(null)
  }

  const closeAssignPanel = () => {
    setAssigningPlayer(null)
    setAssignForm({ programId: '', coachId: '' })
  }

  const handleAssignProgramCoach = async (e) => {
    e.preventDefault()
    if (!assigningPlayer?.id || !assignForm.programId || !assignForm.coachId) return
    try {
      setAssignLoading(true)
      setError(null)
      const response = await playersService.update(assigningPlayer.id, {
        program_id: assignForm.programId,
        coach_id: assignForm.coachId
      })
      if (response.success) {
        setSuccessMessage(language === 'ar' ? 'تم تعيين البرنامج والمدرب بنجاح' : 'Program and coach assigned successfully')
        closeAssignPanel()
        fetchPlayers()
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || (language === 'ar' ? 'فشل في تعيين البرنامج والمدرب' : 'Failed to assign program and coach'))
    } finally {
      setAssignLoading(false)
    }
  }

  // Get selected program's coach
  const selectedProgram = programs.find(p => p.id === formData.programId)

  if (loading && players.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <svg className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" fill="none" viewBox="0 0 24 24">
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
        <div className="p-4 bg-green-100 dark:bg-green-500/20 border border-green-200 dark:border-green-500/30 rounded-xl text-green-700 dark:text-green-300">
          {successMessage}
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-500/20 border border-red-200 dark:border-red-500/30 rounded-xl text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-secondary dark:text-white">
            {language === 'ar' ? 'اللاعبون' : 'Players'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {language === 'ar' ? 'إدارة اللاعبين المسجلين في الفرع' : 'Manage players registered in this branch'}
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setShowPendingOnly((prev) => !prev)}
            className={`${
              showPendingOnly
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            {showPendingOnly ? (language === 'ar' ? 'عرض الكل' : 'Show All') : (language === 'ar' ? 'اللاعبون المعلّقون' : 'Pending Players')}
          </Button>
          {!showAddForm && (
            <Button onClick={() => { setShowAddForm(true); resetForm() }} className="bg-gradient-to-r from-indigo-500 to-purple-500">
              <svg className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {language === 'ar' ? 'إضافة لاعب' : 'Add Player'}
            </Button>
          )}
          {players.length > 0 && (
            <div className="relative">
              <svg className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder={language === 'ar' ? 'بحث...' : 'Search...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rtl:pl-4 rtl:pr-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-64"
              />
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-secondary dark:text-white flex items-center gap-2">
              <span className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </span>
              {editingPlayer 
                ? (language === 'ar' ? 'تعديل اللاعب' : 'Edit Player')
                : (language === 'ar' ? 'إضافة لاعب جديد' : 'Add New Player')}
            </h3>
            <button onClick={() => { setShowAddForm(false); resetForm() }} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Player Name (English) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'ar' ? 'اسم اللاعب (إنجليزي)' : 'Player Name (English)'} *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Ahmed Hassan"
                  required
                />
              </div>

              {/* Player Name (Arabic) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'ar' ? 'اسم اللاعب (عربي)' : 'Player Name (Arabic)'} *
                </label>
                <input
                  type="text"
                  value={formData.nameAr}
                  onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="مثال: أحمد حسن"
                  dir="rtl"
                  required
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'ar' ? 'تاريخ الميلاد' : 'Date of Birth'} *
                </label>
                <input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Gender */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'ar' ? 'الجنس' : 'Gender'} *
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="male">{language === 'ar' ? 'ذكر' : 'Male'}</option>
                  <option value="female">{language === 'ar' ? 'أنثى' : 'Female'}</option>
                </select>
              </div>

              {/* Parent */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'ar' ? 'ولي الأمر' : 'Parent'} *
                  <span className="text-xs text-gray-400 ml-1">({parents.length})</span>
                </label>
                <select
                  value={formData.parentId}
                  onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">
                    {parents.length === 0 
                      ? (language === 'ar' ? 'لا يوجد أولياء أمور مسجلين' : 'No parents registered')
                      : (language === 'ar' ? 'اختر ولي الأمر' : 'Select Parent')}
                  </option>
                  {parents.map(parent => (
                    <option key={parent.id} value={parent.id}>
                      {parent.name[language]} ({parent.phone})
                    </option>
                  ))}
                </select>
                {parents.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    {language === 'ar' ? 'يجب تسجيل أولياء أمور أولاً من تطبيق الجوال أو صفحة التسجيل' : 'Parents must register first via mobile app or registration page'}
                  </p>
                )}
              </div>

              {/* Program (optional) - shows coach info */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'ar' ? 'البرنامج والمدرب' : 'Program & Coach'}
                  <span className="text-xs text-gray-400 ml-1">({programs.length})</span>
                </label>
                <select
                  value={formData.programId}
                  onChange={(e) => setFormData({ ...formData, programId: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">{language === 'ar' ? 'بدون برنامج (اختياري)' : 'No Program (optional)'}</option>
                  {programs.map(program => (
                    <option key={program.id} value={program.id}>
                      {program.name[language]} {program.coachName ? `(${language === 'ar' ? 'المدرب' : 'Coach'}: ${program.coachName})` : ''}
                    </option>
                  ))}
                </select>
                {selectedProgram?.coachName && (
                  <p className="text-xs text-green-600 mt-1">
                    {language === 'ar' ? 'المدرب:' : 'Coach:'} {selectedProgram.coachName}
                  </p>
                )}
              </div>

              {/* Health Notes (optional) */}
              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'ar' ? 'ملاحظات صحية' : 'Health Notes'}
                </label>
                <textarea
                  value={formData.healthNotes}
                  onChange={(e) => setFormData({ ...formData, healthNotes: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder={language === 'ar' ? 'أي ملاحظات صحية أو حساسية...' : 'Any health notes or allergies...'}
                  rows={2}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-white/10">
              <Button 
                type="submit" 
                className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                disabled={loading}
              >
                {loading ? (
                  <svg className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                ) : (
                  <svg className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {editingPlayer 
                  ? (language === 'ar' ? 'حفظ التغييرات' : 'Save Changes')
                  : (language === 'ar' ? 'إضافة' : 'Add')}
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
        </GlassCard>
      )}

      {/* Assign Program/Coach for pending players */}
      {assigningPlayer && (
        <GlassCard className="p-6 border border-amber-200 dark:border-amber-600/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-secondary dark:text-white">
              {language === 'ar' ? 'تعيين البرنامج والمدرب' : 'Assign Program & Coach'}
            </h3>
            <button onClick={closeAssignPanel} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {language === 'ar' ? 'اللاعب:' : 'Player:'} <span className="font-semibold text-gray-900 dark:text-white">{assigningPlayer.name?.[language] || assigningPlayer.name?.en}</span>
          </p>

          <form onSubmit={handleAssignProgramCoach} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {language === 'ar' ? 'البرنامج' : 'Program'} *
              </label>
              <select
                value={assignForm.programId}
                onChange={(e) => setAssignForm({ programId: e.target.value, coachId: '' })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">{language === 'ar' ? 'اختر البرنامج' : 'Select program'}</option>
                {programs.map(program => (
                  <option key={program.id} value={program.id}>{program.name[language]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {language === 'ar' ? 'المدرب' : 'Coach'} *
              </label>
              <select
                value={assignForm.coachId}
                onChange={(e) => setAssignForm({ ...assignForm, coachId: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                required
                disabled={!assignForm.programId}
              >
                <option value="">{language === 'ar' ? 'اختر المدرب' : 'Select coach'}</option>
                {filteredAssignCoaches.map(coach => (
                  <option key={coach.id} value={coach.id}>{coach.name[language]}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 flex items-center gap-3 pt-2">
              <Button type="submit" className="bg-indigo-500 hover:bg-indigo-600" disabled={assignLoading || !assignForm.programId || !assignForm.coachId}>
                {assignLoading ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? 'حفظ التعيين' : 'Save Assignment')}
              </Button>
              <button type="button" onClick={closeAssignPanel} className="px-4 py-2 text-gray-600 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-100 dark:hover:bg-white/10">
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </form>
        </GlassCard>
      )}

      {/* Players List */}
      {players.length === 0 && !showAddForm ? (
        <GlassCard className="p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-gray-500 mb-4">{language === 'ar' ? 'لا يوجد لاعبون مسجلون بعد' : 'No players registered yet'}</p>
          <Button onClick={() => { setShowAddForm(true); resetForm() }} className="bg-gradient-to-r from-indigo-500 to-purple-500">
            <svg className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {language === 'ar' ? 'إضافة أول لاعب' : 'Add First Player'}
          </Button>
        </GlassCard>
      ) : players.length > 0 && (
        <GlassCard className="overflow-hidden">
          {/* Selection Header */}
          {selectedPlayers.length > 0 && (
            <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 border-b border-indigo-100 dark:border-indigo-500/20 flex items-center justify-between">
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                {language === 'ar' 
                  ? `تم تحديد ${selectedPlayers.length} لاعب`
                  : `${selectedPlayers.length} player(s) selected`}
              </span>
              <button 
                onClick={() => setSelectedPlayers([])}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {language === 'ar' ? 'إلغاء التحديد' : 'Clear selection'}
              </button>
            </div>
          )}

          {/* Table Header */}
          <div className="hidden md:grid md:grid-cols-12 gap-4 p-4 bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10 font-semibold text-sm text-gray-600 dark:text-gray-400">
            <div className="col-span-1 flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedPlayers.length === filteredPlayers.length && filteredPlayers.length > 0}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedPlayers(filteredPlayers.map(p => p.id))
                  } else {
                    setSelectedPlayers([])
                  }
                }}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>#</span>
            </div>
            <div className="col-span-3">{language === 'ar' ? 'اللاعب' : 'Player'}</div>
            <div className="col-span-2">{language === 'ar' ? 'البرنامج' : 'Program'}</div>
            <div className="col-span-2">{language === 'ar' ? 'المدرب' : 'Coach'}</div>
            <div className="col-span-2">{language === 'ar' ? 'ولي الأمر' : 'Parent'}</div>
            <div className="col-span-1">{language === 'ar' ? 'الحالة' : 'Status'}</div>
            <div className="col-span-1">{language === 'ar' ? 'إجراء' : 'Action'}</div>
          </div>

          {/* Players Rows */}
          <div className="divide-y divide-gray-100 dark:divide-white/5">
            {filteredPlayers.map((player, index) => (
              <div 
                key={player.id} 
                className={`p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${
                  selectedPlayers.includes(player.id) ? 'bg-indigo-50 dark:bg-indigo-500/10' : ''
                }`}
              >
                {/* Desktop View */}
                <div className="hidden md:grid md:grid-cols-12 gap-4 items-center">
                  <div className="col-span-1 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedPlayers.includes(player.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPlayers([...selectedPlayers, player.id])
                        } else {
                          setSelectedPlayers(selectedPlayers.filter(id => id !== player.id))
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-gray-500">{index + 1}</span>
                  </div>
                  <div className="col-span-3 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
                      {player.name?.[language]?.charAt(0) || 'P'}
                    </div>
                    <div>
                      <p className="font-semibold text-secondary dark:text-white">{player.name?.[language]}</p>
                      {player.birthDate && (
                        <p className="text-xs text-gray-500">
                          {new Date().getFullYear() - new Date(player.birthDate).getFullYear()} {language === 'ar' ? 'سنة' : 'years'}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="col-span-2">
                    {player.program ? (
                      <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 rounded-lg text-sm font-medium">
                        {player.program[language]}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </div>
                  <div className="col-span-2">
                    {player.coachName?.[language] || player.coachName?.en ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {(player.coachName?.[language] || player.coachName?.en || '').charAt(0)}
                        </div>
                        <span className="text-sm text-secondary dark:text-white">{player.coachName?.[language] || player.coachName?.en}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </div>
                  <div className="col-span-2">
                    {player.parentName?.[language] || player.parentName?.en ? (
                      <div>
                        <p className="text-sm text-secondary dark:text-white">{player.parentName?.[language] || player.parentName?.en}</p>
                        {player.phone && <p className="text-xs text-gray-500">{player.phone}</p>}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </div>
                  <div className="col-span-1">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-lg ${
                      player.status === 'active' 
                        ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-300'
                        : 'bg-gray-100 dark:bg-gray-500/20 text-gray-600 dark:text-gray-300'
                    }`}>
                      {player.status === 'active' 
                        ? (language === 'ar' ? 'نشط' : 'Active')
                        : (language === 'ar' ? 'غير نشط' : 'Inactive')}
                    </span>
                  </div>
                  <div className="col-span-1">
                    {(!player.programId || !player.coachId) && (
                      <button
                        onClick={() => openAssignPanel(player)}
                        className="text-xs px-2 py-1 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-500/20 dark:text-amber-300"
                      >
                        {language === 'ar' ? 'تعيين' : 'Assign'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Mobile View */}
                <div className="md:hidden">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedPlayers.includes(player.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPlayers([...selectedPlayers, player.id])
                        } else {
                          setSelectedPlayers(selectedPlayers.filter(id => id !== player.id))
                        }
                      }}
                      className="w-4 h-4 mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-gray-500 mt-0.5 w-6">{index + 1}</span>
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {player.name?.[language]?.charAt(0) || 'P'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-secondary dark:text-white truncate">{player.name?.[language]}</p>
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-lg flex-shrink-0 ${
                          player.status === 'active' 
                            ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-300'
                            : 'bg-gray-100 dark:bg-gray-500/20 text-gray-600 dark:text-gray-300'
                        }`}>
                          {player.status === 'active' 
                            ? (language === 'ar' ? 'نشط' : 'Active')
                            : (language === 'ar' ? 'غير نشط' : 'Inactive')}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {player.program && (
                          <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 rounded text-xs">
                            {player.program[language]}
                          </span>
                        )}
                        {(player.coachName?.[language] || player.coachName?.en) && (
                          <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 rounded text-xs">
                            {language === 'ar' ? 'المدرب:' : 'Coach:'} {player.coachName?.[language] || player.coachName?.en}
                          </span>
                        )}
                      </div>
                      {(player.parentName?.[language] || player.parentName?.en) && (
                        <p className="text-xs text-gray-500 mt-1">
                          {language === 'ar' ? 'ولي الأمر:' : 'Parent:'} {player.parentName?.[language] || player.parentName?.en}
                          {player.phone && ` (${player.phone})`}
                        </p>
                      )}
                      {(!player.programId || !player.coachId) && (
                        <button
                          onClick={() => openAssignPanel(player)}
                          className="mt-2 text-xs px-2 py-1 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-500/20 dark:text-amber-300"
                        >
                          {language === 'ar' ? 'تعيين البرنامج والمدرب' : 'Assign Program & Coach'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer with count */}
          <div className="p-4 bg-gray-50 dark:bg-white/5 border-t border-gray-100 dark:border-white/10">
            <p className="text-sm text-gray-500">
              {language === 'ar' 
                ? `إجمالي: ${filteredPlayers.length} لاعب`
                : `Total: ${filteredPlayers.length} player(s)`}
              {searchQuery && ` (${language === 'ar' ? 'من' : 'of'} ${players.length})`}
            </p>
          </div>
        </GlassCard>
      )}
    </div>
  )
}
