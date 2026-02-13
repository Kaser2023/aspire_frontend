import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { useAuth } from '../../hooks/useAuth'
import { playersService, usersService } from '../../services'
import branchAnnouncementsService from '../../services/branchAnnouncements.service'
import automaticAnnouncementsService from '../../services/automaticAnnouncements.service'
import GlassCard from '../../components/ui/GlassCard'
import Button from '../../components/ui/Button'

// By Name Selector - Shows expandable groups for Coaches, Parents, Players
function ByNameSelector({ language, allUsers, roleCounts, selectedUsers, onUserToggle }) {
  const [expandedGroups, setExpandedGroups] = useState({})
  const [searchQuery, setSearchQuery] = useState('')

  const groups = [
    { id: 'coach', label: { en: 'Coaches', ar: 'المدربون' }, count: roleCounts.coach || 0 },
    { id: 'parent', label: { en: 'Parents', ar: 'أولياء الأمور' }, count: roleCounts.parent || 0 },
    { id: 'player', label: { en: 'Players', ar: 'اللاعبون' }, count: roleCounts.player || 0 },
  ]

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }))
  }

  const getUsersByRole = (role) => {
    return allUsers.filter(u => u.role === role)
  }

  const getFilteredUsers = (role) => {
    const users = getUsersByRole(role)
    if (!searchQuery.trim()) return users
    return users.filter(u => 
      (u.name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.name_ar?.includes(searchQuery)) ||
      (u.email?.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  }

  return (
    <div className="space-y-3">
      {/* Search Bar */}
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

      {/* Selected Users Tags */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedUsers.map(userId => {
            const user = allUsers.find(u => u.id === userId)
            if (!user) return null
            return (
              <span key={userId} className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm">
                {language === 'ar' && user.name_ar ? user.name_ar : user.name}
                <button type="button" onClick={() => onUserToggle(userId)} className="hover:text-indigo-900 dark:hover:text-indigo-100">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )
          })}
        </div>
      )}

      {/* Expandable Groups */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {groups.map(group => {
          const filteredUsers = getFilteredUsers(group.id)
          const isExpanded = expandedGroups[group.id]
          
          return (
            <div key={group.id} className="border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden">
              {/* Group Header */}
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10"
              >
                <div className="flex items-center gap-2">
                  <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="font-medium text-gray-800 dark:text-white">
                    {group.label[language]}
                  </span>
                </div>
                <span className="text-sm text-gray-500">
                  {filteredUsers.length} {language === 'ar' ? 'مستخدم' : 'users'}
                </span>
              </button>

              {/* Group Users */}
              {isExpanded && (
                <div className="p-2 space-y-1 bg-white dark:bg-transparent">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map(user => (
                      <label
                        key={user.id}
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
                          {user.email && (
                            <div className="text-xs text-gray-500 truncate">{user.email}</div>
                          )}
                        </div>
                      </label>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-3 text-sm">
                      {language === 'ar' ? 'لا توجد نتائج' : 'No results'}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Branch-specific Audience Selector Component - matches Super Admin UI
function BranchAudienceSelector({ value, onChange, language, roleCounts = {}, allUsers = [] }) {
  const [selectionType, setSelectionType] = useState(value?.type || 'all')
  const [selectedRoles, setSelectedRoles] = useState(value?.roles || [])
  const [selectedUsers, setSelectedUsers] = useState(value?.users || [])

  const roleOptions = [
    { id: 'coach', label: { en: 'Coaches', ar: 'المدربون' } },
    { id: 'parent', label: { en: 'Parents', ar: 'أولياء الأمور' } },
    { id: 'player', label: { en: 'Players', ar: 'اللاعبون' } },
  ]

  useEffect(() => {
    const audienceValue = {
      type: selectionType,
      roles: selectionType === 'roles' ? selectedRoles : ['parent', 'coach', 'player'],
      users: selectionType === 'users' ? selectedUsers : []
    }
    onChange(audienceValue)
  }, [selectionType, selectedRoles, selectedUsers])

  const handleRoleToggle = (role) => {
    setSelectedRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    )
  }

  const handleUserToggle = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(u => u !== userId)
        : [...prev, userId]
    )
  }

  const getTotalUsers = () => {
    return (roleCounts.coach || 0) + (roleCounts.parent || 0) + (roleCounts.player || 0)
  }

  const getSelectedCount = () => {
    if (selectionType === 'all') return getTotalUsers()
    if (selectionType === 'users') return selectedUsers.length
    return selectedRoles.reduce((acc, role) => acc + (roleCounts[role] || 0), 0)
  }

  const getSelectionSummary = () => {
    if (selectionType === 'all') {
      return language === 'ar' ? 'جميع المستخدمين' : 'All Users'
    }
    if (selectionType === 'roles') {
      if (selectedRoles.length === 0) {
        return language === 'ar' ? 'اختر الفئات' : 'Select roles'
      }
      return selectedRoles.map(r => roleOptions.find(o => o.id === r)?.label[language]).join(', ')
    }
    if (selectionType === 'users') {
      if (selectedUsers.length === 0) {
        return language === 'ar' ? 'ابحث واختر المستخدمين' : 'Search and select users'
      }
      return `${selectedUsers.length} ${language === 'ar' ? 'مستخدم محدد' : 'users selected'}`
    }
    return ''
  }

  return (
    <div className="space-y-4">
      {/* Selection Type Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 dark:bg-white/5 rounded-xl">
        <button
          type="button"
          onClick={() => { setSelectionType('all'); setSelectedRoles([]); setSelectedUsers([]); }}
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
          onClick={() => { setSelectionType('roles'); setSelectedUsers([]); }}
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
          onClick={() => { setSelectionType('users'); setSelectedRoles([]); }}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            selectionType === 'users'
              ? 'bg-white dark:bg-white/10 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          {language === 'ar' ? 'بالاسم' : 'By Name'}
        </button>
      </div>

      {/* Selection Summary */}
      <div className="text-sm text-right text-indigo-600 dark:text-indigo-400">
        {getSelectionSummary()}
      </div>

      {/* All Users Option */}
      {selectionType === 'all' && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl text-center">
          <div className="text-green-600 dark:text-green-400 font-medium mb-1">
            {language === 'ar' ? 'سيتم إرسال الإعلان للجميع' : 'Announcement will be sent to everyone'}
          </div>
          <div className="text-sm text-green-500 dark:text-green-500">
            {getTotalUsers()} {language === 'ar' ? 'مستخدم' : 'users'}
          </div>
        </div>
      )}

      {/* By Role Selection */}
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
                onChange={() => handleRoleToggle(role.id)}
                className="w-5 h-5 text-indigo-500 rounded focus:ring-indigo-500"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-800 dark:text-white">
                  {role.label[language]}
                </div>
                <div className="text-sm text-gray-500">
                  {roleCounts[role.id] || 0} {language === 'ar' ? 'مستخدم' : 'users'}
                </div>
              </div>
            </label>
          ))}
        </div>
      )}

      {/* By Name Selection - Expandable Groups */}
      {selectionType === 'users' && (
        <ByNameSelector
          language={language}
          allUsers={allUsers}
          roleCounts={roleCounts}
          selectedUsers={selectedUsers}
          onUserToggle={handleUserToggle}
        />
      )}

      {/* Total Selected Summary */}
      {selectionType === 'roles' && selectedRoles.length > 0 && (
        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-center">
          <div className="text-indigo-600 dark:text-indigo-400 font-medium mb-1">
            {language === 'ar' ? 'سيتم إرسال الإعلان للفئات المحددة' : 'Announcement will be sent to selected roles'}
          </div>
          <div className="text-sm text-indigo-500 dark:text-indigo-500">
            {getSelectedCount()} {language === 'ar' ? 'مستخدم' : 'users'}
          </div>
        </div>
      )}

      {selectionType === 'users' && selectedUsers.length > 0 && (
        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-center">
          <div className="text-indigo-600 dark:text-indigo-400 font-medium mb-1">
            {language === 'ar' ? 'سيتم إرسال الإعلان للمستخدمين المحددين' : 'Announcement will be sent to selected users'}
          </div>
          <div className="text-sm text-indigo-500 dark:text-indigo-500">
            {selectedUsers.length} {language === 'ar' ? 'مستخدم' : 'users'}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Announcements() {
  const { language } = useLanguage()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('manual')
  const [announcements, setAnnouncements] = useState([])
  const [autoAnnouncements, setAutoAnnouncements] = useState([])
  const [isCreating, setIsCreating] = useState(false)
  const [isCreatingAuto, setIsCreatingAuto] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState(null)
  const [editingAutoAnnouncement, setEditingAutoAnnouncement] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [deletingType, setDeletingType] = useState(null)
  const [roleCounts, setRoleCounts] = useState({ coach: 0, parent: 0, player: 0 })
  const [allUsers, setAllUsers] = useState([])
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    targetAudience: { type: 'all', roles: [], users: [] }
  })
  const [newAutoAnnouncement, setNewAutoAnnouncement] = useState({
    name: '',
    targetAudience: { type: 'all', roles: [], users: [] },
    scheduleType: 'date_range',
    startDate: '',
    endDate: '',
    sendDays: [],
    sendTime: '',
    message: '',
    sendNotification: true
  })

  const fetchAnnouncements = useCallback(async () => {
    if (!user?.branch_id) return
    try {
      setLoading(true)
      // Fetch announcements and role counts in parallel
      const [announcementsRes, playersRes, coachesRes, parentsRes] = await Promise.all([
        branchAnnouncementsService.getAll({ limit: 200 }),
        playersService.getAll({ branch_id: user.branch_id, limit: 500 }),
        usersService.getByRole('coach', { branch_id: user.branch_id, limit: 100 }),
        usersService.getByRole('parent', { branch_id: user.branch_id, limit: 500 })
      ])
      
      if (announcementsRes.success) {
        // Show all announcements for this branch
        setAnnouncements(announcementsRes.data || [])
      }
      
      // Set role counts
      const coaches = coachesRes.success ? (coachesRes.data || []) : []
      const parents = parentsRes.success ? (parentsRes.data || []) : []
      const players = playersRes.success ? (playersRes.data || []) : []
      
      setRoleCounts({
        coach: coaches.length,
        parent: parents.length,
        player: players.length
      })
      
      // Build allUsers list for search - normalize name fields for display
      const usersList = [
        ...coaches.map(c => ({ 
          id: c.id, 
          name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email || 'Unknown',
          name_ar: c.name_ar || `${c.first_name || ''} ${c.last_name || ''}`.trim(),
          email: c.email, 
          role: 'coach' 
        })),
        ...parents.map(p => ({ 
          id: p.id, 
          name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.phone || 'Unknown',
          name_ar: p.name_ar || `${p.first_name || ''} ${p.last_name || ''}`.trim(),
          email: p.email, 
          role: 'parent' 
        })),
        ...players.map(p => ({ 
          id: p.id, 
          name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.name || 'Unknown',
          name_ar: `${p.first_name_ar || ''} ${p.last_name_ar || ''}`.trim() || p.name_ar,
          email: p.email, 
          role: 'player',
          parent_id: p.parent_id,
          self_user_id: p.self_user_id
        }))
      ]
      setAllUsers(usersList)
    } catch (err) {
      console.error('Error fetching announcements:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.branch_id, user?.id])

  useEffect(() => {
    fetchAnnouncements()
  }, [fetchAnnouncements])

  const fetchAutoAnnouncements = useCallback(async () => {
    if (!user?.branch_id) return
    try {
      const response = await automaticAnnouncementsService.getAll({ limit: 100 })
      if (response.success) {
        setAutoAnnouncements(response.data || [])
      }
    } catch (err) {
      console.error('Error fetching automatic announcements:', err)
    }
  }, [user?.branch_id])

  useEffect(() => {
    fetchAutoAnnouncements()
  }, [fetchAutoAnnouncements])

  const handlePublish = async () => {
    if (!newAnnouncement.title || !newAnnouncement.content) return
    
    // Validate selection
    if (newAnnouncement.targetAudience.type === 'roles' && newAnnouncement.targetAudience.roles.length === 0) {
      return
    }
    if (newAnnouncement.targetAudience.type === 'users' && newAnnouncement.targetAudience.users.length === 0) {
      return
    }
    
    try {
      // Convert audience selection to backend format
      let targetAudience = 'all'
      if (newAnnouncement.targetAudience.type === 'roles') {
        const roles = newAnnouncement.targetAudience.roles
        if (roles.length === 1) {
          if (roles[0] === 'parent') targetAudience = 'parents'
          else if (roles[0] === 'coach') targetAudience = 'coaches'
          else if (roles[0] === 'player') targetAudience = 'players'
        } else if (roles.length > 1) {
          // Send the actual selected roles to the backend
          targetAudience = JSON.stringify({
            type: 'roles',
            roles: roles
          })
        }
      } else if (newAnnouncement.targetAudience.type === 'users') {
        // Resolve player IDs to User IDs (parent_id / self_user_id)
        const resolvedUserIds = new Set()
        newAnnouncement.targetAudience.users.forEach(selectedId => {
          const userEntry = allUsers.find(u => u.id === selectedId)
          if (userEntry?.role === 'player') {
            // For players, notify their parent (always has a User account)
            if (userEntry.parent_id) resolvedUserIds.add(userEntry.parent_id)
            // Also notify the player's own account if they have one
            if (userEntry.self_user_id) resolvedUserIds.add(userEntry.self_user_id)
          } else {
            // For coaches/parents, their id IS their User ID
            resolvedUserIds.add(selectedId)
          }
        })
        targetAudience = JSON.stringify({
          type: 'users',
          users: [...resolvedUserIds]
        })
      }

      const response = await branchAnnouncementsService.create({
        title: newAnnouncement.title,
        content: newAnnouncement.content,
        target_audience: targetAudience
      })
      
      if (response.success) {
        setNewAnnouncement({ title: '', content: '', targetAudience: { type: 'all', roles: [], users: [] } })
        setIsCreating(false)
        fetchAnnouncements()
      }
    } catch (err) {
      console.error('Error creating announcement:', err)
    }
  }

  const handleDeleteAnnouncement = (id) => setDeletingId(id)
  const cancelDelete = () => setDeletingId(null)

  const confirmDeleteAnnouncement = async () => {
    if (!deletingId) return
    try {
      await branchAnnouncementsService.delete(deletingId)
      setDeletingId(null)
      fetchAnnouncements()
    } catch (err) {
      console.error('Error deleting announcement:', err)
    }
  }

  const handleDeleteAutoAnnouncement = (id) => {
    setDeletingId(id)
    setDeletingType('auto')
  }

  const confirmDeleteAutoAnnouncement = async () => {
    if (!deletingId) return
    try {
      await automaticAnnouncementsService.delete(deletingId)
      setDeletingId(null)
      setDeletingType(null)
      fetchAutoAnnouncements()
    } catch (err) {
      console.error('Error deleting automatic announcement:', err)
    }
  }

  const handleEditAnnouncement = (announcement) => {
    setEditingAnnouncement(announcement.id)
    // Extract audience from existing announcement
    let audienceType = 'all'
    let roles = []
    if (announcement.target_audience?.roles) {
      const allRoles = ['parent', 'coach', 'player']
      const hasAllRoles = allRoles.every(r => announcement.target_audience.roles.includes(r))
      if (hasAllRoles) {
        audienceType = 'all'
      } else {
        audienceType = 'roles'
        roles = announcement.target_audience.roles
      }
    }
    setNewAnnouncement({
      title: announcement.title || '',
      content: announcement.content || '',
      targetAudience: { type: audienceType, roles }
    })
    setIsCreating(true)
  }

  const handleEditAutoAnnouncement = (autoAnnouncement) => {
    setEditingAutoAnnouncement(autoAnnouncement.id)
    setNewAutoAnnouncement({
      name: autoAnnouncement.name || '',
      targetAudience: autoAnnouncement.target_audience || { type: 'all', roles: [], users: [] },
      scheduleType: autoAnnouncement.schedule_type || 'date_range',
      startDate: autoAnnouncement.start_date || '',
      endDate: autoAnnouncement.end_date || '',
      sendDays: autoAnnouncement.send_days || [],
      sendTime: autoAnnouncement.send_time || '',
      message: autoAnnouncement.message || '',
      sendNotification: autoAnnouncement.send_notification !== false
    })
    setIsCreatingAuto(true)
    setActiveTab('automatic')
  }

  const handleSaveAnnouncement = async () => {
    if (!editingAnnouncement) return
    
    // Validate roles selection
    if (newAnnouncement.targetAudience.type === 'roles' && newAnnouncement.targetAudience.roles.length === 0) {
      return
    }
    
    try {
      // Convert audience selection to backend format
      let targetAudience = 'all'
      if (newAnnouncement.targetAudience.type === 'roles') {
        const roles = newAnnouncement.targetAudience.roles
        if (roles.length === 1) {
          if (roles[0] === 'parent') targetAudience = 'parents'
          else if (roles[0] === 'coach') targetAudience = 'coaches'
          else if (roles[0] === 'player') targetAudience = 'players'
        } else if (roles.length > 1) {
          targetAudience = JSON.stringify({
            type: 'roles',
            roles: roles
          })
        }
      } else if (newAnnouncement.targetAudience.type === 'users') {
        // Resolve player IDs to User IDs (parent_id / self_user_id)
        const resolvedUserIds = new Set()
        newAnnouncement.targetAudience.users.forEach(selectedId => {
          const userEntry = allUsers.find(u => u.id === selectedId)
          if (userEntry?.role === 'player') {
            if (userEntry.parent_id) resolvedUserIds.add(userEntry.parent_id)
            if (userEntry.self_user_id) resolvedUserIds.add(userEntry.self_user_id)
          } else {
            resolvedUserIds.add(selectedId)
          }
        })
        targetAudience = JSON.stringify({
          type: 'users',
          users: [...resolvedUserIds]
        })
      }

      await branchAnnouncementsService.update(editingAnnouncement, {
        title: newAnnouncement.title,
        content: newAnnouncement.content,
        target_audience: targetAudience
      })
      setEditingAnnouncement(null)
      setNewAnnouncement({ title: '', content: '', targetAudience: { type: 'all', roles: [], users: [] } })
      setIsCreating(false)
      fetchAnnouncements()
    } catch (err) {
      console.error('Error updating announcement:', err)
    }
  }

  // Helper to resolve audience for auto announcements (resolves player IDs to User IDs)
  const resolveAutoAudience = (audience) => {
    if (!audience || audience.type === 'all') return audience
    if (audience.type === 'users' && Array.isArray(audience.users) && audience.users.length > 0) {
      const resolvedUserIds = new Set()
      audience.users.forEach(selectedId => {
        const userEntry = allUsers.find(u => u.id === selectedId)
        if (userEntry?.role === 'player') {
          if (userEntry.parent_id) resolvedUserIds.add(userEntry.parent_id)
          if (userEntry.self_user_id) resolvedUserIds.add(userEntry.self_user_id)
        } else {
          resolvedUserIds.add(selectedId)
        }
      })
      return { ...audience, users: [...resolvedUserIds] }
    }
    return audience
  }

  const handleCreateAuto = async () => {
    if (!newAutoAnnouncement.name || !newAutoAnnouncement.message || !newAutoAnnouncement.sendTime) return
    if (newAutoAnnouncement.scheduleType === 'date_range' && (!newAutoAnnouncement.startDate || !newAutoAnnouncement.endDate)) return
    if (newAutoAnnouncement.scheduleType === 'specific_days' && newAutoAnnouncement.sendDays.length === 0) return

    try {
      const resolvedAudience = resolveAutoAudience(newAutoAnnouncement.targetAudience)
      const response = await automaticAnnouncementsService.create({
        name: newAutoAnnouncement.name,
        target_audience: resolvedAudience,
        schedule_type: newAutoAnnouncement.scheduleType,
        start_date: newAutoAnnouncement.scheduleType === 'date_range' ? newAutoAnnouncement.startDate : null,
        end_date: newAutoAnnouncement.scheduleType === 'date_range' ? newAutoAnnouncement.endDate : null,
        send_days: newAutoAnnouncement.scheduleType === 'specific_days' ? newAutoAnnouncement.sendDays : null,
        send_time: newAutoAnnouncement.sendTime,
        message: newAutoAnnouncement.message,
        send_notification: newAutoAnnouncement.sendNotification
      })

      if (response.success) {
        setNewAutoAnnouncement({
          name: '',
          targetAudience: { type: 'all', roles: [], users: [] },
          scheduleType: 'date_range',
          startDate: '',
          endDate: '',
          sendDays: [],
          sendTime: '',
          message: '',
          sendNotification: true
        })
        setIsCreatingAuto(false)
        fetchAutoAnnouncements()
      }
    } catch (err) {
      console.error('Error creating automatic announcement:', err)
    }
  }

  const handleSaveAutoAnnouncement = async () => {
    if (!editingAutoAnnouncement) return
    if (newAutoAnnouncement.scheduleType === 'date_range' && (!newAutoAnnouncement.startDate || !newAutoAnnouncement.endDate)) return
    if (newAutoAnnouncement.scheduleType === 'specific_days' && newAutoAnnouncement.sendDays.length === 0) return

    try {
      const resolvedAudience = resolveAutoAudience(newAutoAnnouncement.targetAudience)
      await automaticAnnouncementsService.update(editingAutoAnnouncement, {
        name: newAutoAnnouncement.name,
        target_audience: resolvedAudience,
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
        name: '',
        targetAudience: { type: 'all', roles: [], users: [] },
        scheduleType: 'date_range',
        startDate: '',
        endDate: '',
        sendDays: [],
        sendTime: '',
        message: '',
        sendNotification: true
      })
      setIsCreatingAuto(false)
      fetchAutoAnnouncements()
    } catch (err) {
      console.error('Error updating automatic announcement:', err)
    }
  }

  const formatAudience = (audience) => {
    if (!audience) return language === 'ar' ? 'الجميع' : 'All'
    
    // Handle string format from backend
    if (typeof audience === 'string') {
      const labels = {
        all: language === 'ar' ? 'الجميع' : 'All',
        parents: language === 'ar' ? 'أولياء الأمور' : 'Parents',
        coaches: language === 'ar' ? 'المدربون' : 'Coaches',
        players: language === 'ar' ? 'اللاعبون' : 'Players',
        staff: language === 'ar' ? 'الموظفين' : 'Staff',
        specific_users: language === 'ar' ? 'مستخدمين محددين' : 'Specific Users'
      }
      // Try to parse JSON for specific users
      try {
        const parsed = JSON.parse(audience)
        if (parsed.type === 'users') {
          return `${parsed.users?.length || 0} ${language === 'ar' ? 'مستخدم محدد' : 'specific users'}`
        }
      } catch (e) {
        // Not JSON, use as string key
      }
      return labels[audience] || audience
    }
    
    // Handle object format
    const roleLabels = {
      coach: language === 'ar' ? 'المدربون' : 'Coaches',
      parent: language === 'ar' ? 'أولياء الأمور' : 'Parents',
      player: language === 'ar' ? 'اللاعبون' : 'Players'
    }

    // Handle { type: 'specific', branches: {...}, users: [...] } format (automatic announcements)
    if (audience.type === 'specific') {
      const allRoles = []
      const branches = audience.branches || {}
      Object.values(branches).forEach(branchData => {
        (branchData.roles || []).forEach(role => {
          if (!allRoles.includes(role)) allRoles.push(role)
        })
      })
      const specificUsers = audience.users || []
      
      if (allRoles.length > 0 && specificUsers.length > 0) {
        const rolesText = allRoles.map(r => roleLabels[r] || r).join(', ')
        return `${rolesText} + ${specificUsers.length} ${language === 'ar' ? 'مستخدم' : 'users'}`
      }
      if (allRoles.length > 0) {
        return allRoles.map(r => roleLabels[r] || r).join(', ')
      }
      if (specificUsers.length > 0) {
        return `${specificUsers.length} ${language === 'ar' ? 'مستخدم محدد' : 'specific users'}`
      }
    }

    // Handle { type: 'roles', roles: [...] } format
    if (audience.roles?.length > 0) {
      return audience.roles.map(r => roleLabels[r] || r).join(', ')
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-secondary dark:text-white">
            {language === 'ar' ? 'الإعلانات' : 'Announcements'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {language === 'ar' ? 'إرسال إعلانات للمدربين وأولياء الأمور واللاعبين' : 'Send announcements to coaches, parents and players'}
          </p>
        </div>
        {!isCreating && !isCreatingAuto && (
          <Button onClick={() => activeTab === 'manual' ? setIsCreating(true) : setIsCreatingAuto(true)} className="bg-indigo-500 hover:bg-indigo-600">
            <svg className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {activeTab === 'manual'
              ? (language === 'ar' ? 'إعلان جديد' : 'New Announcement')
              : (language === 'ar' ? 'إعلان تلقائي جديد' : 'New Automatic Announcement')}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => { setActiveTab('manual'); setIsCreating(false); setIsCreatingAuto(false); }}
          className={`px-4 py-2 rounded-xl font-semibold transition-all ${
            activeTab === 'manual'
              ? 'bg-indigo-500 text-white'
              : 'bg-white/50 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'
          }`}
        >
          {language === 'ar' ? 'يدوي' : 'Manual'}
        </button>
        <button
          onClick={() => { setActiveTab('automatic'); setIsCreating(false); setIsCreatingAuto(false); }}
          className={`px-4 py-2 rounded-xl font-semibold transition-all ${
            activeTab === 'automatic'
              ? 'bg-indigo-500 text-white'
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
            <button onClick={() => { setIsCreating(false); setEditingAnnouncement(null); setNewAnnouncement({ title: '', content: '', targetAudience: { type: 'all', roles: [] } }); }} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl">
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
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={language === 'ar' ? 'محتوى الإعلان' : 'Announcement content'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {language === 'ar' ? 'الجمهور المستهدف' : 'Target Audience'}
              </label>
              <BranchAudienceSelector
                value={newAnnouncement.targetAudience}
                onChange={(audience) => setNewAnnouncement({ ...newAnnouncement, targetAudience: audience })}
                language={language}
                roleCounts={roleCounts}
                allUsers={allUsers}
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={editingAnnouncement ? handleSaveAnnouncement : handlePublish} className="bg-gradient-to-r from-indigo-500 to-indigo-600">
                <svg className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={editingAnnouncement ? "M5 13l4 4L19 7" : "M12 19l9 2-9-18-9 18 9-2zm0 0v-8"} />
                </svg>
                {editingAnnouncement 
                  ? (language === 'ar' ? 'حفظ التعديلات' : 'Save Changes')
                  : (language === 'ar' ? 'نشر الإعلان' : 'Publish')
                }
              </Button>
              <button onClick={() => { setIsCreating(false); setEditingAnnouncement(null); setNewAnnouncement({ title: '', content: '', targetAudience: 'all' }); }} className="px-6 py-2 text-gray-600 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-100 dark:hover:bg-white/10">
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        </GlassCard>
      )}

      {activeTab === 'manual' ? (
        <>
          {/* Announcements List */}
          {announcements.length > 0 && (
            <>
              <div className="mb-4 text-sm text-gray-500">
                {language === 'ar' ? `عرض ${announcements.length} إعلان` : `Showing ${announcements.length} announcements`}
              </div>
              <div className="space-y-4">
                {announcements.map((announcement) => (
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
                          {announcement.is_published && (
                            <span className="flex items-center gap-1 text-green-600">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {language === 'ar' ? 'منشور' : 'Published'}
                            </span>
                          )}
                        </div>
                      </div>
                      {deletingId === announcement.id && deletingType !== 'auto' ? (
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
                          <button onClick={() => handleEditAnnouncement(announcement)} className="p-2 hover:bg-gray-100 dark:hover:bg.white/10 rounded-xl text-gray-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button onClick={() => { setDeletingType('manual'); handleDeleteAnnouncement(announcement.id) }} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl text-red-500">
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
            </>
          )}

          {/* Empty State */}
          {announcements.length === 0 && !isCreating && (
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
          {isCreatingAuto && (
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-secondary dark:text-white">
                  {editingAutoAnnouncement
                    ? (language === 'ar' ? 'تعديل الإعلان التلقائي' : 'Edit Automatic Announcement')
                    : (language === 'ar' ? 'إعلان تلقائي جديد' : 'New Automatic Announcement')}
                </h3>
                <button onClick={() => { setIsCreatingAuto(false); setEditingAutoAnnouncement(null); setNewAutoAnnouncement({ name: '', targetAudience: { type: 'all', roles: [], users: [] }, scheduleType: 'date_range', startDate: '', endDate: '', sendDays: [], sendTime: '', message: '', sendNotification: true }); }} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl">
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
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder={language === 'ar' ? 'مثال: تذكير الدفع' : 'e.g., Payment Reminder'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'ar' ? 'الجمهور المستهدف' : 'Target Audience'}
                  </label>
                  <BranchAudienceSelector
                    value={newAutoAnnouncement.targetAudience}
                    onChange={(audience) => setNewAutoAnnouncement({ ...newAutoAnnouncement, targetAudience: audience })}
                    language={language}
                    roleCounts={roleCounts}
                    allUsers={allUsers}
                  />
                </div>

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
                        className="w-4 h-4 text-indigo-500 border-gray-300 focus:ring-indigo-500"
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
                        className="w-4 h-4 text-indigo-500 border-gray-300 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {language === 'ar' ? 'أيام محددة (أسبوعياً)' : 'Specific Days (Weekly)'}
                      </span>
                    </label>
                  </div>
                </div>

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
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                )}

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
                              className="w-4 h-4 text-indigo-500 border-gray-300 rounded focus:ring-indigo-500"
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
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder={language === 'ar' ? 'اكتب رسالة الإعلان...' : 'Write announcement message...'}
                  />
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newAutoAnnouncement.sendNotification}
                      onChange={(e) => setNewAutoAnnouncement({ ...newAutoAnnouncement, sendNotification: e.target.checked })}
                      className="w-4 h-4 text-indigo-500 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {language === 'ar' ? 'إرسال إشعار' : 'Send Notification'}
                    </span>
                  </label>
                </div>

                <div className="flex gap-3">
                  <Button onClick={editingAutoAnnouncement ? handleSaveAutoAnnouncement : handleCreateAuto} className="bg-gradient-to-r from-indigo-500 to-indigo-600">
                    <svg className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={editingAutoAnnouncement ? "M5 13l4 4L19 7" : "M12 6v6m0 0v6m0-6h6m-6 0H6"} />
                    </svg>
                    {editingAutoAnnouncement
                      ? (language === 'ar' ? 'حفظ التعديلات' : 'Save Changes')
                      : (language === 'ar' ? 'إضافة إعلان تلقائي' : 'Add Automatic Announcement')}
                  </Button>
                  <button onClick={() => { setIsCreatingAuto(false); setEditingAutoAnnouncement(null); setNewAutoAnnouncement({ name: '', targetAudience: { type: 'all', roles: [], users: [] }, scheduleType: 'date_range', startDate: '', endDate: '', sendDays: [], sendTime: '', message: '', sendNotification: true }); }} className="px-6 py-2 text-gray-600 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-100 dark:hover:bg-white/10">
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              </div>
            </GlassCard>
          )}

          {/* Automatic Announcements List */}
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
                            : (language === 'ar' ? 'غير نشط' : 'Inactive')}
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
                      </div>
                      <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <strong>{language === 'ar' ? 'الرسالة:' : 'Message:'}</strong>
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{autoAnnouncement.message}</p>
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

          {autoAnnouncements.length === 0 && !isCreatingAuto && (
            <GlassCard className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-gray-500">{language === 'ar' ? 'لم يتم إعداد إعلانات تلقائية بعد' : 'No automatic announcements configured yet'}</p>
            </GlassCard>
          )}
        </>
      )}
    </div>
  )
}
