import { useState, useEffect } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import api from '../../services/api'

/**
 * Simplified audience selector for subscription reminders
 * Only shows Parents and Players (not all roles)
 */
const ParentAudienceSelector = ({ value, onChange }) => {
  const { language } = useLanguage()
  const [audienceData, setAudienceData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expandedBranches, setExpandedBranches] = useState({})
  const [expandedGroups, setExpandedGroups] = useState({})

  // Selection state
  const [selectionType, setSelectionType] = useState(value?.type || 'all')
  const [selectedBranches, setSelectedBranches] = useState(value?.branches || []) // For branch selection: [{branchId, group: 'parents'|'players'}]
  const [selectedUsers, setSelectedUsers] = useState(value?.users || [])

  useEffect(() => {
    fetchAudienceData()
  }, [])

  useEffect(() => {
    // Update parent with selection changes
    const audienceValue = {
      type: selectionType,
      branches: selectionType === 'branches' ? selectedBranches : [],
      users: selectionType === 'specific' ? selectedUsers : []
    }
    onChange(audienceValue)
  }, [selectionType, selectedBranches, selectedUsers])

  const fetchAudienceData = async () => {
    try {
      setLoading(true)
      const response = await api.get('/users/audience-tree')
      const data = response.data?.data || response.data
      if (data && data.branches) {
        // Filter to only include parents and players in each branch
        const filteredBranches = data.branches.map(branch => ({
          ...branch,
          parents: branch.groups?.parent || [],
          players: branch.groups?.player || []
        }))
        setAudienceData({
          branches: filteredBranches,
          totalParents: data.roleCounts?.parent || 0,
          totalPlayers: data.roleCounts?.player || 0
        })
      }
    } catch (error) {
      console.error('Error fetching audience data:', error)
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

  const toggleGroup = (branchId, group) => {
    setExpandedGroups(prev => ({
      ...prev,
      [`${branchId}-${group}`]: !prev[`${branchId}-${group}`]
    }))
  }

  const handleBranchGroupToggle = (branchId, group) => {
    const key = `${branchId}-${group}`
    setSelectedBranches(prev => {
      const exists = prev.some(b => b.branchId === branchId && b.group === group)
      if (exists) {
        return prev.filter(b => !(b.branchId === branchId && b.group === group))
      } else {
        return [...prev, { branchId, group }]
      }
    })
  }

  const isBranchGroupSelected = (branchId, group) => {
    return selectedBranches.some(b => b.branchId === branchId && b.group === group)
  }

  const handleUserToggle = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId)
        ? prev.filter(u => u !== userId)
        : [...prev, userId]
    )
  }

  const getSelectionSummary = () => {
    if (selectionType === 'all') {
      return language === 'ar' ? 'جميع أولياء الأمور واللاعبين' : 'All Parents & Players'
    }
    if (selectionType === 'branches') {
      if (selectedBranches.length === 0) {
        return language === 'ar' ? 'اختر من الفروع' : 'Select from branches'
      }
      const parentGroups = selectedBranches.filter(b => b.group === 'parents').length
      const playerGroups = selectedBranches.filter(b => b.group === 'players').length
      const parts = []
      if (parentGroups > 0) parts.push(language === 'ar' ? `${parentGroups} أولياء أمور` : `${parentGroups} parent group(s)`)
      if (playerGroups > 0) parts.push(language === 'ar' ? `${playerGroups} لاعبين` : `${playerGroups} player group(s)`)
      return parts.join(', ')
    }
    if (selectionType === 'specific') {
      if (selectedUsers.length === 0) {
        return language === 'ar' ? 'اختر أشخاص محددين' : 'Select specific people'
      }
      return language === 'ar' 
        ? `${selectedUsers.length} شخص محدد`
        : `${selectedUsers.length} person(s) selected`
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
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-white/5 rounded-xl">
        <button
          type="button"
          onClick={() => setSelectionType('all')}
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            selectionType === 'all'
              ? 'bg-white dark:bg-white/10 text-teal-600 dark:text-teal-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          {language === 'ar' ? 'الكل' : 'All'}
        </button>
        <button
          type="button"
          onClick={() => setSelectionType('branches')}
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            selectionType === 'branches'
              ? 'bg-white dark:bg-white/10 text-teal-600 dark:text-teal-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          {language === 'ar' ? 'كل الفرع' : 'By Branch'}
        </button>
        <button
          type="button"
          onClick={() => setSelectionType('specific')}
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            selectionType === 'specific'
              ? 'bg-white dark:bg-white/10 text-teal-600 dark:text-teal-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          {language === 'ar' ? 'محدد' : 'Specific'}
        </button>
      </div>

      {/* Selection Summary */}
      <div className="px-3 py-2 bg-teal-50 dark:bg-teal-900/20 rounded-lg text-sm text-teal-700 dark:text-teal-300">
        {getSelectionSummary()}
      </div>

      {/* All Parents & Players Option */}
      {selectionType === 'all' && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl text-center">
          <div className="text-green-600 dark:text-green-400 font-medium mb-1">
            {language === 'ar' ? 'سيتم إرسال التذكير لجميع أولياء الأمور واللاعبين' : 'Reminder will be sent to all parents & players'}
          </div>
          <div className="text-sm text-green-500 dark:text-green-500">
            {audienceData?.totalParents || 0} {language === 'ar' ? 'ولي أمر' : 'parents'} + {audienceData?.totalPlayers || 0} {language === 'ar' ? 'لاعب' : 'players'}
          </div>
        </div>
      )}

      {/* By Branch Selection */}
      {selectionType === 'branches' && audienceData && (
        <div className="space-y-3 max-h-72 overflow-y-auto">
          {audienceData.branches.map((branch) => (
            <div key={branch.id} className="border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden">
              {/* Branch Name Header */}
              <div className="px-3 py-2 bg-gray-50 dark:bg-white/5 font-medium text-gray-800 dark:text-white">
                {language === 'ar' ? branch.name_ar || branch.name : branch.name}
              </div>
              
              {/* Parents & Players Options */}
              <div className="p-2 space-y-1">
                {/* Parents Option */}
                <label
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${
                    isBranchGroupSelected(branch.id, 'parents')
                      ? 'bg-teal-50 dark:bg-teal-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isBranchGroupSelected(branch.id, 'parents')}
                    onChange={() => handleBranchGroupToggle(branch.id, 'parents')}
                    className="w-4 h-4 text-teal-500 rounded focus:ring-teal-500"
                  />
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-sm font-medium text-teal-600 dark:text-teal-400">
                      {language === 'ar' ? 'أولياء الأمور' : 'Parents'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {branch.parents?.length || 0}
                    </span>
                  </div>
                </label>

                {/* Players Option */}
                <label
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${
                    isBranchGroupSelected(branch.id, 'players')
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isBranchGroupSelected(branch.id, 'players')}
                    onChange={() => handleBranchGroupToggle(branch.id, 'players')}
                    className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      {language === 'ar' ? 'اللاعبون' : 'Players'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {branch.players?.length || 0}
                    </span>
                  </div>
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Specific Parents & Players Selection */}
      {selectionType === 'specific' && audienceData && (
        <div className="space-y-2 max-h-80 overflow-y-auto">
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
                  {(branch.parents?.length || 0) + (branch.players?.length || 0)} {language === 'ar' ? 'شخص' : 'people'}
                </span>
              </button>

              {/* Branch Content */}
              {expandedBranches[branch.id] && (
                <div className="p-2 space-y-2 bg-white dark:bg-transparent">
                  {/* Parents Group */}
                  {branch.parents && branch.parents.length > 0 && (
                    <div className="border border-gray-100 dark:border-white/5 rounded-lg">
                      <button
                        type="button"
                        onClick={() => toggleGroup(branch.id, 'parents')}
                        className="w-full flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-white/5"
                      >
                        <div className="flex items-center gap-2">
                          <svg className={`w-3 h-3 transition-transform ${expandedGroups[`${branch.id}-parents`] ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <span className="text-sm font-medium text-teal-600 dark:text-teal-400">
                            {language === 'ar' ? 'أولياء الأمور' : 'Parents'} ({branch.parents.length})
                          </span>
                        </div>
                      </button>
                      {expandedGroups[`${branch.id}-parents`] && (
                        <div className="px-2 pb-2 space-y-1">
                          {branch.parents.map((parent) => (
                            <label
                              key={parent.id}
                              className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-sm ${
                                selectedUsers.includes(parent.id)
                                  ? 'bg-teal-50 dark:bg-teal-900/20'
                                  : 'hover:bg-gray-50 dark:hover:bg-white/5'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selectedUsers.includes(parent.id)}
                                onChange={() => handleUserToggle(parent.id)}
                                className="w-4 h-4 text-teal-500 rounded focus:ring-teal-500"
                              />
                              <div className="w-7 h-7 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-xs font-medium text-teal-600 dark:text-teal-400 flex-shrink-0">
                                {parent.avatar ? (
                                  <img src={parent.avatar.startsWith('http') ? parent.avatar : `${(import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '')}${parent.avatar}`} alt="" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                  parent.name?.charAt(0) || '?'
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-gray-800 dark:text-white truncate text-sm">
                                  {language === 'ar' ? parent.name_ar || parent.name : parent.name}
                                </div>
                                {parent.phone && (
                                  <div className="text-xs text-gray-500 truncate" dir="ltr">
                                    {parent.phone}
                                  </div>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Players Group */}
                  {branch.players && branch.players.length > 0 && (
                    <div className="border border-gray-100 dark:border-white/5 rounded-lg">
                      <button
                        type="button"
                        onClick={() => toggleGroup(branch.id, 'players')}
                        className="w-full flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-white/5"
                      >
                        <div className="flex items-center gap-2">
                          <svg className={`w-3 h-3 transition-transform ${expandedGroups[`${branch.id}-players`] ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                            {language === 'ar' ? 'اللاعبون' : 'Players'} ({branch.players.length})
                          </span>
                        </div>
                      </button>
                      {expandedGroups[`${branch.id}-players`] && (
                        <div className="px-2 pb-2 space-y-1">
                          {branch.players.map((player) => {
                            // Get phone: player's phone or parent's phone
                            const phoneNumber = player.phone || player.parent_phone || player.parentPhone
                            const isParentPhone = !player.phone && (player.parent_phone || player.parentPhone)
                            
                            return (
                              <label
                                key={player.id}
                                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-sm ${
                                  selectedUsers.includes(player.id)
                                    ? 'bg-blue-50 dark:bg-blue-900/20'
                                    : 'hover:bg-gray-50 dark:hover:bg-white/5'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedUsers.includes(player.id)}
                                  onChange={() => handleUserToggle(player.id)}
                                  className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500"
                                />
                                <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-medium text-blue-600 dark:text-blue-400 flex-shrink-0">
                                  {player.avatar ? (
                                    <img src={player.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                                  ) : (
                                    player.name?.charAt(0) || '?'
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-gray-800 dark:text-white truncate text-sm">
                                    {language === 'ar' ? player.name_ar || player.name : player.name}
                                  </div>
                                  {phoneNumber && (
                                    <div className="text-xs text-gray-500 truncate" dir="ltr">
                                      {phoneNumber}
                                      {isParentPhone && (
                                        <span className="text-gray-400 mr-1 rtl:mr-0 rtl:ml-1">
                                          ({language === 'ar' ? 'ولي الأمر' : 'parent'})
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </label>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Empty state for branch */}
                  {(!branch.parents || branch.parents.length === 0) && (!branch.players || branch.players.length === 0) && (
                    <div className="p-4 text-center text-gray-400 text-sm">
                      {language === 'ar' ? 'لا يوجد أولياء أمور أو لاعبين في هذا الفرع' : 'No parents or players in this branch'}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ParentAudienceSelector
