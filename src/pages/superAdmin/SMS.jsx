import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { useAuth } from '../../hooks/useAuth'
import { smsService, usersService, playersService } from '../../services'
import GlassCard from '../../components/ui/GlassCard'
import Button from '../../components/ui/Button'
import AudienceSelector from '../../components/common/AudienceSelector'

function ByNameSelector({ language, allUsers, roleCounts, selectedUsers, onUserToggle }) {
  const [expandedGroups, setExpandedGroups] = useState({})
  const [searchQuery, setSearchQuery] = useState('')

  const groups = [
    { id: 'coach', label: { en: 'Coaches', ar: 'المدربون' }, count: roleCounts.coach || 0 },
    { id: 'parent', label: { en: 'Parents', ar: 'أولياء الأمور' }, count: roleCounts.parent || 0 },
    { id: 'player', label: { en: 'Players', ar: 'اللاعبون' }, count: roleCounts.player || 0 },
  ]

  const getFilteredUsers = (role) => {
    const users = allUsers.filter(u => u.role === role)
    if (!searchQuery.trim()) return users
    return users.filter(u =>
      (u.name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.name_ar?.includes(searchQuery)) ||
      (u.email?.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={language === 'ar' ? 'ابحث عن مستخدم...' : 'Search for a user...'}
          className="w-full px-4 py-2.5 pl-10 rtl:pl-4 rtl:pr-10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <svg className="w-5 h-5 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {groups.map(group => {
          const filteredUsers = getFilteredUsers(group.id)
          const isExpanded = expandedGroups[group.id]
          return (
            <div key={group.id} className="border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedGroups(prev => ({ ...prev, [group.id]: !prev[group.id] }))}
                className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10"
              >
                <div className="flex items-center gap-2">
                  <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="font-medium text-gray-800 dark:text-white">{group.label[language]}</span>
                </div>
                <span className="text-sm text-gray-500">{filteredUsers.length} {language === 'ar' ? 'مستخدم' : 'users'}</span>
              </button>
              {isExpanded && (
                <div className="p-2 space-y-1 bg-white dark:bg-transparent">
                  {filteredUsers.map(user => (
                    <label
                      key={`${group.id}-${user.id}`}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${
                        selectedUsers.includes(user.id)
                          ? 'bg-indigo-50 dark:bg-indigo-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-white/5'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => onUserToggle(user.id)}
                        className="w-4 h-4 text-indigo-500 rounded focus:ring-indigo-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 dark:text-white truncate">
                          {language === 'ar' && user.name_ar ? user.name_ar : user.name}
                        </div>
                        {user.email && <div className="text-xs text-gray-500 truncate">{user.email}</div>}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BranchSMSAudienceSelector({ value, onChange, language, roleCounts = {}, allUsers = [] }) {
  const [selectionType, setSelectionType] = useState(value?.type || 'all')
  const [selectedRoles, setSelectedRoles] = useState(value?.roles || [])
  const [selectedUsers, setSelectedUsers] = useState(value?.users || [])

  const roleOptions = [
    { id: 'coach', label: { en: 'Coaches', ar: 'المدربون' } },
    { id: 'parent', label: { en: 'Parents', ar: 'أولياء الأمور' } },
    { id: 'player', label: { en: 'Players', ar: 'اللاعبون' } }
  ]

  useEffect(() => {
    onChange({
      type: selectionType,
      roles: selectionType === 'roles' ? selectedRoles : ['coach', 'parent', 'player'],
      users: selectionType === 'users' ? selectedUsers : []
    })
  }, [onChange, selectedRoles, selectedUsers, selectionType])

  const getTotalUsers = () => (roleCounts.coach || 0) + (roleCounts.parent || 0) + (roleCounts.player || 0)

  return (
    <div className="space-y-4">
      <div className="flex gap-2 p-1 bg-gray-100 dark:bg-white/5 rounded-xl">
        <button
          type="button"
          onClick={() => { setSelectionType('all'); setSelectedRoles([]); setSelectedUsers([]) }}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            selectionType === 'all'
              ? 'bg-white dark:bg-white/10 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          {language === 'ar' ? 'الكل' : 'All'}
        </button>
        <button
          type="button"
          onClick={() => { setSelectionType('roles'); setSelectedUsers([]) }}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            selectionType === 'roles'
              ? 'bg-white dark:bg-white/10 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          {language === 'ar' ? 'حسب الفئة' : 'By Role'}
        </button>
        <button
          type="button"
          onClick={() => { setSelectionType('users'); setSelectedRoles([]) }}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            selectionType === 'users'
              ? 'bg-white dark:bg-white/10 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          {language === 'ar' ? 'بالاسم' : 'By Name'}
        </button>
      </div>

      {selectionType === 'all' && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl text-center">
          <div className="text-green-600 dark:text-green-400 font-medium mb-1">
            {language === 'ar' ? 'سيتم إرسال الرسالة للجميع' : 'SMS will be sent to everyone'}
          </div>
          <div className="text-sm text-green-500 dark:text-green-500">
            {getTotalUsers()} {language === 'ar' ? 'مستخدم' : 'users'}
          </div>
        </div>
      )}

      {selectionType === 'roles' && (
        <div className="space-y-2">
          {roleOptions.map(role => (
            <label
              key={role.id}
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                selectedRoles.includes(role.id)
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700'
                  : 'bg-gray-50 dark:bg-white/5 border border-transparent hover:bg-gray-100 dark:hover:bg-white/10'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedRoles.includes(role.id)}
                onChange={() => setSelectedRoles(prev => prev.includes(role.id) ? prev.filter(r => r !== role.id) : [...prev, role.id])}
                className="w-5 h-5 text-indigo-500 rounded focus:ring-indigo-500"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-800 dark:text-white">{role.label[language]}</div>
                <div className="text-sm text-gray-500">{roleCounts[role.id] || 0} {language === 'ar' ? 'مستخدم' : 'users'}</div>
              </div>
            </label>
          ))}
        </div>
      )}

      {selectionType === 'users' && (
        <ByNameSelector
          language={language}
          allUsers={allUsers}
          roleCounts={roleCounts}
          selectedUsers={selectedUsers}
          onUserToggle={(id) => setSelectedUsers(prev => prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id])}
        />
      )}
    </div>
  )
}

export default function SMS() {
  const { language } = useLanguage()
  const { user } = useAuth()
  const isBranchAdmin = user?.role === 'branch_admin'
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('manual')
  const [isCreating, setIsCreating] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [targetAudience, setTargetAudience] = useState({ type: 'all' })
  const [smsMessage, setSmsMessage] = useState('')
  const [smsSending, setSmsSending] = useState(false)
  const [smsHistory, setSmsHistory] = useState([])
  const [autoSettings, setAutoSettings] = useState([])
  const [roleCounts, setRoleCounts] = useState({ coach: 0, parent: 0, player: 0 })
  const [allUsers, setAllUsers] = useState([])
  
  // Auto SMS state
  const [isCreatingAuto, setIsCreatingAuto] = useState(false)
  const [editingAutoId, setEditingAutoId] = useState(null)
  const [deletingAutoId, setDeletingAutoId] = useState(null)
  const [newAutoSMS, setNewAutoSMS] = useState({
    title: '',
    message: '',
    targetAudience: { type: 'all' },
    scheduleType: 'date_range',
    startDate: '',
    endDate: '',
    sendDays: [],
    sendTime: '09:00',
    enabled: true
  })

  const handleAutoAudienceChange = useCallback((audience) => {
    setNewAutoSMS(prev => ({ ...prev, targetAudience: audience }))
  }, [])

  const fetchSMSData = useCallback(async () => {
    try {
      setLoading(true)
      const calls = [smsService.getAll({ limit: 50 }), smsService.getAutoSettings()]
      if (isBranchAdmin) {
        calls.push(usersService.getByRole('coach', { branch_id: user?.branch_id, limit: 200 }))
        calls.push(usersService.getByRole('parent', { branch_id: user?.branch_id, limit: 500 }))
        calls.push(playersService.getAll({ branch_id: user?.branch_id, limit: 500 }))
      }
      const [historyRes, settingsRes, coachesRes, parentsRes, playersRes] = await Promise.all(calls)
      if (historyRes.success) setSmsHistory(historyRes.data || [])
      if (settingsRes?.success) setAutoSettings(settingsRes.data || [])

      if (isBranchAdmin) {
        const coaches = coachesRes?.success ? (coachesRes.data || []) : []
        const parents = parentsRes?.success ? (parentsRes.data || []) : []
        const players = playersRes?.success ? (playersRes.data || []) : []
        setRoleCounts({
          coach: coaches.length,
          parent: parents.length,
          player: players.length
        })
        setAllUsers([
          ...coaches.map(c => ({
            id: c.id,
            role: 'coach',
            name: `${c.first_name || ''} ${c.last_name || ''}`.trim(),
            name_ar: c.name_ar || `${c.first_name || ''} ${c.last_name || ''}`.trim(),
            email: c.email
          })),
          ...parents.map(p => ({
            id: p.id,
            role: 'parent',
            name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
            name_ar: p.name_ar || `${p.first_name || ''} ${p.last_name || ''}`.trim(),
            email: p.email
          })),
          ...players.map(p => ({
            id: p.id,
            role: 'player',
            name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
            name_ar: `${p.first_name_ar || ''} ${p.last_name_ar || ''}`.trim(),
            email: ''
          }))
        ])
      }
    } catch (err) {
      console.error('Error fetching SMS data:', err)
    } finally {
      setLoading(false)
    }
  }, [isBranchAdmin, user?.branch_id])

  useEffect(() => {
    fetchSMSData()
  }, [fetchSMSData])

  const handleSendSMS = async () => {
    if (!smsMessage) return
    if (isBranchAdmin && targetAudience?.type === 'roles' && (!targetAudience.roles || targetAudience.roles.length === 0)) return
    if (isBranchAdmin && targetAudience?.type === 'users' && (!targetAudience.users || targetAudience.users.length === 0)) return
    setSmsSending(true)
    try {
      const audiencePayload = isBranchAdmin ? targetAudience : targetAudience
      await smsService.send([], smsMessage, audiencePayload)
      setSmsMessage('')
      setTargetAudience({ type: 'all' })
      setIsCreating(false)
      fetchSMSData()
    } catch (err) {
      console.error('Error sending SMS:', err)
    } finally {
      setSmsSending(false)
    }
  }

  // Request delete confirmation
  const handleDeleteSMS = (id) => {
    setDeletingId(id)
  }

  // Confirm delete
  const confirmDeleteSMS = async () => {
    if (!deletingId) return
    try {
      await smsService.delete(deletingId)
      setDeletingId(null)
      fetchSMSData()
    } catch (err) {
      console.error('Error deleting SMS:', err)
    }
  }

  // Cancel delete
  const cancelDelete = () => {
    setDeletingId(null)
  }

  // Cancel create
  const handleCancel = () => {
    setIsCreating(false)
    setSmsMessage('')
    setTargetAudience({ type: 'all' })
  }

  // Auto SMS Handlers
  const resetAutoForm = () => {
    setNewAutoSMS({
      title: '',
      message: '',
      targetAudience: { type: 'all' },
      scheduleType: 'date_range',
      startDate: '',
      endDate: '',
      sendDays: [],
      sendTime: '09:00',
      enabled: true
    })
    setIsCreatingAuto(false)
    setEditingAutoId(null)
  }

  const handleCreateAutoSMS = async () => {
    if (!newAutoSMS.title || !newAutoSMS.message) return
    if (isBranchAdmin && newAutoSMS.targetAudience?.type === 'roles' && (!newAutoSMS.targetAudience.roles || newAutoSMS.targetAudience.roles.length === 0)) return
    if (isBranchAdmin && newAutoSMS.targetAudience?.type === 'users' && (!newAutoSMS.targetAudience.users || newAutoSMS.targetAudience.users.length === 0)) return
    try {
      await smsService.createAutoSetting({
        type: 'custom',
        title: newAutoSMS.title,
        message: newAutoSMS.message,
        target_audience: newAutoSMS.targetAudience,
        schedule_type: newAutoSMS.scheduleType,
        start_date: newAutoSMS.startDate || null,
        end_date: newAutoSMS.endDate || null,
        send_days: newAutoSMS.sendDays,
        send_time: newAutoSMS.sendTime,
        enabled: newAutoSMS.enabled
      })
      resetAutoForm()
      fetchSMSData()
    } catch (err) {
      console.error('Error creating auto SMS:', err)
    }
  }

  const handleEditAutoSMS = (setting) => {
    setEditingAutoId(setting.id)
    setNewAutoSMS({
      title: setting.title || '',
      message: setting.message || '',
      targetAudience: setting.target_audience || { type: 'all' },
      scheduleType: setting.schedule_type || 'date_range',
      startDate: setting.start_date ? setting.start_date.split('T')[0] : '',
      endDate: setting.end_date ? setting.end_date.split('T')[0] : '',
      sendDays: setting.send_days || [],
      sendTime: setting.send_time || '09:00',
      enabled: setting.enabled !== false
    })
    setIsCreatingAuto(true)
  }

  const handleSaveAutoSMS = async () => {
    if (!editingAutoId || !newAutoSMS.title || !newAutoSMS.message) return
    if (isBranchAdmin && newAutoSMS.targetAudience?.type === 'roles' && (!newAutoSMS.targetAudience.roles || newAutoSMS.targetAudience.roles.length === 0)) return
    if (isBranchAdmin && newAutoSMS.targetAudience?.type === 'users' && (!newAutoSMS.targetAudience.users || newAutoSMS.targetAudience.users.length === 0)) return
    try {
      await smsService.updateAutoSetting(editingAutoId, {
        title: newAutoSMS.title,
        message: newAutoSMS.message,
        target_audience: newAutoSMS.targetAudience,
        schedule_type: newAutoSMS.scheduleType,
        start_date: newAutoSMS.startDate || null,
        end_date: newAutoSMS.endDate || null,
        send_days: newAutoSMS.sendDays,
        send_time: newAutoSMS.sendTime,
        enabled: newAutoSMS.enabled
      })
      resetAutoForm()
      fetchSMSData()
    } catch (err) {
      console.error('Error updating auto SMS:', err)
    }
  }

  const handleDeleteAutoSMS = (id) => {
    setDeletingAutoId(id)
  }

  const confirmDeleteAutoSMS = async () => {
    if (!deletingAutoId) return
    try {
      await smsService.deleteAutoSetting(deletingAutoId)
      setDeletingAutoId(null)
      fetchSMSData()
    } catch (err) {
      console.error('Error deleting auto SMS:', err)
    }
  }

  if (loading) {
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
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-secondary dark:text-white">
          {language === 'ar' ? 'إدارة الرسائل النصية' : 'SMS Management'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {language === 'ar' ? 'إرسال رسائل نصية للمستخدمين' : 'Send SMS messages to users'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('manual')}
          className={`px-4 py-2 rounded-xl font-semibold transition-all ${
            activeTab === 'manual'
              ? 'bg-indigo-500 text-white'
              : 'bg-white/50 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'
          }`}
        >
          {language === 'ar' ? 'إرسال يدوي' : 'Manual Send'}
        </button>
        <button
          onClick={() => setActiveTab('automatic')}
          className={`px-4 py-2 rounded-xl font-semibold transition-all ${
            activeTab === 'automatic'
              ? 'bg-indigo-500 text-white'
              : 'bg-white/50 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'
          }`}
        >
          {language === 'ar' ? 'تلقائي' : 'Automatic'}
        </button>
      </div>

      {/* Content */}
      {activeTab === 'manual' && (
        <>
          {/* New SMS Button */}
          {!isCreating && (
            <Button
              onClick={() => setIsCreating(true)}
              className="bg-indigo-500 hover:bg-indigo-600"
            >
              <svg className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {language === 'ar' ? 'رسالة جديدة' : 'New SMS'}
            </Button>
          )}

          {/* SMS Form */}
          {isCreating && (
            <GlassCard className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-secondary dark:text-white">
                  {language === 'ar' ? 'إرسال رسالة نصية' : 'Send SMS'}
                </h3>
                <button
                  onClick={handleCancel}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl text-gray-500"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'ar' ? 'المستلمون' : 'Recipients'}
                  </label>
                  {isBranchAdmin ? (
                    <BranchSMSAudienceSelector
                      value={targetAudience}
                      onChange={setTargetAudience}
                      language={language}
                      roleCounts={roleCounts}
                      allUsers={allUsers}
                    />
                  ) : (
                    <AudienceSelector
                      value={targetAudience}
                      onChange={setTargetAudience}
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'ar' ? 'الرسالة' : 'Message'} *
                  </label>
                  <textarea
                    value={smsMessage}
                    onChange={(e) => setSmsMessage(e.target.value)}
                    rows={4}
                    maxLength={160}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder={language === 'ar' ? 'اكتب رسالتك هنا...' : 'Type your message here...'}
                  />
                  <p className="text-xs text-gray-500 mt-1">{smsMessage.length}/160 {language === 'ar' ? 'حرف' : 'characters'}</p>
                </div>
                <div className="flex gap-3">
                  <Button 
                    onClick={handleSendSMS} 
                    disabled={!smsMessage || smsSending} 
                    className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50"
                  >
                    {smsSending ? (
                      <svg className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                    {smsSending ? (language === 'ar' ? 'جاري الإرسال...' : 'Sending...') : (language === 'ar' ? 'إرسال' : 'Send SMS')}
                  </Button>
                  <Button
                    onClick={handleCancel}
                    className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  >
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </Button>
                </div>
              </div>
            </GlassCard>
          )}

          {/* SMS History in Manual Tab */}
          {!isCreating && smsHistory.length > 0 && (
            <div className="space-y-4 mt-6">
              <h3 className="text-lg font-bold text-secondary dark:text-white">
                {language === 'ar' ? 'الرسائل السابقة' : 'Previous Messages'}
              </h3>
              <div className="space-y-3">
                {smsHistory.map((sms) => (
                  <GlassCard key={sms.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-gray-800 dark:text-white">{sms.message}</p>
                        <div className="flex flex-wrap items-center gap-4 mt-2">
                          <p className="text-sm text-gray-500">
                            {new Date(sms.created_at || sms.createdAt).toLocaleDateString()}
                          </p>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            sms.status === 'sent' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            sms.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          }`}>
                            {sms.status === 'sent' ? (language === 'ar' ? 'تم الإرسال' : 'Sent') :
                             sms.status === 'failed' ? (language === 'ar' ? 'فشل' : 'Failed') :
                             (language === 'ar' ? 'قيد الانتظار' : 'Pending')}
                          </span>
                          <span className="text-xs text-gray-500">
                            {sms.total_recipients} {language === 'ar' ? 'مستلم' : 'recipients'}
                          </span>
                          {/* Audience */}
                          <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                            {(() => {
                              const audience = sms.target_audience || sms.recipient_type;
                              if (!audience || audience === 'all' || audience?.type === 'all') {
                                return language === 'ar' ? 'الجميع' : 'All Users';
                              }
                              if (audience?.type === 'roles' && audience?.roles) {
                                const roleLabels = {
                                  super_admin: language === 'ar' ? 'المشرفون' : 'Super Admins',
                                  owner: language === 'ar' ? 'الملاك' : 'Owners',
                                  branch_admin: language === 'ar' ? 'مديرو الفروع' : 'Branch Admins',
                                  coach: language === 'ar' ? 'المدربون' : 'Coaches',
                                  parent: language === 'ar' ? 'أولياء الأمور' : 'Parents',
                                  player: language === 'ar' ? 'اللاعبون' : 'Players'
                                };
                                return audience.roles.map(r => roleLabels[r] || r).join(', ');
                              }
                              return language === 'ar' ? 'الجميع' : 'All Users';
                            })()}
                          </span>
                        </div>
                      </div>
                      {/* Action Buttons */}
                      {deletingId === sms.id ? (
                        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">
                          <span className="text-sm text-red-600 dark:text-red-400">
                            {language === 'ar' ? 'تأكيد الحذف؟' : 'Delete?'}
                          </span>
                          <button onClick={confirmDeleteSMS} className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg">
                            {language === 'ar' ? 'نعم' : 'Yes'}
                          </button>
                          <button onClick={cancelDelete} className="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg">
                            {language === 'ar' ? 'لا' : 'No'}
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => handleDeleteSMS(sms.id)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl text-red-500">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </GlassCard>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isCreating && smsHistory.length === 0 && (
            <GlassCard className="p-8 text-center mt-6">
              <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <p className="text-gray-500 mb-2">{language === 'ar' ? 'لا توجد رسائل مرسلة بعد' : 'No SMS sent yet'}</p>
              <p className="text-sm text-gray-400">{language === 'ar' ? 'انقر على "رسالة جديدة" لإرسال أول رسالة' : 'Click "New SMS" to send your first message'}</p>
            </GlassCard>
          )}
        </>
      )}

      {activeTab === 'automatic' && (
        <>
          {/* New Auto SMS Button */}
          {!isCreatingAuto && (
            <Button
              onClick={() => setIsCreatingAuto(true)}
              className={isBranchAdmin ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-gradient-to-r from-purple-500 to-pink-500'}
            >
              <svg className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {language === 'ar' ? 'رسالة تلقائية جديدة' : 'New Auto SMS'}
            </Button>
          )}

          {/* Auto SMS Form */}
          {isCreatingAuto && (
            <GlassCard className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-secondary dark:text-white">
                  {editingAutoId 
                    ? (language === 'ar' ? 'تعديل الرسالة التلقائية' : 'Edit Auto SMS')
                    : (language === 'ar' ? 'إنشاء رسالة تلقائية' : 'Create Auto SMS')}
                </h3>
                <button onClick={resetAutoForm} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl text-gray-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'ar' ? 'العنوان' : 'Title'} *
                  </label>
                  <input
                    type="text"
                    value={newAutoSMS.title}
                    onChange={(e) => setNewAutoSMS({ ...newAutoSMS, title: e.target.value })}
                    className={`w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 ${isBranchAdmin ? 'focus:ring-indigo-500' : 'focus:ring-purple-500'}`}
                    placeholder={language === 'ar' ? 'عنوان الرسالة التلقائية...' : 'Auto SMS title...'}
                  />
                </div>

                {/* Audience */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'ar' ? 'الجمهور المستهدف' : 'Target Audience'}
                  </label>
                  {isBranchAdmin ? (
                    <BranchSMSAudienceSelector
                      value={newAutoSMS.targetAudience}
                      onChange={handleAutoAudienceChange}
                      language={language}
                      roleCounts={roleCounts}
                      allUsers={allUsers}
                    />
                  ) : (
                    <AudienceSelector
                      value={newAutoSMS.targetAudience}
                      onChange={handleAutoAudienceChange}
                    />
                  )}
                </div>

                {/* Schedule Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    {language === 'ar' ? 'نوع الجدولة' : 'Schedule Type'}
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="smsScheduleType"
                        checked={newAutoSMS.scheduleType === 'date_range'}
                        onChange={() => setNewAutoSMS({ ...newAutoSMS, scheduleType: 'date_range', sendDays: [] })}
                        className={`w-4 h-4 border-gray-300 ${isBranchAdmin ? 'text-indigo-500 focus:ring-indigo-500' : 'text-purple-500 focus:ring-purple-500'}`} 
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {language === 'ar' ? 'نطاق تاريخ (يومياً)' : 'Date Range (Daily)'}
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="smsScheduleType"
                        checked={newAutoSMS.scheduleType === 'specific_days'}
                        onChange={() => setNewAutoSMS({ ...newAutoSMS, scheduleType: 'specific_days', startDate: '', endDate: '' })}
                        className={`w-4 h-4 border-gray-300 ${isBranchAdmin ? 'text-indigo-500 focus:ring-indigo-500' : 'text-purple-500 focus:ring-purple-500'}`} 
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {language === 'ar' ? 'أيام محددة (أسبوعياً)' : 'Specific Days (Weekly)'}
                      </span>
                    </label>
                  </div>
                </div>

                {/* Date Range Options */}
                {newAutoSMS.scheduleType === 'date_range' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {language === 'ar' ? 'تاريخ البدء' : 'Start Date'}
                      </label>
                      <input
                        type="date"
                        value={newAutoSMS.startDate}
                        onChange={(e) => setNewAutoSMS({ ...newAutoSMS, startDate: e.target.value })}
                        className={`w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 ${isBranchAdmin ? 'focus:ring-indigo-500' : 'focus:ring-purple-500'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {language === 'ar' ? 'تاريخ الانتهاء' : 'End Date'}
                      </label>
                      <input
                        type="date"
                        value={newAutoSMS.endDate}
                        onChange={(e) => setNewAutoSMS({ ...newAutoSMS, endDate: e.target.value })}
                        className={`w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 ${isBranchAdmin ? 'focus:ring-indigo-500' : 'focus:ring-purple-500'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {language === 'ar' ? 'توقيت الإرسال' : 'Send Time'}
                      </label>
                      <input
                        type="time"
                        value={newAutoSMS.sendTime}
                        onChange={(e) => setNewAutoSMS({ ...newAutoSMS, sendTime: e.target.value })}
                        className={`w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 ${isBranchAdmin ? 'focus:ring-indigo-500' : 'focus:ring-purple-500'}`}
                      />
                    </div>
                  </div>
                )}

                {/* Specific Days Options */}
                {newAutoSMS.scheduleType === 'specific_days' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {language === 'ar' ? 'أيام الإرسال' : 'Send Days'}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, index) => (
                          <label key={day} className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={newAutoSMS.sendDays?.includes(day) || false}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewAutoSMS({ ...newAutoSMS, sendDays: [...(newAutoSMS.sendDays || []), day] })
                                } else {
                                  setNewAutoSMS({ ...newAutoSMS, sendDays: (newAutoSMS.sendDays || []).filter(d => d !== day) })
                                }
                              }}
                              className={`w-4 h-4 border-gray-300 rounded ${isBranchAdmin ? 'text-indigo-500 focus:ring-indigo-500' : 'text-purple-500 focus:ring-purple-500'}`} 
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {language === 'ar' ? ['الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'][index] : day}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {language === 'ar' ? 'توقيت الإرسال' : 'Send Time'}
                      </label>
                      <input
                        type="time"
                        value={newAutoSMS.sendTime}
                        onChange={(e) => setNewAutoSMS({ ...newAutoSMS, sendTime: e.target.value })}
                        className={`w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 ${isBranchAdmin ? 'focus:ring-indigo-500' : 'focus:ring-purple-500'}`}
                      />
                    </div>
                  </div>
                )}

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'ar' ? 'الرسالة' : 'Message'} *
                  </label>
                  <textarea
                    rows={4}
                    value={newAutoSMS.message}
                    onChange={(e) => setNewAutoSMS({ ...newAutoSMS, message: e.target.value })}
                    maxLength={160}
                    className={`w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 ${isBranchAdmin ? 'focus:ring-indigo-500' : 'focus:ring-purple-500'}`}
                    placeholder={language === 'ar' ? 'اكتب رسالتك هنا...' : 'Write your message here...'}
                  />
                  <p className="text-xs text-gray-500 mt-1">{newAutoSMS.message.length}/160 {language === 'ar' ? 'حرف' : 'characters'}</p>
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  <Button 
                    onClick={editingAutoId ? handleSaveAutoSMS : handleCreateAutoSMS} 
                    disabled={!newAutoSMS.title || !newAutoSMS.message}
                    className={isBranchAdmin ? 'bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50' : 'bg-gradient-to-r from-purple-500 to-pink-500 disabled:opacity-50'}
                  >
                    <svg className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={editingAutoId ? "M5 13l4 4L19 7" : "M12 6v6m0 0v6m0-6h6m-6 0H6"} />
                    </svg>
                    {editingAutoId 
                      ? (language === 'ar' ? 'حفظ التعديلات' : 'Save Changes')
                      : (language === 'ar' ? 'إنشاء' : 'Create')}
                  </Button>
                  <Button onClick={resetAutoForm} className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </Button>
                </div>
              </div>
            </GlassCard>
          )}

          {/* Auto SMS List */}
          {!isCreatingAuto && autoSettings.length > 0 && (
            <div className="space-y-4 mt-6">
              <h3 className="text-lg font-bold text-secondary dark:text-white">
                {language === 'ar' ? 'الرسائل التلقائية المجدولة' : 'Scheduled Auto SMS'}
              </h3>
              <div className="space-y-3">
                {autoSettings.map((setting) => (
                  <GlassCard key={setting.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 space-y-2">
                        {/* Title and Status */}
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-secondary dark:text-white">{setting.title}</h4>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            setting.enabled 
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                              : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                          }`}>
                            {setting.enabled 
                              ? (language === 'ar' ? 'نشط' : 'Active') 
                              : (language === 'ar' ? 'معطّل' : 'Inactive')}
                          </span>
                        </div>
                        
                        {/* Audience */}
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          <span className="font-medium">{language === 'ar' ? 'الجمهور:' : 'Audience:'}</span>{' '}
                          {setting.target_audience?.type === 'all' 
                            ? (language === 'ar' ? 'الجميع' : 'All Users')
                            : setting.target_audience?.type === 'roles'
                              ? setting.target_audience?.roles?.map(role => {
                                  const roleLabels = {
                                    super_admin: language === 'ar' ? 'المشرفون' : 'Super Admins',
                                    owner: language === 'ar' ? 'الملاك' : 'Owners',
                                    branch_admin: language === 'ar' ? 'مديرو الفروع' : 'Branch Admins',
                                    coach: language === 'ar' ? 'المدربون' : 'Coaches',
                                    parent: language === 'ar' ? 'أولياء الأمور' : 'Parents',
                                    player: language === 'ar' ? 'اللاعبون' : 'Players'
                                  };
                                  return roleLabels[role] || role;
                                }).join(', ') || (language === 'ar' ? 'أدوار محددة' : 'Specific Roles')
                              : (language === 'ar' ? 'الجميع' : 'All Users')}
                        </p>
                        
                        {/* Schedule Type */}
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          <span className="font-medium">{language === 'ar' ? 'الجدولة:' : 'Schedule:'}</span>{' '}
                          {setting.schedule_type === 'date_range' 
                            ? (language === 'ar' ? 'نطاق تاريخ' : 'Date Range')
                            : (language === 'ar' ? 'أيام محددة' : 'Specific Days')}
                        </p>
                        
                        {/* Date Range - if date_range */}
                        {setting.schedule_type === 'date_range' && (setting.start_date || setting.end_date) && (
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            <span className="font-medium">{language === 'ar' ? 'الفترة:' : 'Period:'}</span>{' '}
                            {setting.start_date ? new Date(setting.start_date).toLocaleDateString() : '?'} → {setting.end_date ? new Date(setting.end_date).toLocaleDateString() : '?'}
                          </p>
                        )}
                        
                        {/* Days - if specific days */}
                        {setting.schedule_type === 'specific_days' && setting.send_days?.length > 0 && (
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            <span className="font-medium">{language === 'ar' ? 'الأيام:' : 'Days:'}</span>{' '}
                            {setting.send_days.join(', ')}
                          </p>
                        )}
                        
                        {/* Time */}
                        {setting.send_time && (
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            <span className="font-medium">{language === 'ar' ? 'الوقت:' : 'Time:'}</span>{' '}
                            {setting.send_time}
                          </p>
                        )}
                        
                        {/* Message */}
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          <span className="font-medium">{language === 'ar' ? 'الرسالة:' : 'Message:'}</span>
                          <p className="text-gray-500 dark:text-gray-400 mt-1">{setting.message}</p>
                        </div>
                        
                        {/* Creation Date */}
                        <p className="text-xs text-gray-400 mt-2">
                          {language === 'ar' ? 'تم الإنشاء:' : 'Created:'} {new Date(setting.created_at || setting.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      {/* Action Buttons */}
                      {deletingAutoId === setting.id ? (
                        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">
                          <span className="text-sm text-red-600 dark:text-red-400">
                            {language === 'ar' ? 'تأكيد الحذف؟' : 'Delete?'}
                          </span>
                          <button onClick={confirmDeleteAutoSMS} className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg">
                            {language === 'ar' ? 'نعم' : 'Yes'}
                          </button>
                          <button onClick={() => setDeletingAutoId(null)} className="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg">
                            {language === 'ar' ? 'لا' : 'No'}
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button onClick={() => handleEditAutoSMS(setting)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl text-gray-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button onClick={() => handleDeleteAutoSMS(setting.id)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl text-red-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </GlassCard>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isCreatingAuto && autoSettings.length === 0 && (
            <GlassCard className="p-8 text-center mt-6">
              <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-gray-500 mb-2">{language === 'ar' ? 'لا توجد رسائل تلقائية بعد' : 'No auto SMS yet'}</p>
              <p className="text-sm text-gray-400">{language === 'ar' ? 'انقر على "رسالة تلقائية جديدة" لإنشاء أول رسالة' : 'Click "New Auto SMS" to create your first scheduled message'}</p>
            </GlassCard>
          )}
        </>
      )}
    </div>
  )
}
