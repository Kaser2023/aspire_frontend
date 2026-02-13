import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { useAuth } from '../../hooks/useAuth'
import { subscriptionFreezesService, branchesService, programsService, playersService } from '../../services'
import GlassCard from '../../components/ui/GlassCard'
import Button from '../../components/ui/Button'

export default function SubscriptionFreezes() {
  const { language } = useLanguage()
  const { user } = useAuth()
  const isBranchAdmin = user?.role === 'branch_admin'
  const [loading, setLoading] = useState(true)
  const [freezes, setFreezes] = useState([])
  const [pagination, setPagination] = useState({})
  const [page, setPage] = useState(1)
  const [message, setMessage] = useState({ type: '', text: '' })

  // Filters
  const [filterStatus, setFilterStatus] = useState('')
  const [filterScope, setFilterScope] = useState('')

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [formLoading, setFormLoading] = useState(false)

  // Dropdown data
  const [branches, setBranches] = useState([])
  const [programs, setPrograms] = useState([])
  const [players, setPlayers] = useState([])

  // Form fields
  const [form, setForm] = useState({
    title: '',
    title_ar: '',
    start_date: '',
    end_date: '',
    scope: 'global',
    branch_id: '',
    program_id: '',
    player_id: ''
  })

  // Fetch freezes
  const fetchFreezes = useCallback(async () => {
    try {
      setLoading(true)
      const params = { page, limit: 10 }
      if (filterStatus) params.status = filterStatus
      if (filterScope) {
        params.scope = filterScope === 'program_player' ? 'program' : filterScope
      }
      const res = await subscriptionFreezesService.getAll(params)
      if (res.success) {
        let data = res.data || []
        if (filterScope === 'program_player') {
          data = data.filter(f => !!f.player_id || !!f.player)
        }
        setFreezes(data)
        setPagination(res.pagination || {})
      }
    } catch (err) {
      console.error('Error fetching freezes:', err)
    } finally {
      setLoading(false)
    }
  }, [filterScope, filterStatus, page])

  useEffect(() => { fetchFreezes() }, [fetchFreezes])

  // Load branches & programs for form
  useEffect(() => {
    const loadData = async () => {
      if (isBranchAdmin) {
        setBranches(user?.branch ? [user.branch] : [])
        const [programRes, playersRes] = await Promise.all([
          programsService.getAll({ branch_id: user?.branch_id, limit: 200 }),
          playersService.getAll({ branch_id: user?.branch_id, limit: 500 })
        ])
        if (programRes.success) setPrograms(programRes.data || [])
        if (playersRes.success) setPlayers(playersRes.data || [])
        return
      }
      try {
        const [branchRes, programRes, playersRes] = await Promise.allSettled([
          branchesService.getAll(),
          programsService.getAll(),
          playersService.getAll({ limit: 1000 })
        ])
        if (branchRes.status === 'fulfilled' && branchRes.value?.success) {
          setBranches(branchRes.value.data || [])
        }
        if (programRes.status === 'fulfilled' && programRes.value?.success) {
          setPrograms(programRes.value.data || [])
        }
        if (playersRes.status === 'fulfilled' && playersRes.value?.success) {
          setPlayers(playersRes.value.data || [])
        } else {
          // Keep form usable for super admin even if players endpoint temporarily fails.
          setPlayers([])
        }
      } catch (err) {
        console.error('Error loading form data:', err)
      }
    }
    if (showForm) loadData()
  }, [isBranchAdmin, showForm, user?.branch])

  useEffect(() => {
    if (isBranchAdmin && user?.branch_id) {
      setForm(prev => ({
        ...prev,
        scope: 'branch',
        branch_id: user.branch_id,
        program_id: '',
        player_id: ''
      }))
      setFilterScope('')
    }
  }, [isBranchAdmin, user?.branch_id])

  // Calculate freeze days
  const freezeDays = form.start_date && form.end_date
    ? Math.max(0, Math.ceil((new Date(form.end_date) - new Date(form.start_date)) / (1000 * 60 * 60 * 24)) + 1)
    : 0

  // Filtered programs by branch
  const scopeNeedsProgram = form.scope === 'program' || form.scope === 'program_player'
  const filteredPrograms = scopeNeedsProgram && form.branch_id
    ? programs.filter(p => String(p.branch_id) === String(form.branch_id))
    : programs

  const filteredPlayers = form.program_id
    ? players.filter(p => String(p.program_id) === String(form.program_id))
    : []

  const resetForm = () => {
    setForm({
      title: '',
      title_ar: '',
      start_date: '',
      end_date: '',
      scope: isBranchAdmin ? 'branch' : 'global',
      branch_id: isBranchAdmin ? (user?.branch_id || '') : '',
      program_id: '',
      player_id: ''
    })
    setShowForm(false)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      setFormLoading(true)
      const payload = {
        title: form.title,
        title_ar: form.title_ar || null,
        start_date: form.start_date,
        end_date: form.end_date,
        scope: isBranchAdmin
          ? (form.scope === 'program' || form.scope === 'program_player' ? 'program' : 'branch')
          : form.scope,
        branch_id: isBranchAdmin
          ? user?.branch_id
          : (form.scope === 'branch' ? form.branch_id : ((form.scope === 'program' || form.scope === 'program_player') ? form.branch_id : null)),
        program_id: (isBranchAdmin && (form.scope === 'program' || form.scope === 'program_player'))
          ? form.program_id
          : ((!isBranchAdmin && (form.scope === 'program' || form.scope === 'program_player')) ? form.program_id : null),
        player_id: form.scope === 'program_player' ? form.player_id : null
      }
      const res = await subscriptionFreezesService.create(payload)
      if (res.success) {
        setMessage({ type: 'success', text: res.message || (language === 'ar' ? 'تم إنشاء التجميد بنجاح' : 'Freeze created successfully') })
        resetForm()
        fetchFreezes()
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || (language === 'ar' ? 'فشل في إنشاء التجميد' : 'Failed to create freeze') })
    } finally {
      setFormLoading(false)
    }
  }

  const handleCancel = async (id) => {
    if (!window.confirm(language === 'ar' ? 'هل أنت متأكد من إلغاء هذا التجميد؟ سيتم خصم الأيام من الاشتراكات.' : 'Are you sure you want to cancel this freeze? Days will be subtracted back from subscriptions.')) return
    try {
      const res = await subscriptionFreezesService.update(id, { status: 'cancelled' })
      if (res.success) {
        setMessage({ type: 'success', text: res.message || (language === 'ar' ? 'تم إلغاء التجميد' : 'Freeze cancelled') })
        fetchFreezes()
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || (language === 'ar' ? 'فشل في الإلغاء' : 'Failed to cancel') })
    }
  }

  const statusBadge = (status) => {
    const styles = {
      scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      completed: 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    }
    const labels = {
      scheduled: { en: 'Scheduled', ar: 'مجدول' },
      active: { en: 'Active', ar: 'نشط' },
      completed: { en: 'Completed', ar: 'مكتمل' },
      cancelled: { en: 'Cancelled', ar: 'ملغى' }
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.scheduled}`}>
        {labels[status]?.[language] || status}
      </span>
    )
  }

  const scopeBadge = (freeze) => {
    const labels = {
      global: { en: 'All Branches', ar: 'جميع الفروع' },
      branch: { en: 'Branch', ar: 'فرع' },
      program: { en: 'Program', ar: 'برنامج' }
    }
    const detail = freeze.scope === 'branch' && freeze.branch
      ? `: ${language === 'ar' ? freeze.branch.name_ar : freeze.branch.name}`
      : freeze.scope === 'program' && freeze.program
        ? `: ${language === 'ar' ? freeze.program.name_ar : freeze.program.name}${freeze.player ? ` - ${(language === 'ar' ? `${freeze.player.first_name_ar || freeze.player.first_name} ${freeze.player.last_name_ar || freeze.player.last_name}` : `${freeze.player.first_name} ${freeze.player.last_name}`)}` : ''}`
        : ''
    return (
      <span className="text-xs">
        <span className="font-medium">{labels[freeze.scope]?.[language] || freeze.scope}</span>
        {detail && <span className="text-gray-500 dark:text-gray-400">{detail}</span>}
      </span>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            {language === 'ar' ? 'تجميد الاشتراكات' : 'Subscription Freezes'}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            {language === 'ar' ? 'تجميد الاشتراكات خلال العطل والإجازات' : 'Pause subscriptions during holidays and breaks'}
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-indigo-500 hover:bg-indigo-600">
          {showForm
            ? (language === 'ar' ? 'إلغاء' : 'Cancel')
            : (language === 'ar' ? '+ تجميد جديد' : '+ New Freeze')}
        </Button>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
          {message.text}
          <button onClick={() => setMessage({ type: '', text: '' })} className="float-right font-bold">&times;</button>
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <GlassCard>
          <form onSubmit={handleCreate} className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {language === 'ar' ? 'إنشاء تجميد جديد' : 'Create New Freeze'}
            </h3>

            {/* Title */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'ar' ? 'العنوان (English)' : 'Title (English)'} *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder={language === 'ar' ? 'مثال: إجازة عيد الفطر' : 'e.g. Eid Al-Fitr Holiday'}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-secondary/50 text-gray-900 dark:text-white text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'ar' ? 'العنوان (عربي)' : 'Title (Arabic)'}
                </label>
                <input
                  type="text"
                  value={form.title_ar}
                  onChange={e => setForm({ ...form, title_ar: e.target.value })}
                  placeholder="إجازة عيد الفطر"
                  dir="rtl"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-secondary/50 text-gray-900 dark:text-white text-sm"
                />
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'ar' ? 'تاريخ البداية' : 'Start Date'} *
                </label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={e => setForm({ ...form, start_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-secondary/50 text-gray-900 dark:text-white text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'ar' ? 'تاريخ النهاية' : 'End Date'} *
                </label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={e => setForm({ ...form, end_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-secondary/50 text-gray-900 dark:text-white text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'ar' ? 'عدد الأيام' : 'Freeze Days'}
                </label>
                <div className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-secondary/30 text-gray-900 dark:text-white text-sm font-semibold">
                  {freezeDays > 0 ? (
                    <span className="text-primary">{freezeDays} {language === 'ar' ? 'يوم' : 'days'}</span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </div>
              </div>
            </div>

            {/* Scope */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {language === 'ar' ? 'النطاق' : 'Scope'} *
              </label>
              <div className="flex flex-wrap gap-3">
                {[
                  ...(isBranchAdmin
                    ? [
                        { value: 'branch', label: { en: 'All', ar: 'الكل' }, icon: '🌐' },
                        { value: 'program', label: { en: 'By Program', ar: 'حسب البرنامج' }, icon: '📋' },
                        { value: 'program_player', label: { en: 'By Program + Player', ar: 'حسب البرنامج + لاعب' }, icon: '👤' }
                      ]
                    : [
                        { value: 'global', label: { en: 'All Branches', ar: 'جميع الفروع' }, icon: '🌐' },
                        { value: 'branch', label: { en: 'Specific Branch', ar: 'فرع محدد' }, icon: '🏢' },
                        { value: 'program', label: { en: 'Specific Program', ar: 'برنامج محدد' }, icon: '📋' }
                      ])
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm({ ...form, scope: opt.value, branch_id: isBranchAdmin ? (user?.branch_id || '') : '', program_id: '', player_id: '' })}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                      form.scope === opt.value
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300'
                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-indigo-400'
                    }`}
                  >
                    <span>{opt.icon}</span>
                    {opt.label[language]}
                  </button>
                ))}
              </div>
            </div>

            {/* Branch selector (for branch & program scope) */}
            {(form.scope === 'branch' || form.scope === 'program' || form.scope === 'program_player') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === 'ar' ? 'الفرع' : 'Branch'} *
                  </label>
                  <select
                    value={isBranchAdmin ? (user?.branch_id || '') : form.branch_id}
                    onChange={e => setForm({ ...form, branch_id: e.target.value, program_id: '', player_id: '' })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-secondary/50 text-gray-900 dark:text-white text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    required
                    disabled={isBranchAdmin}
                  >
                    <option value="">{language === 'ar' ? 'اختر فرع' : 'Select branch'}</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{language === 'ar' ? b.name_ar : b.name}</option>
                    ))}
                  </select>
                </div>

                {/* Program selector (for program scope only) */}
                {(form.scope === 'program' || form.scope === 'program_player') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === 'ar' ? 'البرنامج' : 'Program'} *
                    </label>
                    <select
                      value={form.program_id}
                      onChange={e => setForm({ ...form, program_id: e.target.value, player_id: '' })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-secondary/50 text-gray-900 dark:text-white text-sm"
                      required
                    >
                      <option value="">{language === 'ar' ? 'اختر برنامج' : 'Select program'}</option>
                      {filteredPrograms.map(p => (
                        <option key={p.id} value={p.id}>{language === 'ar' ? p.name_ar : p.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {form.scope === 'program_player' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'ar' ? 'اللاعب المحدد' : 'Specific Player'} *
                </label>
                <select
                  value={form.player_id}
                  onChange={e => setForm({ ...form, player_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-secondary/50 text-gray-900 dark:text-white text-sm"
                  required
                  disabled={!form.program_id}
                >
                  <option value="">{language === 'ar' ? 'اختر لاعب' : 'Select player'}</option>
                  {filteredPlayers.map(p => (
                    <option key={p.id} value={p.id}>
                      {language === 'ar'
                        ? `${p.first_name_ar || p.first_name || ''} ${p.last_name_ar || p.last_name || ''}`.trim()
                        : `${p.first_name || ''} ${p.last_name || ''}`.trim()}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Preview info */}
            {freezeDays > 0 && (
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <span className="font-semibold">
                    {language === 'ar' ? 'معاينة:' : 'Preview:'}
                  </span>{' '}
                  {language === 'ar'
                    ? `سيتم تمديد جميع الاشتراكات المتأثرة بـ ${freezeDays} يوم تلقائياً. سيتم إشعار أولياء الأمور.`
                    : `All affected subscriptions will be automatically extended by ${freezeDays} days. Parents will be notified.`}
                </p>
              </div>
            )}

            {/* Submit */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button type="submit" disabled={formLoading || freezeDays === 0} className="bg-indigo-500 hover:bg-indigo-600">
                {formLoading
                  ? (language === 'ar' ? 'جاري الإنشاء...' : 'Creating...')
                  : (language === 'ar' ? 'إنشاء التجميد' : 'Create Freeze')}
              </Button>
              <Button type="button" onClick={resetForm} variant="secondary">
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
            </div>
          </form>
        </GlassCard>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-secondary/50 text-gray-900 dark:text-white text-sm"
        >
          <option value="">{language === 'ar' ? 'كل الحالات' : 'All Status'}</option>
          <option value="scheduled">{language === 'ar' ? 'مجدول' : 'Scheduled'}</option>
          <option value="active">{language === 'ar' ? 'نشط' : 'Active'}</option>
          <option value="completed">{language === 'ar' ? 'مكتمل' : 'Completed'}</option>
          <option value="cancelled">{language === 'ar' ? 'ملغى' : 'Cancelled'}</option>
        </select>
        <select
          value={filterScope}
          onChange={e => { setFilterScope(e.target.value); setPage(1) }}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-secondary/50 text-gray-900 dark:text-white text-sm"
        >
          <option value="">{language === 'ar' ? 'كل النطاقات' : 'All Scopes'}</option>
          {isBranchAdmin ? (
            <>
              <option value="branch">{language === 'ar' ? 'الكل' : 'All'}</option>
              <option value="program">{language === 'ar' ? 'حسب البرنامج' : 'By Program'}</option>
              <option value="program_player">{language === 'ar' ? 'حسب البرنامج + لاعب' : 'By Program + Player'}</option>
            </>
          ) : (
            <>
              <option value="global">{language === 'ar' ? 'عام' : 'Global'}</option>
              <option value="branch">{language === 'ar' ? 'فرع' : 'Branch'}</option>
              <option value="program">{language === 'ar' ? 'برنامج' : 'Program'}</option>
            </>
          )}
        </select>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      ) : freezes.length === 0 ? (
        <GlassCard>
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-2 text-gray-500 dark:text-gray-400 text-sm">
              {language === 'ar' ? 'لا توجد تجميدات بعد' : 'No freezes yet'}
            </p>
          </div>
        </GlassCard>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block">
            <GlassCard className="overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-white/10">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{language === 'ar' ? 'العنوان' : 'Title'}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{language === 'ar' ? 'النطاق' : 'Scope'}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{language === 'ar' ? 'الفترة' : 'Period'}</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{language === 'ar' ? 'الأيام' : 'Days'}</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{language === 'ar' ? 'المتأثرون' : 'Affected'}</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{language === 'ar' ? 'إجراء' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {freezes.map(freeze => (
                    <tr key={freeze.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {language === 'ar' ? (freeze.title_ar || freeze.title) : freeze.title}
                        </div>
                        {freeze.creator && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {language === 'ar' ? 'بواسطة' : 'by'} {freeze.creator.first_name} {freeze.creator.last_name}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">{scopeBadge(freeze)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {freeze.start_date} → {freeze.end_date}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-bold text-primary">{freeze.freeze_days}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{freeze.subscriptions_affected}</span>
                      </td>
                      <td className="px-4 py-3 text-center">{statusBadge(freeze.status)}</td>
                      <td className="px-4 py-3 text-center">
                        {(freeze.status === 'scheduled' || freeze.status === 'active') && (
                          <button
                            onClick={() => handleCancel(freeze.id)}
                            className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
                          >
                            {language === 'ar' ? 'إلغاء' : 'Cancel'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </GlassCard>
          </div>

          {/* Tablet Cards */}
          <div className="hidden md:block lg:hidden space-y-3">
            {freezes.map(freeze => (
              <GlassCard key={freeze.id}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {language === 'ar' ? (freeze.title_ar || freeze.title) : freeze.title}
                    </h3>
                    {statusBadge(freeze.status)}
                  </div>
                  {(freeze.status === 'scheduled' || freeze.status === 'active') && (
                    <button
                      onClick={() => handleCancel(freeze.id)}
                      className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 font-medium px-3 py-1 border border-red-200 dark:border-red-800 rounded-lg"
                    >
                      {language === 'ar' ? 'إلغاء' : 'Cancel'}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block">{language === 'ar' ? 'النطاق' : 'Scope'}</span>
                    <span className="text-gray-900 dark:text-white font-medium">{scopeBadge(freeze)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block">{language === 'ar' ? 'الفترة' : 'Period'}</span>
                    <span className="text-gray-900 dark:text-white">{freeze.start_date} → {freeze.end_date}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block">{language === 'ar' ? 'الأيام' : 'Days'}</span>
                    <span className="text-primary font-bold">{freeze.freeze_days}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block">{language === 'ar' ? 'المتأثرون' : 'Affected'}</span>
                    <span className="text-gray-900 dark:text-white font-medium">{freeze.subscriptions_affected}</span>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {freezes.map(freeze => (
              <GlassCard key={freeze.id}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {language === 'ar' ? (freeze.title_ar || freeze.title) : freeze.title}
                    </h3>
                    <div className="mt-1">{scopeBadge(freeze)}</div>
                  </div>
                  {statusBadge(freeze.status)}
                </div>

                <div className="flex items-center justify-center my-3 py-2 bg-primary/5 dark:bg-primary/10 rounded-lg">
                  <span className="text-2xl font-bold text-primary">{freeze.freeze_days}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">{language === 'ar' ? 'يوم' : 'days'}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">{language === 'ar' ? 'من' : 'From'}</span>
                    <span className="text-gray-900 dark:text-white block">{freeze.start_date}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">{language === 'ar' ? 'إلى' : 'To'}</span>
                    <span className="text-gray-900 dark:text-white block">{freeze.end_date}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">{language === 'ar' ? 'المتأثرون' : 'Affected'}</span>
                    <span className="text-gray-900 dark:text-white block font-medium">{freeze.subscriptions_affected} {language === 'ar' ? 'اشتراك' : 'subs'}</span>
                  </div>
                  {freeze.creator && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">{language === 'ar' ? 'بواسطة' : 'By'}</span>
                      <span className="text-gray-900 dark:text-white block">{freeze.creator.first_name}</span>
                    </div>
                  )}
                </div>

                {(freeze.status === 'scheduled' || freeze.status === 'active') && (
                  <button
                    onClick={() => handleCancel(freeze.id)}
                    className="w-full py-2 text-sm text-red-600 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 font-medium flex items-center justify-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {language === 'ar' ? 'إلغاء التجميد' : 'Cancel Freeze'}
                  </button>
                )}
              </GlassCard>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50"
              >
                {language === 'ar' ? 'السابق' : 'Previous'}
              </button>
              <span className="px-3 py-1 text-sm text-gray-500 dark:text-gray-400">
                {page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50"
              >
                {language === 'ar' ? 'التالي' : 'Next'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
