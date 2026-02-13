import { useState, useEffect } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import api from '../../services/api'

const AudienceSelector = ({ value, onChange }) => {
  const { language } = useLanguage()
  const [audienceData, setAudienceData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedBranches, setExpandedBranches] = useState({})
  const [expandedRoles, setExpandedRoles] = useState({})

  // Selection state
  const [selectionType, setSelectionType] = useState(value?.type || 'all')
  const [selectedRoles, setSelectedRoles] = useState(value?.roles || [])
  const [selectedBranchRoles, setSelectedBranchRoles] = useState(value?.branches || {})
  const [selectedUsers, setSelectedUsers] = useState(value?.users || [])

  const roleLabels = {
    branch_admin: { en: 'Branch Admins', ar: 'مديرو الفروع' },
    coach: { en: 'Coaches', ar: 'المدربون' },
    accountant: { en: 'Accountants', ar: 'المحاسبون' },
    parent: { en: 'Parents', ar: 'أولياء الأمور' },
    player: { en: 'Players', ar: 'اللاعبون' }
  }

  useEffect(() => {
    fetchAudienceData()
  }, [searchQuery])

  useEffect(() => {
    // Update parent with selection changes
    const audienceValue = {
      type: selectionType,
      roles: selectionType === 'roles' ? selectedRoles : [],
      branches: selectionType === 'specific' ? selectedBranchRoles : {},
      users: selectedUsers
    }
    onChange(audienceValue)
  }, [selectionType, selectedRoles, selectedBranchRoles, selectedUsers])

  const fetchAudienceData = async () => {
    try {
      setLoading(true)
      console.log('🔍 Fetching audience data...')
      const response = await api.get('/users/audience-tree', {
        params: { search: searchQuery || undefined }
      })
      console.log('📥 Audience data response:', response.data)
      // Handle both wrapped {success, data} and direct data formats
      const data = response.data?.data || response.data
      if (data && (data.branches || data.roleGroups)) {
        setAudienceData(data)
        console.log('✅ Audience data set:', data)
      } else {
        console.error('❌ Invalid data format:', response.data)
      }
    } catch (error) {
      console.error('❌ Error fetching audience data:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleBranch = (branchId) => {
    setExpandedBranches(prev => ({
      ...prev,
      [branchId]: !prev[branchId]
    }))
  }

  const toggleRoleInBranch = (branchId, role) => {
    setExpandedRoles(prev => ({
      ...prev,
      [`${branchId}-${role}`]: !prev[`${branchId}-${role}`]
    }))
  }

  const handleRoleToggle = (role) => {
    setSelectedRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    )
  }

  const handleBranchRoleToggle = (branchId, role) => {
    setSelectedBranchRoles(prev => {
      const branchData = prev[branchId] || { roles: [], users: [] }
      const roles = branchData.roles || []
      const newRoles = roles.includes(role)
        ? roles.filter(r => r !== role)
        : [...roles, role]
      
      return {
        ...prev,
        [branchId]: { ...branchData, roles: newRoles }
      }
    })
  }

  const handleUserToggle = (branchId, userId, isPlayer = false) => {
    if (branchId) {
      setSelectedBranchRoles(prev => {
        const branchData = prev[branchId] || { roles: [], users: [] }
        const users = branchData.users || []
        const newUsers = users.includes(userId)
          ? users.filter(u => u !== userId)
          : [...users, userId]
        
        return {
          ...prev,
          [branchId]: { ...branchData, users: newUsers }
        }
      })
    } else {
      setSelectedUsers(prev => 
        prev.includes(userId)
          ? prev.filter(u => u !== userId)
          : [...prev, userId]
      )
    }
  }

  const isUserSelected = (branchId, userId) => {
    if (branchId) {
      return selectedBranchRoles[branchId]?.users?.includes(userId) || false
    }
    return selectedUsers.includes(userId)
  }

  const isBranchRoleSelected = (branchId, role) => {
    return selectedBranchRoles[branchId]?.roles?.includes(role) || false
  }

  const getSelectionSummary = () => {
    if (selectionType === 'all') {
      return language === 'ar' ? 'جميع المستخدمين' : 'All Users'
    }
    if (selectionType === 'roles') {
      if (selectedRoles.length === 0) {
        return language === 'ar' ? 'اختر الفئات' : 'Select roles'
      }
      return selectedRoles.map(r => roleLabels[r]?.[language] || r).join(', ')
    }
    if (selectionType === 'specific') {
      const branchCount = Object.keys(selectedBranchRoles).filter(b => 
        selectedBranchRoles[b]?.roles?.length > 0 || selectedBranchRoles[b]?.users?.length > 0
      ).length
      const userCount = Object.values(selectedBranchRoles).reduce((acc, b) => acc + (b.users?.length || 0), 0)
      if (branchCount === 0 && userCount === 0) {
        return language === 'ar' ? 'اختر من الفروع' : 'Select from branches'
      }
      return language === 'ar' 
        ? `${branchCount} فرع، ${userCount} مستخدم`
        : `${branchCount} branches, ${userCount} users`
    }
    return ''
  }

  if (loading && !audienceData) {
    return (
      <div className="p-4 text-center text-gray-500">
        {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Selection Type Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 dark:bg-white/5 rounded-xl">
        <button
          type="button"
          onClick={() => setSelectionType('all')}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            selectionType === 'all'
              ? 'bg-white dark:bg-white/10 text-purple-600 dark:text-purple-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          {language === 'ar' ? 'الكل' : 'All'}
        </button>
        <button
          type="button"
          onClick={() => setSelectionType('roles')}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            selectionType === 'roles'
              ? 'bg-white dark:bg-white/10 text-purple-600 dark:text-purple-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          {language === 'ar' ? 'حسب الفئة' : 'By Role'}
        </button>
        <button
          type="button"
          onClick={() => setSelectionType('specific')}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            selectionType === 'specific'
              ? 'bg-white dark:bg-white/10 text-purple-600 dark:text-purple-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          {language === 'ar' ? 'حسب الفرع' : 'By Branch'}
        </button>
      </div>

      {/* Selection Summary */}
      <div className="px-3 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-sm text-purple-700 dark:text-purple-300">
        {getSelectionSummary()}
      </div>

      {/* Search Bar */}
      {selectionType !== 'all' && (
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'ar' ? 'ابحث عن مستخدم...' : 'Search users...'}
            className="w-full px-4 py-2.5 pl-10 rtl:pl-4 rtl:pr-10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <svg className="w-5 h-5 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      )}

      {/* Search Results - Show matching users directly when searching */}
      {searchQuery && audienceData && selectionType !== 'all' && (
        <div className="space-y-3 max-h-96 overflow-y-auto border border-purple-200 dark:border-purple-700 rounded-xl p-3 bg-purple-50/50 dark:bg-purple-900/10">
          <div className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">
            {language === 'ar' ? 'نتائج البحث:' : 'Search Results:'}
          </div>
          {Object.entries(roleLabels).map(([role, labels]) => {
            const roleUsers = audienceData.roleGroups?.[role] || [];
            if (roleUsers.length === 0) return null;
            return (
              <div key={role} className="space-y-1">
                <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  {labels[language]} ({roleUsers.length})
                </div>
                {roleUsers.map(user => (
                  <label
                    key={user.id}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${
                      isUserSelected(null, user.id)
                        ? 'bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-600'
                        : 'bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isUserSelected(null, user.id)}
                      onChange={() => handleUserToggle(null, user.id, user.isPlayer)}
                      className="w-4 h-4 text-purple-500 rounded focus:ring-purple-500"
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
                ))}
              </div>
            );
          })}
          {Object.entries(roleLabels).every(([role]) => (audienceData.roleGroups?.[role] || []).length === 0) && (
            <div className="text-center text-gray-500 py-4">
              {language === 'ar' ? 'لا توجد نتائج' : 'No results found'}
            </div>
          )}
        </div>
      )}

      {/* All Users Option */}
      {selectionType === 'all' && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl text-center">
          <div className="text-green-600 dark:text-green-400 font-medium mb-1">
            {language === 'ar' ? 'سيتم إرسال الإعلان للجميع' : 'Announcement will be sent to everyone'}
          </div>
          <div className="text-sm text-green-500 dark:text-green-500">
            {audienceData && (
              <>
                {audienceData.roleCounts.branch_admin + audienceData.roleCounts.coach + 
                 audienceData.roleCounts.accountant + audienceData.roleCounts.parent + 
                 audienceData.roleCounts.player} {language === 'ar' ? 'مستخدم' : 'users'}
              </>
            )}
          </div>
        </div>
      )}

      {/* By Role Selection */}
      {selectionType === 'roles' && audienceData && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {Object.entries(roleLabels).map(([role, labels]) => (
            <label
              key={role}
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                selectedRoles.includes(role)
                  ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700'
                  : 'bg-gray-50 dark:bg-white/5 border border-transparent hover:bg-gray-100 dark:hover:bg-white/10'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedRoles.includes(role)}
                onChange={() => handleRoleToggle(role)}
                className="w-5 h-5 text-purple-500 rounded focus:ring-purple-500"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-800 dark:text-white">
                  {labels[language]}
                </div>
                <div className="text-sm text-gray-500">
                  {audienceData.roleCounts[role]} {language === 'ar' ? 'مستخدم' : 'users'}
                </div>
              </div>
            </label>
          ))}
        </div>
      )}

      {/* By Branch Selection */}
      {selectionType === 'specific' && audienceData && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {audienceData.branches.map((branch) => (
            <div key={branch.id} className="border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden">
              {/* Branch Header */}
              <button
                type="button"
                onClick={() => toggleBranch(branch.id)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10"
              >
                <div className="flex items-center gap-2">
                  <svg className={`w-4 h-4 transition-transform ${expandedBranches[branch.id] ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="font-medium text-gray-800 dark:text-white">
                    {language === 'ar' ? branch.name_ar || branch.name : branch.name}
                  </span>
                </div>
                <span className="text-sm text-gray-500">
                  {Object.values(branch.groups).reduce((acc, g) => acc + g.length, 0)} {language === 'ar' ? 'مستخدم' : 'users'}
                </span>
              </button>

              {/* Branch Content */}
              {expandedBranches[branch.id] && (
                <div className="p-2 space-y-1">
                  {Object.entries(branch.groups).map(([role, users]) => (
                    users.length > 0 && (
                      <div key={role} className="ml-4 rtl:ml-0 rtl:mr-4">
                        {/* Role Group Header */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleRoleInBranch(branch.id, role)}
                            className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
                          >
                            <svg className={`w-3 h-3 transition-transform ${expandedRoles[`${branch.id}-${role}`] ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                          <label className="flex items-center gap-2 cursor-pointer flex-1 py-1">
                            <input
                              type="checkbox"
                              checked={isBranchRoleSelected(branch.id, role)}
                              onChange={() => handleBranchRoleToggle(branch.id, role)}
                              className="w-4 h-4 text-purple-500 rounded focus:ring-purple-500"
                            />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {roleLabels[role]?.[language]} ({users.length})
                            </span>
                          </label>
                        </div>

                        {/* Individual Users */}
                        {expandedRoles[`${branch.id}-${role}`] && (
                          <div className="ml-6 rtl:ml-0 rtl:mr-6 mt-1 space-y-1">
                            {users.map((user) => (
                              <label
                                key={user.id}
                                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-sm ${
                                  isUserSelected(branch.id, user.id)
                                    ? 'bg-purple-50 dark:bg-purple-900/20'
                                    : 'hover:bg-gray-50 dark:hover:bg-white/5'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isUserSelected(branch.id, user.id)}
                                  onChange={() => handleUserToggle(branch.id, user.id, user.isPlayer)}
                                  className="w-4 h-4 text-purple-500 rounded focus:ring-purple-500"
                                />
                                <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium">
                                  {user.avatar ? (
                                    <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                                  ) : (
                                    user.name?.charAt(0) || '?'
                                  )}
                                </div>
                                <span className="text-gray-700 dark:text-gray-300">
                                  {language === 'ar' ? user.name_ar || user.name : user.name}
                                </span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AudienceSelector
