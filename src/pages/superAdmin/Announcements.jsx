import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { announcementsService } from '../../services'
import automaticAnnouncementsService from '../../services/automaticAnnouncements.service'
import GlassCard from '../../components/ui/GlassCard'
import Button from '../../components/ui/Button'
import AudienceSelector from '../../components/common/AudienceSelector'

export default function Announcements() {
  const { language } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('manual')
  const [announcements, setAnnouncements] = useState([])
  const [autoAnnouncements, setAutoAnnouncements] = useState([])
  const [isCreating, setIsCreating] = useState(false)
  const [isCreatingAuto, setIsCreatingAuto] = useState(false)
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    targetAudience: { type: 'all' }
  })
  const [newAutoAnnouncement, setNewAutoAnnouncement] = useState({
    name: '',
    targetAudience: { type: 'all' },
    scheduleType: 'date_range', // 'date_range' or 'specific_days'
    startDate: '',
    endDate: '',
    sendDays: [],
    sendTime: '',
    message: '',
    sendNotification: true
  })
  const [editingAnnouncement, setEditingAnnouncement] = useState(null)
  const [editingAutoAnnouncement, setEditingAutoAnnouncement] = useState(null)
  const [deletingId, setDeletingId] = useState(null) // Track which item is pending delete confirmation
  const [deletingType, setDeletingType] = useState(null) // 'manual' or 'auto'

  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true)
      console.log('📡 Fetching announcements...');
      const response = await announcementsService.getAll({ limit: 50 })
      console.log('📥 Announcements response:', response);
      
      if (response.success) {
        // Filter out announcements created by accountants
        const filtered = (response.data || []).filter(a => a.author?.role !== 'accountant')
        setAnnouncements(filtered)
      }
    } catch (err) {
      console.error('❌ Error fetching announcements:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchAutoAnnouncements = useCallback(async () => {
    try {
      console.log('📡 Fetching automatic announcements...');
      const response = await automaticAnnouncementsService.getAll({ limit: 50 })
      console.log('📥 Auto announcements response:', response);
      
      if (response.success) {
        setAutoAnnouncements(response.data || [])
        console.log('✅ Auto announcements loaded:', response.data?.length || 0);
        console.log('📋 Setting auto announcements state:', response.data);
      }
    } catch (err) {
      console.error('❌ Error fetching auto announcements:', err)
    }
  }, [])

  useEffect(() => {
    fetchAnnouncements()
    fetchAutoAnnouncements()
  }, [fetchAnnouncements, fetchAutoAnnouncements])

  const handlePublish = async () => {
    console.log('🚀 Publishing announcement:', newAnnouncement);
    
    if (!newAnnouncement.title || !newAnnouncement.content) {
      console.log('❌ Missing required fields:', { title: newAnnouncement.title, content: newAnnouncement.content });
      return;
    }
    
    try {
      const response = await announcementsService.create({
        title: newAnnouncement.title,
        content: newAnnouncement.content,
        target_audience: newAnnouncement.targetAudience,
        is_published: true
      })
      
      console.log('✅ Announcement created:', response);
      
      if (response.success) {
        setNewAnnouncement({ title: '', content: '', targetAudience: { type: 'all' } })
        setIsCreating(false)
        fetchAnnouncements()
      }
    } catch (err) {
      console.error('❌ Error creating announcement:', err)
    }
  }

  const handleCreateAuto = async () => {
    console.log('🚀 Creating automatic announcement:', newAutoAnnouncement);
    
    if (!newAutoAnnouncement.name || !newAutoAnnouncement.message) {
      console.log('❌ Missing required fields:', { 
        name: newAutoAnnouncement.name, 
        message: newAutoAnnouncement.message 
      });
      return;
    }
    
    // Validate based on schedule type
    if (newAutoAnnouncement.scheduleType === 'date_range') {
      if (!newAutoAnnouncement.startDate || !newAutoAnnouncement.endDate) {
        console.log('❌ Missing date range');
        return;
      }
    } else if (newAutoAnnouncement.scheduleType === 'specific_days') {
      if (newAutoAnnouncement.sendDays.length === 0) {
        console.log('❌ No send days selected');
        return;
      }
    }
    
    try {
      const response = await automaticAnnouncementsService.create({
        name: newAutoAnnouncement.name,
        target_audience: newAutoAnnouncement.targetAudience,
        schedule_type: newAutoAnnouncement.scheduleType,
        start_date: newAutoAnnouncement.scheduleType === 'date_range' ? newAutoAnnouncement.startDate : null,
        end_date: newAutoAnnouncement.scheduleType === 'date_range' ? newAutoAnnouncement.endDate : null,
        send_days: newAutoAnnouncement.scheduleType === 'specific_days' ? newAutoAnnouncement.sendDays : null,
        send_time: newAutoAnnouncement.sendTime,
        message: newAutoAnnouncement.message,
        send_notification: newAutoAnnouncement.sendNotification
      });
      
      console.log('✅ Automatic announcement created:', response);
      
      if (response.success) {
        setNewAutoAnnouncement({
          name: '',
          targetAudience: { type: 'all' },
          scheduleType: 'date_range',
          startDate: '',
          endDate: '',
          sendDays: [],
          sendTime: '',
          message: '',
          sendNotification: true
        });
        setIsCreatingAuto(false);
        fetchAutoAnnouncements();
      }
      
    } catch (err) {
      console.error('❌ Error creating automatic announcement:', err)
    }
  }

  // Request delete confirmation for manual announcement
  const handleDeleteAnnouncement = (id) => {
    setDeletingId(id)
    setDeletingType('manual')
  }

  // Confirm delete manual announcement
  const confirmDeleteAnnouncement = async () => {
    if (!deletingId) return
    try {
      await announcementsService.delete(deletingId)
      setDeletingId(null)
      setDeletingType(null)
      fetchAnnouncements()
    } catch (err) {
      console.error('❌ Error deleting announcement:', err)
    }
  }

  // Cancel delete
  const cancelDelete = () => {
    setDeletingId(null)
    setDeletingType(null)
  }

  // Edit manual announcement - use inline form
  const handleEditAnnouncement = (announcement) => {
    setEditingAnnouncement(announcement.id)
    setNewAnnouncement({
      title: announcement.title || '',
      content: announcement.content || '',
      targetAudience: announcement.target_audience || { type: 'all' }
    })
    setIsCreating(true)
  }

  // Save edited manual announcement
  const handleSaveAnnouncement = async () => {
    if (!editingAnnouncement) return
    try {
      await announcementsService.update(editingAnnouncement, {
        title: newAnnouncement.title,
        content: newAnnouncement.content,
        target_audience: newAnnouncement.targetAudience
      })
      setEditingAnnouncement(null)
      setNewAnnouncement({ title: '', content: '', targetAudience: { type: 'all' } })
      setIsCreating(false)
      fetchAnnouncements()
    } catch (err) {
      console.error('❌ Error updating announcement:', err)
    }
  }

  // Request delete confirmation for automatic announcement
  const handleDeleteAutoAnnouncement = (id) => {
    setDeletingId(id)
    setDeletingType('auto')
  }

  // Confirm delete automatic announcement
  const confirmDeleteAutoAnnouncement = async () => {
    if (!deletingId) return
    try {
      await automaticAnnouncementsService.delete(deletingId)
      setDeletingId(null)
      setDeletingType(null)
      fetchAutoAnnouncements()
    } catch (err) {
      console.error('❌ Error deleting automatic announcement:', err)
    }
  }

  // Edit automatic announcement - use inline form
  const handleEditAutoAnnouncement = (autoAnnouncement) => {
    setEditingAutoAnnouncement(autoAnnouncement.id)
    setNewAutoAnnouncement({
      name: autoAnnouncement.name || '',
      targetAudience: autoAnnouncement.target_audience || { type: 'all' },
      scheduleType: autoAnnouncement.schedule_type || 'date_range',
      startDate: autoAnnouncement.start_date || '',
      endDate: autoAnnouncement.end_date || '',
      sendDays: autoAnnouncement.send_days || [],
      sendTime: autoAnnouncement.send_time || '',
      message: autoAnnouncement.message || '',
      sendNotification: autoAnnouncement.send_notification !== false
    })
    setIsCreatingAuto(true)
  }

  // Save edited automatic announcement
  const handleSaveAutoAnnouncement = async () => {
    if (!editingAutoAnnouncement) return
    try {
      await automaticAnnouncementsService.update(editingAutoAnnouncement, {
        name: newAutoAnnouncement.name,
        target_audience: newAutoAnnouncement.targetAudience,
        schedule_type: newAutoAnnouncement.scheduleType,
        start_date: newAutoAnnouncement.scheduleType === 'date_range' ? newAutoAnnouncement.startDate : null,
        end_date: newAutoAnnouncement.scheduleType === 'date_range' ? newAutoAnnouncement.endDate : null,
        send_days: newAutoAnnouncement.scheduleType === 'specific_days' ? newAutoAnnouncement.sendDays : null,
        send_time: newAutoAnnouncement.sendTime,
        message: newAutoAnnouncement.message,
        send_notification: newAutoAnnouncement.sendNotification
      })
      setEditingAutoAnnouncement(null)
      setNewAutoAnnouncement({
        name: '', targetAudience: { type: 'all' }, scheduleType: 'date_range', startDate: '', endDate: '', sendDays: [], sendTime: '', message: '', sendNotification: true
      })
      setIsCreatingAuto(false)
      fetchAutoAnnouncements()
    } catch (err) {
      console.error('❌ Error updating automatic announcement:', err)
    }
  }

  // Helper function to format audience for display
  const formatAudience = (audience) => {
    if (!audience) return language === 'ar' ? 'الجميع' : 'All'
    if (typeof audience === 'string') return audience // Legacy format
    
    const roleLabels = {
      branch_admin: language === 'ar' ? 'مديرو الفروع' : 'Branch Admins',
      coach: language === 'ar' ? 'المدربون' : 'Coaches',
      accountant: language === 'ar' ? 'المحاسبون' : 'Accountants',
      parent: language === 'ar' ? 'أولياء الأمور' : 'Parents',
      player: language === 'ar' ? 'اللاعبون' : 'Players'
    }
    
    if (audience.type === 'all') {
      return language === 'ar' ? 'الجميع' : 'All'
    }
    if (audience.type === 'roles' && audience.roles?.length > 0) {
      return audience.roles.map(r => roleLabels[r] || r).join(', ')
    }
    if (audience.type === 'specific') {
      const branchCount = Object.keys(audience.branches || {}).length
      return language === 'ar' ? `${branchCount} فرع محدد` : `${branchCount} specific branches`
    }
    return language === 'ar' ? 'الجميع' : 'All'
  }

  const getAnnouncementTimestamp = (announcement) => {
    return announcement?.created_at
      || announcement?.createdAt
      || announcement?.published_at
      || announcement?.publishedAt
      || announcement?.updated_at
      || announcement?.updatedAt
      || null
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-secondary dark:text-white">
            {language === 'ar' ? 'الإعلانات' : 'Announcements'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {language === 'ar' ? 'إرسال إعلانات للمستخدمين' : 'Send announcements to users'}
          </p>
        </div>
        {!isCreating && !isCreatingAuto && (
          <Button onClick={() => activeTab === 'manual' ? setIsCreating(true) : setIsCreatingAuto(true)} className="bg-gradient-to-r from-purple-500 to-pink-500">
            <svg className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {activeTab === 'manual' 
              ? (language === 'ar' ? 'إعلان جديد' : 'New Announcement')
              : (language === 'ar' ? 'إعلان تلقائي جديد' : 'New Automatic Announcement')
            }
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => { setActiveTab('manual'); setIsCreating(false); setIsCreatingAuto(false); }}
          className={`px-4 py-2 rounded-xl font-semibold transition-all ${
            activeTab === 'manual'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
              : 'bg-white/50 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'
          }`}
        >
          {language === 'ar' ? 'يدوي' : 'Manual'}
        </button>
        <button
          onClick={() => { setActiveTab('automatic'); setIsCreating(false); setIsCreatingAuto(false); }}
          className={`px-4 py-2 rounded-xl font-semibold transition-all ${
            activeTab === 'automatic'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
              : 'bg-white/50 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'
          }`}
        >
          {language === 'ar' ? 'تلقائي' : 'Automatic'}
        </button>
      </div>

      {/* Create/Edit Form */}
      {isCreating && activeTab === 'manual' && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-secondary dark:text-white">
              {editingAnnouncement 
                ? (language === 'ar' ? 'تعديل الإعلان' : 'Edit Announcement')
                : (language === 'ar' ? 'إعلان جديد' : 'New Announcement')
              }
            </h3>
            <button onClick={() => { setIsCreating(false); setEditingAnnouncement(null); setNewAnnouncement({ title: '', content: '', targetAudience: { type: 'all' } }); }} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {language === 'ar' ? 'العنوان' : 'Title'} *
              </label>
              <input
                type="text"
                value={newAnnouncement.title}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder={language === 'ar' ? 'عنوان الإعلان' : 'Announcement title'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {language === 'ar' ? 'المحتوى' : 'Content'} *
              </label>
              <textarea
                value={newAnnouncement.content}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                rows={4}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder={language === 'ar' ? 'محتوى الإعلان' : 'Announcement content'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {language === 'ar' ? 'الجمهور المستهدف' : 'Target Audience'}
              </label>
              <AudienceSelector
                value={newAnnouncement.targetAudience}
                onChange={(audience) => setNewAnnouncement({ ...newAnnouncement, targetAudience: audience })}
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={editingAnnouncement ? handleSaveAnnouncement : handlePublish} className="bg-gradient-to-r from-purple-500 to-pink-500">
                <svg className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={editingAnnouncement ? "M5 13l4 4L19 7" : "M12 19l9 2-9-18-9 18 9-2zm0 0v-8"} />
                </svg>
                {editingAnnouncement 
                  ? (language === 'ar' ? 'حفظ التعديلات' : 'Save Changes')
                  : (language === 'ar' ? 'نشر الإعلان' : 'Publish')
                }
              </Button>
              <button onClick={() => { setIsCreating(false); setEditingAnnouncement(null); setNewAnnouncement({ title: '', content: '', targetAudience: { type: 'all' } }); }} className="px-6 py-2 text-gray-600 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-100 dark:hover:bg-white/10">
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Content */}
      {activeTab === 'manual' ? (
        <>
          {/* Announcements List */}
          {announcements.length > 0 && (
            <>
              <div className="mb-4 text-sm text-gray-500">
                {language === 'ar' ? `عرض ${announcements.length} إعلان` : `Showing ${announcements.length} announcements`}
              </div>
              <div className="space-y-4">
                {announcements.map((announcement, index) => {
                  console.log(`🔍 Rendering announcement ${index}:`, announcement);
                  return (
                    <GlassCard key={announcement.id} className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-secondary dark:text-white mb-2">
                            {announcement.title || 'No Title'}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-300 mb-3 whitespace-pre-wrap">
                            {announcement.content || 'No Content'}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {getAnnouncementTimestamp(announcement)
                                ? new Date(getAnnouncementTimestamp(announcement)).toLocaleDateString()
                                : (language === 'ar' ? 'غير متوفر' : 'No Date')}
                            </span>
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              {formatAudience(announcement.target_audience)}
                            </span>
                            {announcement.author && (
                              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {announcement.author.first_name} {announcement.author.last_name}
                                {announcement.author.role && announcement.author.role !== 'super_admin' && (
                                  <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                                    announcement.author.role === 'accountant' 
                                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                                      : announcement.author.role === 'branch_admin'
                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                  }`}>
                                    {announcement.author.role === 'accountant' 
                                      ? (language === 'ar' ? 'محاسب' : 'Accountant')
                                      : announcement.author.role === 'branch_admin'
                                        ? (language === 'ar' ? 'مدير فرع' : 'Branch Admin')
                                        : announcement.author.role
                                    }
                                  </span>
                                )}
                              </span>
                            )}
                            {announcement.is_published && (
                              <span className="flex items-center gap-1 text-green-600">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Published
                              </span>
                            )}
                          </div>
                        </div>
                        {deletingId === announcement.id && deletingType === 'manual' ? (
                          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">
                            <span className="text-sm text-red-600 dark:text-red-400">
                              {language === 'ar' ? 'تأكيد الحذف؟' : 'Delete?'}
                            </span>
                            <button onClick={confirmDeleteAnnouncement} className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg">
                              {language === 'ar' ? 'نعم' : 'Yes'}
                            </button>
                            <button onClick={cancelDelete} className="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg">
                              {language === 'ar' ? 'لا' : 'No'}
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button onClick={() => handleEditAnnouncement(announcement)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl text-gray-500">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button onClick={() => handleDeleteAnnouncement(announcement.id)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl text-red-500">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            </>
          )}

          {/* Empty State */}
          {announcements.length === 0 && (
            <GlassCard className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
              </div>
              <p className="text-gray-500 mb-2">{language === 'ar' ? 'لا توجد إعلانات بعد' : 'No announcements yet'}</p>
              <p className="text-sm text-gray-400">{language === 'ar' ? 'انقر على "إعلان جديد" لإنشاء أول إعلان' : 'Click "New Announcement" to create your first announcement'}</p>
            </GlassCard>
          )}
        </>
      ) : (
        <>
          {/* Automatic Announcement Form */}
          {isCreatingAuto && activeTab === 'automatic' && (
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-secondary dark:text-white">
                  {editingAutoAnnouncement
                    ? (language === 'ar' ? 'تعديل الإعلان التلقائي' : 'Edit Automatic Announcement')
                    : (language === 'ar' ? 'إعلان تلقائي جديد' : 'New Automatic Announcement')
                  }
                </h3>
                <button onClick={() => { setIsCreatingAuto(false); setEditingAutoAnnouncement(null); setNewAutoAnnouncement({ name: '', targetAudience: { type: 'all' }, scheduleType: 'date_range', startDate: '', endDate: '', sendDays: [], sendTime: '', message: '', sendNotification: true }); }} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'ar' ? 'اسم الإعلان' : 'Announcement Name'}
                  </label>
                  <input
                    type="text"
                    value={newAutoAnnouncement.name}
                    onChange={(e) => setNewAutoAnnouncement({ ...newAutoAnnouncement, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder={language === 'ar' ? 'مثال: تذكير الدفع' : 'e.g., Payment Reminder'}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'ar' ? 'الجمهور المستهدف' : 'Target Audience'}
                  </label>
                  <AudienceSelector
                    value={newAutoAnnouncement.targetAudience}
                    onChange={(audience) => setNewAutoAnnouncement({ ...newAutoAnnouncement, targetAudience: audience })}
                  />
                </div>
                
                {/* Schedule Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    {language === 'ar' ? 'نوع الجدولة' : 'Schedule Type'}
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="scheduleType"
                        checked={newAutoAnnouncement.scheduleType === 'date_range'}
                        onChange={() => setNewAutoAnnouncement({ ...newAutoAnnouncement, scheduleType: 'date_range', sendDays: [] })}
                        className="w-4 h-4 text-purple-500 border-gray-300 focus:ring-purple-500" 
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {language === 'ar' ? 'نطاق تاريخ (يومياً)' : 'Date Range (Daily)'}
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="scheduleType"
                        checked={newAutoAnnouncement.scheduleType === 'specific_days'}
                        onChange={() => setNewAutoAnnouncement({ ...newAutoAnnouncement, scheduleType: 'specific_days', startDate: '', endDate: '' })}
                        className="w-4 h-4 text-purple-500 border-gray-300 focus:ring-purple-500" 
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {language === 'ar' ? 'أيام محددة (أسبوعياً)' : 'Specific Days (Weekly)'}
                      </span>
                    </label>
                  </div>
                </div>

                {/* Date Range Options */}
                {newAutoAnnouncement.scheduleType === 'date_range' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {language === 'ar' ? 'تاريخ البدء' : 'Start Date'}
                      </label>
                      <input
                        type="date"
                        value={newAutoAnnouncement.startDate}
                        onChange={(e) => setNewAutoAnnouncement({ ...newAutoAnnouncement, startDate: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {language === 'ar' ? 'تاريخ الانتهاء' : 'End Date'}
                      </label>
                      <input
                        type="date"
                        value={newAutoAnnouncement.endDate}
                        onChange={(e) => setNewAutoAnnouncement({ ...newAutoAnnouncement, endDate: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {language === 'ar' ? 'توقيت الإرسال' : 'Send Time'}
                      </label>
                      <input
                        type="time"
                        value={newAutoAnnouncement.sendTime}
                        onChange={(e) => setNewAutoAnnouncement({ ...newAutoAnnouncement, sendTime: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                )}

                {/* Specific Days Options */}
                {newAutoAnnouncement.scheduleType === 'specific_days' && (
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
                              checked={newAutoAnnouncement.sendDays?.includes(day) || false}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewAutoAnnouncement({ ...newAutoAnnouncement, sendDays: [...(newAutoAnnouncement.sendDays || []), day] })
                                } else {
                                  setNewAutoAnnouncement({ ...newAutoAnnouncement, sendDays: (newAutoAnnouncement.sendDays || []).filter(d => d !== day) })
                                }
                              }}
                              className="w-4 h-4 text-purple-500 border-gray-300 rounded focus:ring-purple-500" 
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
                        value={newAutoAnnouncement.sendTime}
                        onChange={(e) => setNewAutoAnnouncement({ ...newAutoAnnouncement, sendTime: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'ar' ? 'الرسالة' : 'Message'}
                  </label>
                  <textarea
                    rows={4}
                    value={newAutoAnnouncement.message}
                    onChange={(e) => setNewAutoAnnouncement({ ...newAutoAnnouncement, message: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder={language === 'ar' ? 'اكتب رسالة الإعلان...' : 'Write announcement message...'}
                  />
                </div>
                
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={newAutoAnnouncement.sendNotification}
                      onChange={(e) => setNewAutoAnnouncement({ ...newAutoAnnouncement, sendNotification: e.target.checked })}
                      className="w-4 h-4 text-purple-500 border-gray-300 rounded focus:ring-purple-500" 
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {language === 'ar' ? 'إرسال إشعار' : 'Send Notification'}
                    </span>
                  </label>
                </div>
                
                <div className="flex gap-3">
                  <Button onClick={editingAutoAnnouncement ? handleSaveAutoAnnouncement : handleCreateAuto} className="bg-gradient-to-r from-purple-500 to-pink-500">
                    <svg className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={editingAutoAnnouncement ? "M5 13l4 4L19 7" : "M12 6v6m0 0v6m0-6h6m-6 0H6"} />
                    </svg>
                    {editingAutoAnnouncement
                      ? (language === 'ar' ? 'حفظ التعديلات' : 'Save Changes')
                      : (language === 'ar' ? 'إضافة إعلان تلقائي' : 'Add Automatic Announcement')
                    }
                  </Button>
                  <button onClick={() => { setIsCreatingAuto(false); setEditingAutoAnnouncement(null); setNewAutoAnnouncement({ name: '', targetAudience: { type: 'all' }, scheduleType: 'date_range', startDate: '', endDate: '', sendDays: [], sendTime: '', message: '', sendNotification: true }); }} className="px-6 py-2 text-gray-600 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-100 dark:hover:bg-white/10">
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              </div>
            </GlassCard>
          )}
          
          {/* Existing Automatic Announcements */}
          <GlassCard className="p-6">
            <h3 className="text-lg font-bold text-secondary dark:text-white mb-4">
              {language === 'ar' ? 'الإعلانات التلقائية' : 'Automatic Announcements'}
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              {language === 'ar' ? 'قم بإعداد إعلانات تلقائية ترسل في أوقات محددة' : 'Set up automatic announcements that are sent at specified times'}
            </p>
            
            <h4 className="text-md font-semibold text-secondary dark:text-white mb-4">
              {language === 'ar' ? 'الإعلانات التلقائية الحالية' : 'Current Automatic Announcements'}
            </h4>
            
            {/* Auto Announcements List */}
            {autoAnnouncements.length > 0 && (
              <div className="space-y-4">
                {autoAnnouncements.map((autoAnnouncement) => (
                  <GlassCard key={autoAnnouncement.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h5 className="font-semibold text-secondary dark:text-white">
                            {autoAnnouncement.name}
                          </h5>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            autoAnnouncement.is_active 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                          }`}>
                            {autoAnnouncement.is_active 
                              ? (language === 'ar' ? 'نشط' : 'Active') 
                              : (language === 'ar' ? 'غير نشط' : 'Inactive')
                            }
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                          <p><strong>{language === 'ar' ? 'الجمهور:' : 'Audience:'}</strong> {formatAudience(autoAnnouncement.target_audience)}</p>
                          <p><strong>{language === 'ar' ? 'الجدولة:' : 'Schedule:'}</strong> {
                            autoAnnouncement.schedule_type === 'date_range' 
                              ? (language === 'ar' ? 'نطاق تاريخ' : 'Date Range')
                              : (language === 'ar' ? 'أيام محددة' : 'Specific Days')
                          }</p>
                          {autoAnnouncement.schedule_type === 'date_range' ? (
                            <p><strong>{language === 'ar' ? 'الفترة:' : 'Period:'}</strong> {autoAnnouncement.start_date} → {autoAnnouncement.end_date}</p>
                          ) : (
                            <p><strong>{language === 'ar' ? 'الأيام:' : 'Days:'}</strong> {autoAnnouncement.send_days?.join(', ')}</p>
                          )}
                          <p><strong>{language === 'ar' ? 'الوقت:' : 'Time:'}</strong> {autoAnnouncement.send_time}</p>
                          <p><strong>{language === 'ar' ? 'الإشعارات:' : 'Notifications:'}</strong> {autoAnnouncement.send_notification ? '✅' : '❌'}</p>
                        </div>
                        
                        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            <strong>{language === 'ar' ? 'الرسالة:' : 'Message:'}</strong>
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{autoAnnouncement.message}</p>
                        </div>
                        
                        <div className="mt-3 text-xs text-gray-500">
                          {language === 'ar' ? 'تم الإنشاء:' : 'Created:'} {new Date(autoAnnouncement.created_at).toLocaleDateString()}
                          {autoAnnouncement.last_sent_at && (
                            <span className="ml-4">
                              {language === 'ar' ? 'آخر إرسال:' : 'Last sent:'} {new Date(autoAnnouncement.last_sent_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {deletingId === autoAnnouncement.id && deletingType === 'auto' ? (
                        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">
                          <span className="text-sm text-red-600 dark:text-red-400">
                            {language === 'ar' ? 'تأكيد الحذف؟' : 'Delete?'}
                          </span>
                          <button onClick={confirmDeleteAutoAnnouncement} className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg">
                            {language === 'ar' ? 'نعم' : 'Yes'}
                          </button>
                          <button onClick={cancelDelete} className="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg">
                            {language === 'ar' ? 'لا' : 'No'}
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button onClick={() => handleEditAutoAnnouncement(autoAnnouncement)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl text-gray-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button onClick={() => handleDeleteAutoAnnouncement(autoAnnouncement.id)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl text-red-500">
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
            )}

            {/* Empty State */}
            {autoAnnouncements.length === 0 && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-gray-500">{language === 'ar' ? 'لم يتم إعداد إعلانات تلقائية بعد' : 'No automatic announcements configured yet'}</p>
              </div>
            )}
          </GlassCard>
        </>
      )}
    </div>
  )
}
