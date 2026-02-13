import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { useAuth } from '../../hooks/useAuth'
import { attendanceService, socketService } from '../../services'
import GlassCard from '../../components/ui/GlassCard'
import Button from '../../components/ui/Button'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

export default function Attendance() {
  const { language } = useLanguage()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('players')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  // Player attendance state
  const [playerAttendance, setPlayerAttendance] = useState([])
  const [playerStats, setPlayerStats] = useState({ present: 0, absent: 0, late: 0, leave: 0, total: 0 })
  const [localPlayerAttendance, setLocalPlayerAttendance] = useState({})
  const [savingPlayers, setSavingPlayers] = useState(false)
  const [playerSearchQuery, setPlayerSearchQuery] = useState('')
  const [expandedPrograms, setExpandedPrograms] = useState({})

  // Coach attendance state
  const [coachAttendance, setCoachAttendance] = useState([])
  const [coachStats, setCoachStats] = useState({ present: 0, absent: 0, late: 0, leave: 0, total: 0 })
  const [localCoachAttendance, setLocalCoachAttendance] = useState({})
  const [savingCoaches, setSavingCoaches] = useState(false)
  const [coachSearchQuery, setCoachSearchQuery] = useState('')

  // Status labels and colors
  const statusLabels = {
    present: { en: 'Present', ar: 'حاضر' },
    late: { en: 'Late', ar: 'متأخر' },
    absent: { en: 'Absent', ar: 'غائب' },
    leave: { en: 'Excused', ar: 'معذور' }
  }

  const statusButtonColors = {
    present: 'bg-green-500 text-white',
    late: 'bg-amber-500 text-white',
    absent: 'bg-red-500 text-white',
    leave: 'bg-gray-500 text-white'
  }

  const statusButtonInactive = 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20'

  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true)
      const branchId = user?.branch_id

      if (activeTab === 'players') {
        const response = await attendanceService.getPlayersForAttendance(selectedDate, { branch_id: branchId })
        if (response.success) {
          setPlayerAttendance(response.data || [])
          const data = response.data || []
          setPlayerStats({
            present: data.filter(p => p.status === 'present').length,
            absent: data.filter(p => p.status === 'absent').length,
            late: data.filter(p => p.status === 'late').length,
            leave: data.filter(p => p.status === 'leave').length,
            total: data.length
          })
        }
      } else {
        const response = await attendanceService.getCoachByDate(selectedDate, { branch_id: branchId })
        if (response.success) {
          setCoachAttendance(response.data || [])
          const data = response.data || []
          setCoachStats({
            present: data.filter(c => c.status === 'present').length,
            absent: data.filter(c => c.status === 'absent').length,
            late: data.filter(c => c.status === 'late').length,
            leave: data.filter(c => c.status === 'leave').length,
            total: data.length
          })
        }
      }
    } catch (err) {
      console.error('Error fetching attendance:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedDate, activeTab, user?.branch_id])

  useEffect(() => {
    fetchAttendance()
  }, [fetchAttendance])

  // Initialize socket connection and listen for updates
  useEffect(() => {
    if (user) {
      socketService.initSocket(user)
      
      socketService.onPlayerAttendanceUpdate((data) => {
        console.log('📡 Player attendance updated:', data)
        if (data.data?.date === selectedDate) {
          fetchAttendance()
        }
      })
      
      socketService.onCoachAttendanceUpdate((data) => {
        console.log('📡 Coach attendance updated:', data)
        if (data.data?.date === selectedDate) {
          fetchAttendance()
        }
      })
    }
    
    return () => {
      socketService.offPlayerAttendanceUpdate()
      socketService.offCoachAttendanceUpdate()
    }
  }, [user, selectedDate, fetchAttendance])

  // Expand all programs by default
  useEffect(() => {
    if (playerAttendance.length > 0) {
      const allPrograms = {}
      playerAttendance.forEach(record => {
        const programId = record.program?.id || record.program_id || 'unknown'
        allPrograms[programId] = true
      })
      setExpandedPrograms(allPrograms)
    }
  }, [playerAttendance])

  // Player functions
  const updateLocalPlayerStatus = (playerId, status) => {
    setLocalPlayerAttendance(prev => ({ ...prev, [playerId]: status }))
  }

  const getPlayerStatus = (record) => {
    const playerId = record.player_id || record.id
    return localPlayerAttendance[playerId] !== undefined ? localPlayerAttendance[playerId] : record.status
  }

  const getPlayersByProgram = () => {
    const filtered = playerAttendance.filter(record => {
      const playerName = `${record.first_name || ''} ${record.last_name || ''} ${record.first_name_ar || ''} ${record.last_name_ar || ''}`.toLowerCase()
      return playerName.includes(playerSearchQuery.toLowerCase())
    })

    const grouped = {}
    filtered.forEach(record => {
      const programId = record.program?.id || record.program_id || 'unknown'
      const programName = language === 'ar' 
        ? (record.program?.name_ar || record.program?.name || 'غير محدد')
        : (record.program?.name || 'Unknown')
      
      if (!grouped[programId]) {
        grouped[programId] = { id: programId, name: programName, players: [] }
      }
      grouped[programId].players.push(record)
    })

    return Object.values(grouped)
  }

  const toggleProgram = (programId) => {
    setExpandedPrograms(prev => ({ ...prev, [programId]: !prev[programId] }))
  }

  const initializePlayerAttendance = async () => {
    try {
      await attendanceService.initPlayerAttendance(selectedDate)
      fetchAttendance()
    } catch (err) {
      console.error('Error initializing player attendance:', err)
    }
  }

  const saveAllPlayerAttendance = async () => {
    setSavingPlayers(true)
    try {
      const attendances = playerAttendance.map(record => {
        const playerId = record.player_id || record.id
        return {
          player_id: playerId,
          status: localPlayerAttendance[playerId] !== undefined ? localPlayerAttendance[playerId] : record.status
        }
      })
      await attendanceService.recordPlayerBulk(selectedDate, attendances)
      setLocalPlayerAttendance({})
      fetchAttendance()
    } catch (err) {
      console.error('Error saving player attendance:', err)
    } finally {
      setSavingPlayers(false)
    }
  }

  // Coach functions
  const updateLocalCoachStatus = (coachId, status) => {
    setLocalCoachAttendance(prev => ({ ...prev, [coachId]: status }))
  }

  const getCoachStatus = (record) => {
    const coachId = record.coach?.id || record.coach_id
    return localCoachAttendance[coachId] !== undefined ? localCoachAttendance[coachId] : record.status
  }

  const initializeCoachAttendance = async () => {
    try {
      await attendanceService.initCoachAttendance(selectedDate)
      fetchAttendance()
    } catch (err) {
      console.error('Error initializing coach attendance:', err)
    }
  }

  const saveAllCoachAttendance = async () => {
    setSavingCoaches(true)
    try {
      const attendances = coachAttendance.map(record => {
        const coachId = record.coach?.id || record.coach_id
        return {
          coach_id: coachId,
          branch_id: record.branch_id || record.branch?.id,
          status: localCoachAttendance[coachId] !== undefined ? localCoachAttendance[coachId] : record.status
        }
      })
      await attendanceService.recordCoachBulk(selectedDate, attendances)
      setLocalCoachAttendance({})
      fetchAttendance()
    } catch (err) {
      console.error('Error saving coach attendance:', err)
    } finally {
      setSavingCoaches(false)
    }
  }

  const tabs = [
    { id: 'players', label: { en: 'Player Attendance', ar: 'حضور اللاعبين' } },
    { id: 'coaches', label: { en: 'Coach Attendance', ar: 'حضور المدربين' } },
  ]

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
            {language === 'ar' ? 'سجل الحضور' : 'Attendance'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {language === 'ar' ? 'تسجيل ومتابعة حضور المدربين واللاعبين' : 'Record and track coach and player attendance'}
          </p>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-indigo-500 text-white shadow-lg'
                : 'bg-white/50 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'
            }`}
          >
            {tab.label[language]}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-500/20 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {activeTab === 'players' ? playerStats.present : coachStats.present}
              </p>
              <p className="text-sm text-gray-500">{language === 'ar' ? 'حاضر' : 'Present'}</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-500/20 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {activeTab === 'players' ? playerStats.absent : coachStats.absent}
              </p>
              <p className="text-sm text-gray-500">{language === 'ar' ? 'غائب' : 'Absent'}</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-500/20 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {activeTab === 'players' ? playerStats.late : coachStats.late}
              </p>
              <p className="text-sm text-gray-500">{language === 'ar' ? 'متأخر' : 'Late'}</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-500/20 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                {activeTab === 'players' ? playerStats.leave : coachStats.leave}
              </p>
              <p className="text-sm text-gray-500">{language === 'ar' ? 'معذور' : 'Excused'}</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Player Attendance Content */}
      {activeTab === 'players' && (
        <GlassCard className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <h2 className="text-lg font-bold text-secondary dark:text-white">
              {language === 'ar' ? 'حضور اللاعبين' : 'Player Attendance'} - {selectedDate}
            </h2>
            <Button onClick={initializePlayerAttendance} className="bg-purple-500 hover:bg-purple-600">
              {language === 'ar' ? 'تهيئة الحضور' : 'Initialize'}
            </Button>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <svg className="w-5 h-5 absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder={language === 'ar' ? 'ابحث عن لاعب...' : 'Search for a player...'}
                value={playerSearchQuery}
                onChange={(e) => setPlayerSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pr-10 rtl:pr-4 rtl:pl-10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {playerAttendance.length > 0 ? (
            <div className="space-y-2">
              {getPlayersByProgram().map((program) => (
                <div key={program.id} className="border border-gray-100 dark:border-white/10 rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleProgram(program.id)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                  >
                    <span className="text-sm text-gray-500">{program.players.length} {language === 'ar' ? 'لاعب' : 'player(s)'}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800 dark:text-white">{program.name}</span>
                      <svg className={`w-5 h-5 text-gray-400 transition-transform ${expandedPrograms[program.id] ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>

                  {expandedPrograms[program.id] && (
                    <div className="divide-y divide-gray-100 dark:divide-white/5">
                      {program.players.map((record) => {
                        const playerId = record.player_id || record.id
                        const currentStatus = getPlayerStatus(record)
                        const playerName = language === 'ar'
                          ? `${record.first_name_ar || record.first_name || ''} ${record.last_name_ar || record.last_name || ''}`
                          : `${record.first_name || ''} ${record.last_name || ''}`
                        return (
                          <div key={playerId} className="px-4 py-3 bg-white dark:bg-transparent">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                                  {(record.first_name || record.first_name_ar || '?').charAt(0)}
                                </div>
                                <p className="font-medium text-gray-800 dark:text-white">{playerName}</p>
                              </div>
                              <div className="flex flex-wrap gap-2 rtl:flex-row-reverse justify-end">
                                {Object.entries(statusLabels).map(([key, label]) => (
                                  <button
                                    key={key}
                                    onClick={() => updateLocalPlayerStatus(playerId, key)}
                                    className={`px-3 py-1.5 rounded-lg font-medium text-xs sm:text-sm transition-all whitespace-nowrap ${
                                      currentStatus === key ? statusButtonColors[key] : statusButtonInactive
                                    }`}
                                  >
                                    {label[language]}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}

              <div className="pt-6">
                <button
                  onClick={saveAllPlayerAttendance}
                  disabled={savingPlayers}
                  className="w-full py-4 bg-teal-500 hover:bg-teal-600 text-white font-bold text-lg rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {savingPlayers ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {language === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {language === 'ar' ? 'حفظ الحضور' : 'Save Attendance'}
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <p className="text-gray-500 mb-2">{language === 'ar' ? 'لا توجد سجلات حضور للاعبين' : 'No player attendance records'}</p>
              <p className="text-sm text-gray-400 mb-4">{language === 'ar' ? 'اضغط على "تهيئة الحضور" لإنشاء سجلات لجميع اللاعبين' : 'Click "Initialize" to create records for all players'}</p>
              <Button onClick={initializePlayerAttendance} className="bg-purple-500 hover:bg-purple-600">
                {language === 'ar' ? 'تهيئة الحضور' : 'Initialize Attendance'}
              </Button>
            </div>
          )}
        </GlassCard>
      )}

      {/* Coach Attendance Content */}
      {activeTab === 'coaches' && (
        <GlassCard className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <h2 className="text-lg font-bold text-secondary dark:text-white">
              {language === 'ar' ? 'حضور المدربين' : 'Coach Attendance'} - {selectedDate}
            </h2>
            <Button onClick={initializeCoachAttendance} className="bg-purple-500 hover:bg-purple-600">
              {language === 'ar' ? 'تهيئة الحضور' : 'Initialize'}
            </Button>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <svg className="w-5 h-5 absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder={language === 'ar' ? 'ابحث عن مدرب...' : 'Search for a coach...'}
                value={coachSearchQuery}
                onChange={(e) => setCoachSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pr-10 rtl:pr-4 rtl:pl-10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {coachAttendance.length > 0 ? (
            <div className="space-y-2">
              {coachAttendance
                .filter(record => {
                  const coachName = `${record.coach?.first_name || ''} ${record.coach?.last_name || ''}`.toLowerCase()
                  return coachName.includes(coachSearchQuery.toLowerCase())
                })
                .map((record) => {
                  const coachId = record.coach?.id || record.coach_id
                  const currentStatus = getCoachStatus(record)
                  const coachName = `${record.coach?.first_name || ''} ${record.coach?.last_name || ''}`
                  return (
                    <div key={coachId} className="px-4 py-3 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                            {(record.coach?.first_name || '?').charAt(0)}
                          </div>
                          <p className="font-medium text-gray-800 dark:text-white">{coachName}</p>
                        </div>
                        <div className="flex flex-wrap gap-2 rtl:flex-row-reverse justify-end">
                          {Object.entries(statusLabels).map(([key, label]) => (
                            <button
                              key={key}
                              onClick={() => updateLocalCoachStatus(coachId, key)}
                              className={`px-3 py-1.5 rounded-lg font-medium text-xs sm:text-sm transition-all whitespace-nowrap ${
                                currentStatus === key ? statusButtonColors[key] : statusButtonInactive
                              }`}
                            >
                              {label[language]}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}

              <div className="pt-6">
                <button
                  onClick={saveAllCoachAttendance}
                  disabled={savingCoaches}
                  className="w-full py-4 bg-teal-500 hover:bg-teal-600 text-white font-bold text-lg rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {savingCoaches ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {language === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {language === 'ar' ? 'حفظ الحضور' : 'Save Attendance'}
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-gray-500 mb-2">{language === 'ar' ? 'لا توجد سجلات حضور للمدربين' : 'No coach attendance records'}</p>
              <p className="text-sm text-gray-400 mb-4">{language === 'ar' ? 'اضغط على "تهيئة الحضور" لإنشاء سجلات لجميع المدربين' : 'Click "Initialize" to create records for all coaches'}</p>
              <Button onClick={initializeCoachAttendance} className="bg-purple-500 hover:bg-purple-600">
                {language === 'ar' ? 'تهيئة الحضور' : 'Initialize Attendance'}
              </Button>
            </div>
          )}
        </GlassCard>
      )}
    </div>
  )
}
