import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { subscriptionsService, smsService } from '../../services'
import accountantAutoAnnouncementsService from '../../services/accountantAutoAnnouncements.service'
import GlassCard from '../../components/ui/GlassCard'
import Button from '../../components/ui/Button'
import ParentAudienceSelector from '../../components/common/ParentAudienceSelector'
import ChangeHistoryModal from '../../components/common/ChangeHistoryModal'
import NumericInput from '../../components/ui/NumericInput'

export default function Subscriptions() {
  const { language } = useLanguage()
  const [activeTab, setActiveTab] = useState('list') // 'list' | 'auto' | 'announcement'
  const [loading, setLoading] = useState(true)
  const [subscriptions, setSubscriptions] = useState([])
  const [expiringSummary, setExpiringSummary] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterUrgency, setFilterUrgency] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [sendingReminder, setSendingReminder] = useState(false)
  const [reminderType, setReminderType] = useState('notification')
  const [toastMessage, setToastMessage] = useState(null)
  
  // Auto reminders state
  const [autoSettings, setAutoSettings] = useState([])
  const [loadingAuto, setLoadingAuto] = useState(false)
  const [isCreatingAuto, setIsCreatingAuto] = useState(false)
  const [editingAuto, setEditingAuto] = useState(null)
  const [newAutoSetting, setNewAutoSetting] = useState({
    title: '',
    type: 'subscription_expiring',
    enabled: true,
    trigger_mode: 'days', // 'days' or 'specific_date'
    days_before: 7,
    days_after: 3,
    specific_date: '',
    message: '',
    send_time: '09:00',
    targetAudience: { type: 'all' }
  })

  // Auto announcement (notification) state
  const [autoAnnouncementSettings, setAutoAnnouncementSettings] = useState([])
  const [loadingAutoAnnouncements, setLoadingAutoAnnouncements] = useState(false)
  const [isCreatingAutoAnnouncement, setIsCreatingAutoAnnouncement] = useState(false)
  const [editingAutoAnnouncement, setEditingAutoAnnouncement] = useState(null)
  const [historyTarget, setHistoryTarget] = useState(null)
  const [newAutoAnnouncementSetting, setNewAutoAnnouncementSetting] = useState({
    title: '',
    type: 'subscription_expiring',
    enabled: true,
    trigger_mode: 'days',
    days_before: 7,
    days_after: 3,
    specific_date: '',
    message: '',
    send_time: '09:00',
    targetAudience: { type: 'all' }
  })

  const statusFilters = [
    { id: 'all', label: { en: 'All', ar: 'الكل' } },
    { id: 'active', label: { en: 'Active', ar: 'نشط' }, color: 'text-emerald-500' },
    { id: 'pending', label: { en: 'Pending', ar: 'معلق' }, color: 'text-yellow-500' },
    { id: 'expired', label: { en: 'Expired', ar: 'منتهي' }, color: 'text-red-500' },
    { id: 'cancelled', label: { en: 'Cancelled', ar: 'ملغي' }, color: 'text-gray-500' },
  ]

  const urgencyFilters = [
    { id: 'expired', label: { en: 'Expired', ar: 'منتهي' }, color: 'bg-red-500', days: -1 },
    { id: 'critical', label: { en: 'Critical (≤3 days)', ar: 'حرج (≤3 أيام)' }, color: 'bg-red-400', days: 3 },
    { id: 'urgent', label: { en: 'Urgent (4-7 days)', ar: 'عاجل (4-7 أيام)' }, color: 'bg-orange-500', days: 7 },
    { id: 'soon', label: { en: 'Soon (8-14 days)', ar: 'قريباً (8-14 يوم)' }, color: 'bg-yellow-500', days: 14 },
    { id: 'upcoming', label: { en: 'Upcoming (15-30 days)', ar: 'قادم (15-30 يوم)' }, color: 'bg-blue-500', days: 30 },
  ]

  const mapAutoAnnouncementAudience = (audience) => {
    if (!audience || audience.type === 'all') {
      return { type: 'roles', roles: ['parent', 'player'] }
    }
    if (audience.type === 'specific') {
      return { type: 'users', users: audience.users || [] }
    }
    if (audience.type === 'branches') {
      const roles = []
      const groups = audience.branches || []
      if (groups.some(group => group.group === 'parents')) {
        roles.push('parent')
      }
      if (groups.some(group => group.group === 'players')) {
        roles.push('player')
      }
      return { type: 'roles', roles: roles.length > 0 ? roles : ['parent', 'player'] }
    }
    return { type: 'roles', roles: ['parent', 'player'] }
  }

  const mapAutoAnnouncementAudienceToSelector = (audience) => {
    if (!audience || audience.type === 'all') {
      return { type: 'all' }
    }
    if (audience.type === 'users' && Array.isArray(audience.users)) {
      return { type: 'specific', users: audience.users }
    }
    if (audience.type === 'specific' && audience.branches) {
      const branches = []
      Object.entries(audience.branches || {}).forEach(([branchId, branchData]) => {
        ;(branchData.roles || []).forEach((role) => {
          if (role === 'parent') branches.push({ branchId, group: 'parents' })
          if (role === 'player') branches.push({ branchId, group: 'players' })
        })
      })
      return branches.length > 0 ? { type: 'branches', branches } : { type: 'all' }
    }
    return { type: 'all' }
  }


  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const params = { limit: 100 }
      if (filterStatus !== 'all') {
        params.status = filterStatus
      }
      
      const [subsRes, summaryRes] = await Promise.all([
        subscriptionsService.getAll(params),
        subscriptionsService.getExpirySummary()
      ])
      
      if (subsRes.success) {
        setSubscriptions(subsRes.data || [])
      }
      if (summaryRes.success) {
        setExpiringSummary(summaryRes.data)
      }
    } catch (err) {
      console.error('Error fetching subscriptions:', err)
      setError(language === 'ar' ? 'فشل في تحميل الاشتراكات' : 'Failed to load subscriptions')
    } finally {
      setLoading(false)
    }
  }, [filterStatus, language])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toastMessage])

  // Fetch auto reminder settings
  const fetchAutoSettings = useCallback(async () => {
    try {
      setLoadingAuto(true)
      const response = await smsService.getAutoSettings()
      if (response.success) {
        // Filter only subscription-related types (not custom ones from super admin)
        const filtered = (response.data || []).filter(s =>
          ['subscription_expiring', 'payment_overdue'].includes(s.type)
        )
        setAutoSettings(filtered)
      }
    } catch (err) {
      console.error('Error fetching auto settings:', err)
    } finally {
      setLoadingAuto(false)
    }
  }, [])

  const fetchAutoAnnouncements = useCallback(async () => {
    try {
      setLoadingAutoAnnouncements(true)
      const response = await accountantAutoAnnouncementsService.getAll({ limit: 50 })
      if (response?.success) {
        setAutoAnnouncementSettings(response.data || [])
      }
    } catch (err) {
      console.error('Error fetching auto announcements:', err)
    } finally {
      setLoadingAutoAnnouncements(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'auto') {
      fetchAutoSettings()
    }
    if (activeTab === 'announcement') {
      fetchAutoAnnouncements()
    }
  }, [activeTab, fetchAutoSettings, fetchAutoAnnouncements])

  // Create auto reminder setting
  const handleCreateAutoSetting = async () => {
    try {
      setLoadingAuto(true)
      const payload = {
        title: newAutoSetting.title,
        type: newAutoSetting.type,
        enabled: newAutoSetting.enabled,
        trigger_mode: newAutoSetting.trigger_mode,
        days_before: newAutoSetting.days_before,
        days_after: newAutoSetting.days_after,
        specific_date: newAutoSetting.specific_date,
        message: newAutoSetting.message,
        send_time: newAutoSetting.send_time,
        target_audience: newAutoSetting.targetAudience
      }
      const response = await smsService.createAutoSetting(payload)
      if (response.success) {
        setToastMessage({ type: 'success', message: language === 'ar' ? 'تم إنشاء التذكير التلقائي' : 'Auto reminder created' })
        setIsCreatingAuto(false)
        setNewAutoSetting({
          title: '',
          type: 'subscription_expiring',
          enabled: true,
          trigger_mode: 'days',
          days_before: 7,
          days_after: 3,
          specific_date: '',
          message: '',
          send_time: '09:00',
          targetAudience: { type: 'all' }
        })
        fetchAutoSettings()
      }
    } catch (err) {
      console.error('Error creating auto setting:', err)
      setToastMessage({ type: 'error', message: language === 'ar' ? 'فشل إنشاء التذكير' : 'Failed to create reminder' })
    } finally {
      setLoadingAuto(false)
    }
  }

  // Update auto reminder setting
  const handleUpdateAutoSetting = async () => {
    try {
      setLoadingAuto(true)
      const payload = {
        title: newAutoSetting.title,
        type: newAutoSetting.type,
        enabled: newAutoSetting.enabled,
        trigger_mode: newAutoSetting.trigger_mode,
        days_before: newAutoSetting.days_before,
        days_after: newAutoSetting.days_after,
        specific_date: newAutoSetting.specific_date,
        message: newAutoSetting.message,
        send_time: newAutoSetting.send_time,
        target_audience: newAutoSetting.targetAudience
      }
      const response = await smsService.updateAutoSetting(editingAuto, payload)
      if (response) {
        setToastMessage({ type: 'success', message: language === 'ar' ? 'تم تحديث التذكير' : 'Reminder updated' })
        setEditingAuto(null)
        setIsCreatingAuto(false)
        setNewAutoSetting({
          title: '',
          type: 'subscription_expiring',
          enabled: true,
          trigger_mode: 'days',
          days_before: 7,
          days_after: 3,
          specific_date: '',
          message: '',
          send_time: '09:00',
          targetAudience: { type: 'all' }
        })
        fetchAutoSettings()
      }
    } catch (err) {
      console.error('Error updating auto setting:', err)
      setToastMessage({ type: 'error', message: language === 'ar' ? 'فشل تحديث التذكير' : 'Failed to update reminder' })
    } finally {
      setLoadingAuto(false)
    }
  }

  const defaultAnnouncementForm = {
    title: '',
    type: 'subscription_expiring',
    enabled: true,
    trigger_mode: 'days',
    days_before: 7,
    days_after: 3,
    specific_date: '',
    message: '',
    send_time: '09:00',
    targetAudience: { type: 'all' }
  }

  const handleCreateAutoAnnouncementSetting = async () => {
    try {
      setLoadingAutoAnnouncements(true)
      const payload = {
        title: newAutoAnnouncementSetting.title,
        type: newAutoAnnouncementSetting.type,
        enabled: newAutoAnnouncementSetting.enabled,
        trigger_mode: newAutoAnnouncementSetting.trigger_mode,
        days_before: newAutoAnnouncementSetting.days_before,
        days_after: newAutoAnnouncementSetting.days_after,
        specific_date: newAutoAnnouncementSetting.specific_date,
        message: newAutoAnnouncementSetting.message,
        send_time: newAutoAnnouncementSetting.send_time,
        target_audience: newAutoAnnouncementSetting.targetAudience
      }
      const response = await accountantAutoAnnouncementsService.create(payload)
      if (response.success) {
        setToastMessage({ type: 'success', message: language === 'ar' ? 'تم إنشاء الإعلان التلقائي' : 'Auto announcement created' })
        setIsCreatingAutoAnnouncement(false)
        setNewAutoAnnouncementSetting({ ...defaultAnnouncementForm })
        fetchAutoAnnouncements()
      }
    } catch (err) {
      console.error('Error creating auto announcement:', err)
      setToastMessage({ type: 'error', message: language === 'ar' ? 'فشل إنشاء الإعلان' : 'Failed to create announcement' })
    } finally {
      setLoadingAutoAnnouncements(false)
    }
  }

  const handleUpdateAutoAnnouncementSetting = async () => {
    try {
      setLoadingAutoAnnouncements(true)
      const payload = {
        title: newAutoAnnouncementSetting.title,
        type: newAutoAnnouncementSetting.type,
        enabled: newAutoAnnouncementSetting.enabled,
        trigger_mode: newAutoAnnouncementSetting.trigger_mode,
        days_before: newAutoAnnouncementSetting.days_before,
        days_after: newAutoAnnouncementSetting.days_after,
        specific_date: newAutoAnnouncementSetting.specific_date,
        message: newAutoAnnouncementSetting.message,
        send_time: newAutoAnnouncementSetting.send_time,
        target_audience: newAutoAnnouncementSetting.targetAudience
      }
      const response = await accountantAutoAnnouncementsService.update(editingAutoAnnouncement, payload)
      if (response) {
        setToastMessage({ type: 'success', message: language === 'ar' ? 'تم تحديث الإعلان' : 'Announcement updated' })
        setEditingAutoAnnouncement(null)
        setIsCreatingAutoAnnouncement(false)
        setNewAutoAnnouncementSetting({ ...defaultAnnouncementForm })
        fetchAutoAnnouncements()
      }
    } catch (err) {
      console.error('Error updating auto announcement:', err)
      setToastMessage({ type: 'error', message: language === 'ar' ? 'فشل تحديث الإعلان' : 'Failed to update announcement' })
    } finally {
      setLoadingAutoAnnouncements(false)
    }
  }

  // Delete auto reminder setting
  const handleDeleteAutoSetting = async (id) => {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا التذكير؟' : 'Are you sure you want to delete this reminder?')) return
    try {
      await smsService.deleteAutoSetting(id)
      setToastMessage({ type: 'success', message: language === 'ar' ? 'تم حذف التذكير' : 'Reminder deleted' })
      fetchAutoSettings()
    } catch (err) {
      console.error('Error deleting auto setting:', err)
      setToastMessage({ type: 'error', message: language === 'ar' ? 'فشل حذف التذكير' : 'Failed to delete reminder' })
    }
  }

  // Toggle auto reminder enabled/disabled
  const handleToggleAutoSetting = async (setting) => {
    try {
      await smsService.updateAutoSetting(setting.id, { ...setting, enabled: !setting.enabled })
      fetchAutoSettings()
    } catch (err) {
      console.error('Error toggling auto setting:', err)
    }
  }

  // Edit auto reminder
  const handleEditAutoSetting = (setting) => {
    setEditingAuto(setting.id)
    setNewAutoSetting({
      title: setting.title || '',
      type: setting.type,
      enabled: setting.enabled,
      trigger_mode: setting.trigger_mode || 'days',
      days_before: setting.days_before || 7,
      days_after: setting.days_after || 3,
      specific_date: setting.specific_date || '',
      message: setting.message || '',
      send_time: setting.send_time || '09:00',
      targetAudience: setting.target_audience || { type: 'all' }
    })
    setIsCreatingAuto(true)
  }

  // Delete auto announcement setting
  const handleDeleteAutoAnnouncementSetting = async (id) => {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا الإعلان؟' : 'Are you sure you want to delete this announcement?')) return
    try {
      await accountantAutoAnnouncementsService.delete(id)
      setToastMessage({ type: 'success', message: language === 'ar' ? 'تم حذف الإعلان' : 'Announcement deleted' })
      fetchAutoAnnouncements()
    } catch (err) {
      console.error('Error deleting auto announcement:', err)
      setToastMessage({ type: 'error', message: language === 'ar' ? 'فشل حذف الإعلان' : 'Failed to delete announcement' })
    }
  }

  // Toggle auto announcement enabled/disabled
  const handleToggleAutoAnnouncementSetting = async (setting) => {
    try {
      await accountantAutoAnnouncementsService.toggle(setting.id)
      fetchAutoAnnouncements()
    } catch (err) {
      console.error('Error toggling auto announcement:', err)
    }
  }

  // Edit auto announcement
  const handleEditAutoAnnouncementSetting = (setting) => {
    setEditingAutoAnnouncement(setting.id)
    setNewAutoAnnouncementSetting({
      title: setting.title || '',
      type: setting.type || 'subscription_expiring',
      enabled: setting.enabled !== false,
      trigger_mode: setting.trigger_mode || 'days',
      days_before: setting.days_before || 7,
      days_after: setting.days_after || 3,
      specific_date: setting.specific_date || '',
      message: setting.message || '',
      send_time: setting.send_time || '09:00',
      targetAudience: setting.target_audience || { type: 'all' }
    })
    setIsCreatingAutoAnnouncement(true)
  }

  const formatCurrency = (amount) => `SAR ${(parseFloat(amount) || 0).toLocaleString()}`

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getLastEditorName = (item) => {
    const editor = item?.last_updated_by
    if (!editor) return language === 'ar' ? 'غير معروف' : 'Unknown'
    const fullName = `${editor.first_name || ''} ${editor.last_name || ''}`.trim()
    return fullName || (language === 'ar' ? 'غير معروف' : 'Unknown')
  }

  const getDaysRemaining = (endDate) => {
    if (!endDate) return null
    const end = new Date(endDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    end.setHours(0, 0, 0, 0)
    return Math.ceil((end - today) / (1000 * 60 * 60 * 24))
  }

  const getUrgencyLevel = (daysRemaining) => {
    if (daysRemaining < 0) return 'expired'
    if (daysRemaining <= 3) return 'critical'
    if (daysRemaining <= 7) return 'urgent'
    if (daysRemaining <= 14) return 'soon'
    if (daysRemaining <= 30) return 'upcoming'
    return 'safe'
  }

  const getUrgencyBadge = (daysRemaining) => {
    const level = getUrgencyLevel(daysRemaining)
    const badges = {
      expired: { bg: 'bg-red-500', text: language === 'ar' ? 'منتهي' : 'Expired' },
      critical: { bg: 'bg-red-400', text: language === 'ar' ? 'حرج' : 'Critical' },
      urgent: { bg: 'bg-orange-500', text: language === 'ar' ? 'عاجل' : 'Urgent' },
      soon: { bg: 'bg-yellow-500', text: language === 'ar' ? 'قريباً' : 'Soon' },
      upcoming: { bg: 'bg-blue-500', text: language === 'ar' ? 'قادم' : 'Upcoming' },
      safe: { bg: 'bg-emerald-500', text: language === 'ar' ? 'آمن' : 'Safe' }
    }
    return badges[level] || badges.safe
  }

  const filteredSubscriptions = subscriptions.filter(sub => {
    // Apply urgency filter
    if (filterUrgency) {
      const days = getDaysRemaining(sub.end_date)
      const level = getUrgencyLevel(days)
      if (level !== filterUrgency) return false
    }
    
    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const playerName = `${sub.player?.first_name || ''} ${sub.player?.last_name || ''}`.toLowerCase()
      const programName = (sub.program?.name || '').toLowerCase()
      return playerName.includes(query) || programName.includes(query)
    }
    return true
  })

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredSubscriptions.map(s => s.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectOne = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const handleSendReminder = async (subscriptionId) => {
    try {
      setSendingReminder(true)
      const res = await subscriptionsService.sendReminder(subscriptionId, reminderType)
      if (res.success) {
        setToastMessage({
          type: 'success',
          message: language === 'ar' ? 'تم إرسال التذكير بنجاح' : 'Reminder sent successfully'
        })
      }
    } catch (err) {
      console.error('Error sending reminder:', err)
      setToastMessage({
        type: 'error',
        message: language === 'ar' ? 'فشل إرسال التذكير' : 'Failed to send reminder'
      })
    } finally {
      setSendingReminder(false)
    }
  }

  const handleSendBulkReminders = async () => {
    if (selectedIds.length === 0) return
    
    try {
      setSendingReminder(true)
      const res = await subscriptionsService.sendBulkReminders(selectedIds, reminderType)
      if (res.success) {
        const data = res.data
        setToastMessage({
          type: 'success',
          message: language === 'ar' 
            ? `تم الإرسال: ${data.notifications_sent} إشعار، ${data.sms_sent} رسالة` 
            : `Sent: ${data.notifications_sent} notifications, ${data.sms_sent} SMS`
        })
        setSelectedIds([])
      }
    } catch (err) {
      console.error('Error sending bulk reminders:', err)
      setToastMessage({
        type: 'error',
        message: language === 'ar' ? 'فشل إرسال التذكيرات' : 'Failed to send reminders'
      })
    } finally {
      setSendingReminder(false)
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
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-lg text-white ${
          toastMessage.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
        }`}>
          {toastMessage.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-secondary dark:text-white">
              {language === 'ar' ? 'الاشتراكات' : 'Subscriptions'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {language === 'ar' ? 'تذكيرات التجديد والتنبيهات' : 'Renewal reminders & alerts'}
            </p>
          </div>
        </div>

        {/* Reminder Type Selector - only show on list tab */}
        {activeTab === 'list' && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {language === 'ar' ? 'نوع التذكير:' : 'Reminder type:'}
            </span>
            <select
              value={reminderType}
              onChange={(e) => setReminderType(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-sm"
            >
              <option value="notification">{language === 'ar' ? 'إشعار فقط' : 'Notification only'}</option>
              <option value="sms">{language === 'ar' ? 'رسالة SMS فقط' : 'SMS only'}</option>
              <option value="both">{language === 'ar' ? 'إشعار + SMS' : 'Both'}</option>
            </select>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-white/10">
        <button
          onClick={() => setActiveTab('list')}
          className={`px-4 py-2 font-medium transition-all ${
            activeTab === 'list'
              ? 'text-teal-600 border-b-2 border-teal-500'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          {language === 'ar' ? 'قائمة الاشتراكات' : 'Subscriptions List'}
        </button>
        <button
          onClick={() => setActiveTab('auto')}
          className={`px-4 py-2 font-medium transition-all ${
            activeTab === 'auto'
              ? 'text-teal-600 border-b-2 border-teal-500'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          {language === 'ar' ? 'التذكيرات التلقائية (SMS)' : 'Auto Reminders (SMS)'}
        </button>
        <button
          onClick={() => setActiveTab('announcement')}
          className={`px-4 py-2 font-medium transition-all ${
            activeTab === 'announcement'
              ? 'text-teal-600 border-b-2 border-teal-500'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          {language === 'ar' ? 'الإعلانات التلقائية' : 'Auto Announcements'}
        </button>
      </div>

      {/* Subscriptions List Tab */}
      {activeTab === 'list' && (
        <>
      {/* Expiring Soon Alerts */}
      {expiringSummary && expiringSummary.total_needing_attention > 0 && (
        <GlassCard className="p-4 border-l-4 border-orange-500 bg-orange-50/50 dark:bg-orange-500/10">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-orange-600 dark:text-orange-400">
                {language === 'ar' ? 'تنبيه: اشتراكات تحتاج انتباه' : 'Alert: Subscriptions Need Attention'}
              </h3>
              <div className="mt-2 flex flex-wrap gap-3 text-sm">
                {expiringSummary.expired > 0 && (
                  <span className="px-2 py-1 bg-red-500 text-white rounded-lg">
                    {expiringSummary.expired} {language === 'ar' ? 'منتهي' : 'Expired'}
                  </span>
                )}
                {expiringSummary.critical > 0 && (
                  <span className="px-2 py-1 bg-red-400 text-white rounded-lg">
                    {expiringSummary.critical} {language === 'ar' ? 'حرج (≤3 أيام)' : 'Critical (≤3 days)'}
                  </span>
                )}
                {expiringSummary.urgent > 0 && (
                  <span className="px-2 py-1 bg-orange-500 text-white rounded-lg">
                    {expiringSummary.urgent} {language === 'ar' ? 'عاجل (4-7 أيام)' : 'Urgent (4-7 days)'}
                  </span>
                )}
                {expiringSummary.soon > 0 && (
                  <span className="px-2 py-1 bg-yellow-500 text-white rounded-lg">
                    {expiringSummary.soon} {language === 'ar' ? 'قريباً (8-14 يوم)' : 'Soon (8-14 days)'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {urgencyFilters.map(filter => (
          <GlassCard 
            key={filter.id}
            className={`p-4 cursor-pointer transition-all hover:scale-105 ${
              filterUrgency === filter.id ? 'ring-2 ring-teal-500' : ''
            }`}
            onClick={() => setFilterUrgency(filterUrgency === filter.id ? null : filter.id)}
          >
            <div className="text-center">
              <div className={`w-8 h-8 ${filter.color} rounded-lg mx-auto mb-2`}></div>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">
                {expiringSummary?.[filter.id] || 0}
              </p>
              <p className="text-xs text-gray-500">{filter.label[language]}</p>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <GlassCard className="p-4 bg-teal-50 dark:bg-teal-500/10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="text-teal-600 dark:text-teal-400 font-medium">
              {selectedIds.length} {language === 'ar' ? 'اشتراك محدد' : 'subscriptions selected'}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedIds([])}
              >
                {language === 'ar' ? 'إلغاء التحديد' : 'Clear Selection'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSendBulkReminders}
                disabled={sendingReminder}
              >
                {sendingReminder ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {language === 'ar' ? 'إرسال تذكيرات' : 'Send Reminders'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            <input
              type="text"
              placeholder={language === 'ar' ? 'بحث عن اللاعب أو البرنامج...' : 'Search player or program...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10"
            />
          </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {statusFilters.map(filter => (
          <button
            key={filter.id}
            onClick={() => setFilterStatus(filter.id)}
              className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
              filterStatus === filter.id
                ? 'bg-teal-500 text-white'
                : 'bg-white/50 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'
            }`}
          >
            {filter.label[language]}
          </button>
        ))}
        </div>
      </div>

      {/* Subscriptions List */}
      {filteredSubscriptions.length === 0 ? (
      <GlassCard className="p-8 text-center">
        <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
          </svg>
        </div>
          <p className="text-gray-500 mb-2">{language === 'ar' ? 'لا توجد اشتراكات' : 'No subscriptions found'}</p>
          <p className="text-sm text-gray-400">{language === 'ar' ? 'جرب تغيير الفلتر أو البحث' : 'Try changing the filter or search'}</p>
        </GlassCard>
      ) : (
        <GlassCard className="overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                <tr>
                  <th className="w-12 px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredSubscriptions.length && filteredSubscriptions.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                  </th>
                  <th className="w-[140px] px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                    {language === 'ar' ? 'اللاعب' : 'Player'}
                  </th>
                  <th className="w-[140px] px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                    {language === 'ar' ? 'ولي الأمر' : 'Parent'}
                  </th>
                  <th className="w-[120px] px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                    {language === 'ar' ? 'البرنامج' : 'Program'}
                  </th>
                  <th className="w-[110px] px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                    {language === 'ar' ? 'تاريخ الانتهاء' : 'End Date'}
                  </th>
                  <th className="w-[90px] px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                    {language === 'ar' ? 'المتبقي' : 'Left'}
                  </th>
                  <th className="w-[80px] px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                    {language === 'ar' ? 'الحالة' : 'Status'}
                  </th>
                  <th className="w-[90px] px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                    {language === 'ar' ? 'المبلغ' : 'Amount'}
                  </th>
                  <th className="w-[60px] px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                    {language === 'ar' ? 'تذكير' : 'Remind'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {filteredSubscriptions.map(sub => {
                  const daysRemaining = getDaysRemaining(sub.end_date)
                  const urgencyBadge = getUrgencyBadge(daysRemaining)
                  const parentName = sub.player?.parent 
                    ? `${sub.player.parent.first_name || ''} ${sub.player.parent.last_name || ''}`.trim() 
                    : '-'
                  
                  return (
                    <tr key={sub.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(sub.id)}
                          onChange={() => handleSelectOne(sub.id)}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="font-medium text-gray-800 dark:text-white text-sm">
                          {sub.player?.first_name} {sub.player?.last_name}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="text-sm text-gray-700 dark:text-gray-300">{parentName}</div>
                        {sub.player?.parent?.phone && (
                          <div className="text-xs text-gray-500 dir-ltr">{sub.player.parent.phone}</div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right text-sm text-gray-600 dark:text-gray-300">
                        {sub.program?.name || '-'}
                      </td>
                      <td className="px-3 py-3 text-right text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {formatDate(sub.end_date)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-block px-2 py-1 rounded-lg text-xs text-white font-medium ${urgencyBadge.bg}`}>
                          {daysRemaining !== null ? (
                            daysRemaining < 0 
                              ? `${Math.abs(daysRemaining)}-`
                              : `${daysRemaining}`
                          ) : '-'} {language === 'ar' ? 'يوم' : 'd'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-block px-2 py-1 rounded-lg text-xs font-medium ${
                          sub.status === 'active' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' :
                          sub.status === 'pending' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400' :
                          sub.status === 'expired' ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' :
                          'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400'
                        }`}>
                          {sub.status === 'active' ? (language === 'ar' ? 'نشط' : 'Active') :
                           sub.status === 'pending' ? (language === 'ar' ? 'معلق' : 'Pending') :
                           sub.status === 'expired' ? (language === 'ar' ? 'منتهي' : 'Expired') :
                           sub.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-gray-800 dark:text-white text-sm whitespace-nowrap">
                        {formatCurrency(sub.total_amount)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => handleSendReminder(sub.id)}
                          disabled={sendingReminder}
                          className="p-2 rounded-lg bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 hover:bg-teal-200 dark:hover:bg-teal-500/30 transition-colors"
                          title={language === 'ar' ? 'إرسال تذكير' : 'Send Reminder'}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile/Tablet Cards */}
          <div className="md:hidden divide-y divide-gray-100 dark:divide-white/5">
            {filteredSubscriptions.map(sub => {
              const daysRemaining = getDaysRemaining(sub.end_date)
              const urgencyBadge = getUrgencyBadge(daysRemaining)
              const parentName = sub.player?.parent 
                ? `${sub.player.parent.first_name || ''} ${sub.player.parent.last_name || ''}`.trim() 
                : '-'
              
              return (
                <div key={sub.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(sub.id)}
                      onChange={() => handleSelectOne(sub.id)}
                      className="w-4 h-4 rounded border-gray-300 mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="font-medium text-gray-800 dark:text-white truncate">
                          {sub.player?.first_name} {sub.player?.last_name}
                        </div>
                        <span className={`flex-shrink-0 px-2 py-1 rounded-lg text-xs text-white ${urgencyBadge.bg}`}>
                          {daysRemaining !== null ? `${daysRemaining} ${language === 'ar' ? 'يوم' : 'd'}` : '-'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <div>
                          <span className="text-gray-400 text-xs">{language === 'ar' ? 'ولي الأمر:' : 'Parent:'}</span>
                          <div className="text-gray-700 dark:text-gray-300">{parentName}</div>
                          {sub.player?.parent?.phone && (
                            <div className="text-xs text-gray-500">{sub.player.parent.phone}</div>
                          )}
                        </div>
                        <div>
                          <span className="text-gray-400 text-xs">{language === 'ar' ? 'البرنامج:' : 'Program:'}</span>
                          <div>{sub.program?.name || '-'}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-sm">
                          <span className="text-gray-400">{language === 'ar' ? 'الانتهاء:' : 'Ends:'}</span> {formatDate(sub.end_date)}
                        </div>
                        <span className="font-medium text-gray-800 dark:text-white">{formatCurrency(sub.total_amount)}</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                          sub.status === 'active' ? 'bg-emerald-100 text-emerald-600' :
                          sub.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                          sub.status === 'expired' ? 'bg-red-100 text-red-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {sub.status === 'active' ? (language === 'ar' ? 'نشط' : 'Active') :
                           sub.status === 'pending' ? (language === 'ar' ? 'معلق' : 'Pending') :
                           sub.status === 'expired' ? (language === 'ar' ? 'منتهي' : 'Expired') :
                           sub.status}
                        </span>
                        <button
                          onClick={() => handleSendReminder(sub.id)}
                          disabled={sendingReminder}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 text-sm"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                          </svg>
                          {language === 'ar' ? 'تذكير' : 'Remind'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </GlassCard>
      )}
        </>
      )}

      {/* Auto Reminders Tab */}
      {activeTab === 'auto' && (
        <div className="space-y-6">
          {/* Create/Edit Auto Reminder Form */}
          {isCreatingAuto ? (
            <GlassCard className="p-6">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
                {editingAuto 
                  ? (language === 'ar' ? 'تعديل التذكير التلقائي' : 'Edit Auto Reminder')
                  : (language === 'ar' ? 'إنشاء تذكير تلقائي جديد' : 'Create New Auto Reminder')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === 'ar' ? 'العنوان' : 'Title'}
                  </label>
                  <input
                    type="text"
                    value={newAutoSetting.title}
                    onChange={(e) => setNewAutoSetting({...newAutoSetting, title: e.target.value})}
                    placeholder={language === 'ar' ? 'تذكير انتهاء الاشتراك' : 'Subscription expiry reminder'}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10"
                  />
                </div>

                {/* Type - Subscription related options */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === 'ar' ? 'نوع التذكير' : 'Reminder Type'}
                  </label>
                  <select
                    value={newAutoSetting.type}
                    onChange={(e) => setNewAutoSetting({...newAutoSetting, type: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10"
                  >
                    <option value="subscription_expiring">
                      {language === 'ar' ? 'قبل انتهاء الاشتراك' : 'Before subscription expires'}
                    </option>
                    <option value="payment_overdue">
                      {language === 'ar' ? 'بعد تأخر الدفع' : 'After payment overdue'}
                    </option>
                  </select>
                </div>

                {/* Trigger Mode - Days or Specific Date (only for subscription_expiring) */}
                {newAutoSetting.type === 'subscription_expiring' && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {language === 'ar' ? 'نوع التذكير' : 'Trigger Type'}
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setNewAutoSetting({...newAutoSetting, trigger_mode: 'days'})}
                        className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
                          newAutoSetting.trigger_mode === 'days'
                            ? 'bg-teal-500 text-white border-teal-500'
                            : 'bg-white dark:bg-white/10 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {language === 'ar' ? 'أيام قبل الانتهاء' : 'Days before expiry'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewAutoSetting({...newAutoSetting, trigger_mode: 'specific_date'})}
                        className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
                          newAutoSetting.trigger_mode === 'specific_date'
                            ? 'bg-teal-500 text-white border-teal-500'
                            : 'bg-white dark:bg-white/10 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {language === 'ar' ? 'تاريخ محدد' : 'Specific date'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Days - dynamic label based on type (only for days mode or payment_overdue) */}
                {(newAutoSetting.type === 'payment_overdue' || newAutoSetting.trigger_mode === 'days') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {newAutoSetting.type === 'payment_overdue'
                        ? (language === 'ar' ? 'أيام بعد التأخير' : 'Days after overdue')
                        : (language === 'ar' ? 'أيام قبل الانتهاء' : 'Days before expiry')}
                    </label>
                    <NumericInput
                      integer
                      min="1"
                      max="60"
                      value={newAutoSetting.type === 'payment_overdue' ? (newAutoSetting.days_after || 3) : newAutoSetting.days_before}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1
                        if (newAutoSetting.type === 'payment_overdue') {
                          setNewAutoSetting({...newAutoSetting, days_after: val})
                        } else {
                          setNewAutoSetting({...newAutoSetting, days_before: val})
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10"
                    />
                  </div>
                )}

                {/* Specific Date (only for subscription_expiring + specific_date mode) */}
                {newAutoSetting.type === 'subscription_expiring' && newAutoSetting.trigger_mode === 'specific_date' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === 'ar' ? 'تاريخ الإرسال' : 'Send Date'}
                    </label>
                    <input
                      type="date"
                      value={newAutoSetting.specific_date}
                      onChange={(e) => setNewAutoSetting({...newAutoSetting, specific_date: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10"
                    />
                  </div>
                )}

                {/* Send Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === 'ar' ? 'وقت الإرسال' : 'Send Time'}
                  </label>
                  <input
                    type="time"
                    value={newAutoSetting.send_time}
                    onChange={(e) => setNewAutoSetting({...newAutoSetting, send_time: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10"
                  />
                </div>

                {/* Enabled Toggle */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'ar' ? 'حالة التذكير' : 'Reminder Status'}
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setNewAutoSetting({...newAutoSetting, enabled: true})}
                      className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border flex items-center justify-center gap-2 ${
                        newAutoSetting.enabled
                          ? 'bg-green-500 text-white border-green-500'
                          : 'bg-white dark:bg-white/10 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {language === 'ar' ? 'مفعّل' : 'Enabled'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewAutoSetting({...newAutoSetting, enabled: false})}
                      className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border flex items-center justify-center gap-2 ${
                        !newAutoSetting.enabled
                          ? 'bg-gray-500 text-white border-gray-500'
                          : 'bg-white dark:bg-white/10 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      {language === 'ar' ? 'معطّل' : 'Disabled'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Target Audience */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'ar' ? 'الجمهور المستهدف' : 'Target Audience'}
                </label>
                <ParentAudienceSelector
                  value={newAutoSetting.targetAudience}
                  onChange={(audience) => setNewAutoSetting({...newAutoSetting, targetAudience: audience})}
                />
              </div>

              {/* Message - Plain text */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'ar' ? 'نص الرسالة' : 'Message'}
                </label>
                <textarea
                  value={newAutoSetting.message}
                  onChange={(e) => setNewAutoSetting({...newAutoSetting, message: e.target.value})}
                  rows={3}
                  placeholder={language === 'ar' ? 'اكتب رسالة التذكير هنا...' : 'Write your reminder message here...'}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreatingAuto(false)
                    setEditingAuto(null)
                    setNewAutoSetting({
                      title: '',
                      type: 'subscription_expiring',
                      enabled: true,
                      trigger_mode: 'days',
                      days_before: 7,
                      days_after: 3,
                      specific_date: '',
                      message: '',
                      send_time: '09:00',
                      targetAudience: { type: 'all' }
                    })
                  }}
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button
                  variant="primary"
                  onClick={editingAuto ? handleUpdateAutoSetting : handleCreateAutoSetting}
                  disabled={loadingAuto || !newAutoSetting.title}
                >
                  {loadingAuto ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                  ) : (
                    editingAuto 
                      ? (language === 'ar' ? 'تحديث' : 'Update')
                      : (language === 'ar' ? 'إنشاء' : 'Create')
                  )}
                </Button>
              </div>
            </GlassCard>
          ) : (
            <div className="flex justify-end">
              <Button
                variant="primary"
                onClick={() => setIsCreatingAuto(true)}
              >
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {language === 'ar' ? 'إضافة تذكير تلقائي' : 'Add Auto Reminder'}
              </Button>
            </div>
          )}

          {/* Auto Reminders List */}
          {loadingAuto ? (
            <div className="flex justify-center py-8">
              <svg className="w-8 h-8 text-teal-500 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            </div>
          ) : autoSettings.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">
                {language === 'ar' ? 'لا توجد تذكيرات تلقائية' : 'No Auto Reminders'}
              </h3>
              <p className="text-gray-500 mb-4">
                {language === 'ar' 
                  ? 'أضف تذكيرات تلقائية لإرسال رسائل SMS لأولياء الأمور واللاعبين قبل انتهاء اشتراكاتهم'
                  : 'Add auto reminders to send SMS to parents and players before their subscriptions expire'}
              </p>
            </GlassCard>
          ) : (
            <div className="grid gap-4">
              {autoSettings.map(setting => (
                <GlassCard key={setting.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      {/* Toggle with label */}
                      <div className="flex flex-col items-center gap-1">
                        <button
                          onClick={() => handleToggleAutoSetting(setting)}
                          className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                            setting.enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                          title={setting.enabled ? (language === 'ar' ? 'مفعّل - انقر للتعطيل' : 'Enabled - Click to disable') : (language === 'ar' ? 'معطّل - انقر للتفعيل' : 'Disabled - Click to enable')}
                        >
                          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                            setting.enabled ? 'translate-x-8' : 'translate-x-1'
                          }`} />
                        </button>
                        <span className={`text-xs font-medium ${setting.enabled ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
                          {setting.enabled ? (language === 'ar' ? 'مفعّل' : 'ON') : (language === 'ar' ? 'معطّل' : 'OFF')}
                        </span>
                      </div>
                      
                      {/* Info */}
                      <div>
                        <h4 className="font-medium text-gray-800 dark:text-white">
                          {setting.title}
                        </h4>
                        <div className="flex flex-wrap gap-2 mt-2 text-sm">
                          <span className={`px-2 py-0.5 rounded-lg ${
                            setting.type === 'subscription_expiring' 
                              ? 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400'
                              : 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'
                          }`}>
                            {setting.type === 'subscription_expiring' 
                              ? (language === 'ar' ? 'قبل انتهاء الاشتراك' : 'Before expiry')
                              : (language === 'ar' ? 'بعد تأخر الدفع' : 'After overdue')}
                          </span>
                          <span className="text-gray-500">
                            {setting.type === 'subscription_expiring'
                              ? (setting.trigger_mode === 'specific_date' && setting.specific_date
                                ? (language === 'ar' ? `في ${new Date(setting.specific_date).toLocaleDateString('ar-SA')}` : `on ${new Date(setting.specific_date).toLocaleDateString()}`)
                                : (language === 'ar' ? `${setting.days_before || 7} يوم` : `${setting.days_before || 7} days`))
                              : (language === 'ar' ? `${setting.days_after || 3} يوم` : `${setting.days_after || 3} days`)}
                          </span>
                          <span className="text-gray-500">
                            {language === 'ar' ? `الساعة ${setting.send_time}` : `at ${setting.send_time}`}
                          </span>
                        </div>
                        {setting.message && (
                          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                            {setting.message}
                          </p>
                        )}
                        <div className="mt-2 text-xs text-gray-400">
                          {language === 'ar' ? 'آخر تحديث بواسطة:' : 'Last updated by:'} {getLastEditorName(setting)}
                        </div>
                        {/* Audience */}
                        <div className="mt-2 text-sm">
                          <span className="text-gray-400">{language === 'ar' ? 'الجمهور:' : 'Audience:'}</span>{' '}
                          <span className="text-gray-600 dark:text-gray-300">
                            {(() => {
                              const audience = setting.target_audience
                              if (!audience || audience.type === 'all') {
                                return language === 'ar' ? 'جميع أولياء الأمور' : 'All Parents'
                              }
                              if (audience.type === 'branches') {
                                const branchCount = audience.branches?.length || 0
                                return language === 'ar' ? `${branchCount} فرع` : `${branchCount} branch(es)`
                              }
                              if (audience.type === 'specific') {
                                const userCount = audience.users?.length || 0
                                return language === 'ar' ? `${userCount} ولي أمر محدد` : `${userCount} specific parent(s)`
                              }
                              return language === 'ar' ? 'جميع أولياء الأمور' : 'All Parents'
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditAutoSetting(setting)}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteAutoSetting(setting.id)}
                        className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 text-red-500"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}

          {/* Info Box */}
          <GlassCard className="p-4 bg-blue-50/50 dark:bg-blue-500/10 border-l-4 border-blue-500">
            <div className="flex gap-3">
              <svg className="w-6 h-6 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="font-medium text-blue-700 dark:text-blue-400">
                  {language === 'ar' ? 'كيف تعمل التذكيرات التلقائية' : 'How Auto Reminders Work'}
                </h4>
                <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                  {language === 'ar' 
                    ? 'سيتم إرسال رسائل SMS تلقائياً لأولياء الأمور وفقاً للإعدادات المحددة. يتم تشغيل التذكيرات يومياً في الوقت المحدد.'
                    : 'SMS messages will be sent automatically to parents based on the configured settings. Reminders run daily at the specified time.'}
                </p>
              </div>
            </div>
      </GlassCard>
        </div>
      )}

      {/* Auto Announcements Tab */}
      {activeTab === 'announcement' && (
        <div className="space-y-6">
          {isCreatingAutoAnnouncement ? (
            <GlassCard className="p-6">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
                {editingAutoAnnouncement
                  ? (language === 'ar' ? 'تعديل الإعلان التلقائي' : 'Edit Auto Announcement')
                  : (language === 'ar' ? 'إنشاء إعلان تلقائي جديد' : 'Create New Auto Announcement')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === 'ar' ? 'العنوان' : 'Title'}
                  </label>
                  <input
                    type="text"
                    value={newAutoAnnouncementSetting.title}
                    onChange={(e) => setNewAutoAnnouncementSetting({...newAutoAnnouncementSetting, title: e.target.value})}
                    placeholder={language === 'ar' ? 'إعلان انتهاء الاشتراك' : 'Subscription expiry announcement'}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === 'ar' ? 'نوع التذكير' : 'Reminder Type'}
                  </label>
                  <select
                    value={newAutoAnnouncementSetting.type}
                    onChange={(e) => setNewAutoAnnouncementSetting({...newAutoAnnouncementSetting, type: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10"
                  >
                    <option value="subscription_expiring">
                      {language === 'ar' ? 'قبل انتهاء الاشتراك' : 'Before subscription expires'}
                    </option>
                    <option value="payment_overdue">
                      {language === 'ar' ? 'بعد تأخر الدفع' : 'After payment overdue'}
                    </option>
                  </select>
                </div>

                {/* Trigger Mode (only for subscription_expiring) */}
                {newAutoAnnouncementSetting.type === 'subscription_expiring' && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {language === 'ar' ? 'نوع التذكير' : 'Trigger Type'}
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setNewAutoAnnouncementSetting({...newAutoAnnouncementSetting, trigger_mode: 'days'})}
                        className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
                          newAutoAnnouncementSetting.trigger_mode === 'days'
                            ? 'bg-teal-500 text-white border-teal-500'
                            : 'bg-white dark:bg-white/10 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {language === 'ar' ? 'أيام قبل الانتهاء' : 'Days before expiry'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewAutoAnnouncementSetting({...newAutoAnnouncementSetting, trigger_mode: 'specific_date'})}
                        className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
                          newAutoAnnouncementSetting.trigger_mode === 'specific_date'
                            ? 'bg-teal-500 text-white border-teal-500'
                            : 'bg-white dark:bg-white/10 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {language === 'ar' ? 'تاريخ محدد' : 'Specific date'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Days (for days mode or payment_overdue) */}
                {(newAutoAnnouncementSetting.type === 'payment_overdue' || newAutoAnnouncementSetting.trigger_mode === 'days') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {newAutoAnnouncementSetting.type === 'payment_overdue'
                        ? (language === 'ar' ? 'أيام بعد التأخير' : 'Days after overdue')
                        : (language === 'ar' ? 'أيام قبل الانتهاء' : 'Days before expiry')}
                    </label>
                    <NumericInput
                      integer
                      min="1"
                      max="60"
                      value={newAutoAnnouncementSetting.type === 'payment_overdue' ? (newAutoAnnouncementSetting.days_after || 3) : newAutoAnnouncementSetting.days_before}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1
                        if (newAutoAnnouncementSetting.type === 'payment_overdue') {
                          setNewAutoAnnouncementSetting({...newAutoAnnouncementSetting, days_after: val})
                        } else {
                          setNewAutoAnnouncementSetting({...newAutoAnnouncementSetting, days_before: val})
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10"
                    />
                  </div>
                )}

                {/* Specific Date */}
                {newAutoAnnouncementSetting.type === 'subscription_expiring' && newAutoAnnouncementSetting.trigger_mode === 'specific_date' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === 'ar' ? 'تاريخ الإرسال' : 'Send Date'}
                    </label>
                    <input
                      type="date"
                      value={newAutoAnnouncementSetting.specific_date}
                      onChange={(e) => setNewAutoAnnouncementSetting({...newAutoAnnouncementSetting, specific_date: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10"
                    />
                  </div>
                )}

                {/* Send Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === 'ar' ? 'وقت الإرسال' : 'Send Time'}
                  </label>
                  <input
                    type="time"
                    value={newAutoAnnouncementSetting.send_time}
                    onChange={(e) => setNewAutoAnnouncementSetting({...newAutoAnnouncementSetting, send_time: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10"
                  />
                </div>

                {/* Enabled Toggle */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'ar' ? 'حالة التذكير' : 'Reminder Status'}
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setNewAutoAnnouncementSetting({...newAutoAnnouncementSetting, enabled: true})}
                      className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border flex items-center justify-center gap-2 ${
                        newAutoAnnouncementSetting.enabled
                          ? 'bg-green-500 text-white border-green-500'
                          : 'bg-white dark:bg-white/10 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {language === 'ar' ? 'مفعّل' : 'Enabled'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewAutoAnnouncementSetting({...newAutoAnnouncementSetting, enabled: false})}
                      className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border flex items-center justify-center gap-2 ${
                        !newAutoAnnouncementSetting.enabled
                          ? 'bg-gray-500 text-white border-gray-500'
                          : 'bg-white dark:bg-white/10 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      {language === 'ar' ? 'معطّل' : 'Disabled'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Target Audience */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'ar' ? 'الجمهور المستهدف' : 'Target Audience'}
                </label>
                <ParentAudienceSelector
                  value={newAutoAnnouncementSetting.targetAudience}
                  onChange={(audience) => setNewAutoAnnouncementSetting({...newAutoAnnouncementSetting, targetAudience: audience})}
                />
              </div>

              {/* Message */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'ar' ? 'نص الرسالة' : 'Message'}
                </label>
                <textarea
                  value={newAutoAnnouncementSetting.message}
                  onChange={(e) => setNewAutoAnnouncementSetting({...newAutoAnnouncementSetting, message: e.target.value})}
                  rows={3}
                  placeholder={language === 'ar' ? 'اكتب رسالة الإعلان هنا...' : 'Write your announcement message here...'}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreatingAutoAnnouncement(false)
                    setEditingAutoAnnouncement(null)
                    setNewAutoAnnouncementSetting({ ...defaultAnnouncementForm })
                  }}
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button
                  variant="primary"
                  onClick={editingAutoAnnouncement ? handleUpdateAutoAnnouncementSetting : handleCreateAutoAnnouncementSetting}
                  disabled={loadingAutoAnnouncements || !newAutoAnnouncementSetting.title}
                >
                  {loadingAutoAnnouncements ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                  ) : (
                    editingAutoAnnouncement
                      ? (language === 'ar' ? 'تحديث' : 'Update')
                      : (language === 'ar' ? 'إنشاء' : 'Create')
                  )}
                </Button>
              </div>
            </GlassCard>
          ) : (
            <div className="flex justify-end">
              <Button
                variant="primary"
                onClick={() => setIsCreatingAutoAnnouncement(true)}
              >
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {language === 'ar' ? 'إضافة إعلان تلقائي' : 'Add Auto Announcement'}
              </Button>
            </div>
          )}

          {/* Auto Announcements List */}
          {loadingAutoAnnouncements ? (
            <div className="flex justify-center py-8">
              <svg className="w-8 h-8 text-teal-500 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            </div>
          ) : autoAnnouncementSettings.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">
                {language === 'ar' ? 'لا توجد إعلانات تلقائية' : 'No Auto Announcements'}
              </h3>
              <p className="text-gray-500 mb-4">
                {language === 'ar'
                  ? 'أضف إعلانات تلقائية لإرسال إشعارات لأولياء الأمور واللاعبين'
                  : 'Add auto announcements to send notifications to parents and players'}
              </p>
            </GlassCard>
          ) : (
            <div className="grid gap-4">
              {autoAnnouncementSettings.map(setting => (
                <GlassCard key={setting.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      {/* Toggle with label */}
                      <div className="flex flex-col items-center gap-1">
                        <button
                          onClick={() => handleToggleAutoAnnouncementSetting(setting)}
                          className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                            setting.enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                          title={setting.enabled ? (language === 'ar' ? 'مفعّل - انقر للتعطيل' : 'Enabled - Click to disable') : (language === 'ar' ? 'معطّل - انقر للتفعيل' : 'Disabled - Click to enable')}
                        >
                          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                            setting.enabled ? 'translate-x-8' : 'translate-x-1'
                          }`} />
                        </button>
                        <span className={`text-xs font-medium ${setting.enabled ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
                          {setting.enabled ? (language === 'ar' ? 'مفعّل' : 'ON') : (language === 'ar' ? 'معطّل' : 'OFF')}
                        </span>
                      </div>
                      
                      {/* Info */}
                      <div>
                        <h4 className="font-medium text-gray-800 dark:text-white">
                          {setting.title}
                        </h4>
                        <div className="flex flex-wrap gap-2 mt-2 text-sm">
                          <span className={`px-2 py-0.5 rounded-lg ${
                            setting.type === 'subscription_expiring'
                              ? 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400'
                              : 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'
                          }`}>
                            {setting.type === 'subscription_expiring'
                              ? (language === 'ar' ? 'قبل انتهاء الاشتراك' : 'Before expiry')
                              : (language === 'ar' ? 'بعد تأخر الدفع' : 'After overdue')}
                          </span>
                          <span className="text-gray-500">
                            {setting.type === 'subscription_expiring'
                              ? (setting.trigger_mode === 'specific_date' && setting.specific_date
                                ? (language === 'ar' ? `في ${new Date(setting.specific_date).toLocaleDateString('ar-SA')}` : `on ${new Date(setting.specific_date).toLocaleDateString()}`)
                                : (language === 'ar' ? `${setting.days_before || 7} يوم` : `${setting.days_before || 7} days`))
                              : (language === 'ar' ? `${setting.days_after || 3} يوم` : `${setting.days_after || 3} days`)}
                          </span>
                          <span className="text-gray-500">
                            {language === 'ar' ? `الساعة ${setting.send_time}` : `at ${setting.send_time}`}
                          </span>
                        </div>
                        {setting.message && (
                          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                            {setting.message}
                          </p>
                        )}
                        {/* Audience */}
                        <div className="mt-2 text-sm">
                          <span className="text-gray-400">{language === 'ar' ? 'الجمهور:' : 'Audience:'}</span>{' '}
                          <span className="text-gray-600 dark:text-gray-300">
                            {(() => {
                              const audience = setting.target_audience
                              if (!audience || audience.type === 'all') {
                                return language === 'ar' ? 'جميع أولياء الأمور واللاعبين' : 'All Parents & Players'
                              }
                              if (audience.type === 'roles' && Array.isArray(audience.roles)) {
                                const roleLabels = {
                                  parent: language === 'ar' ? 'أولياء الأمور' : 'Parents',
                                  player: language === 'ar' ? 'اللاعبون' : 'Players'
                                }
                                return audience.roles.map(role => roleLabels[role] || role).join(', ')
                              }
                              if (audience.type === 'branches') {
                                const branchCount = audience.branches?.length || 0
                                return language === 'ar' ? `${branchCount} فرع` : `${branchCount} branch(es)`
                              }
                              if (audience.type === 'specific') {
                                const branchCount = audience.branches ? Object.keys(audience.branches).length : 0
                                if (branchCount > 0) {
                                  return language === 'ar' ? `${branchCount} فرع` : `${branchCount} branch(es)`
                                }
                                const userCount = audience.users?.length || 0
                                return language === 'ar' ? `${userCount} شخص محدد` : `${userCount} specific person(s)`
                              }
                              return language === 'ar' ? 'جميع أولياء الأمور واللاعبين' : 'All Parents & Players'
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setHistoryTarget({ entityType: 'accountant_auto_announcement', entityId: setting.id, title: setting.title })}
                        className="p-2 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-500"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleEditAutoAnnouncementSetting(setting)}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteAutoAnnouncementSetting(setting.id)}
                        className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 text-red-500"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}

          {/* Info Box */}
          <GlassCard className="p-4 bg-blue-50/50 dark:bg-blue-500/10 border-l-4 border-blue-500">
            <div className="flex gap-3">
              <svg className="w-6 h-6 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="font-medium text-blue-700 dark:text-blue-400">
                  {language === 'ar' ? 'كيف تعمل الإعلانات التلقائية' : 'How Auto Announcements Work'}
                </h4>
                <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                  {language === 'ar'
                    ? 'سيتم إرسال الإعلانات تلقائياً كإشعارات داخل التطبيق وفقاً للإعدادات المحددة.'
                    : 'Announcements will be sent automatically as in-app notifications based on your settings.'}
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
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
