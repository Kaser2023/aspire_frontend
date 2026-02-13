import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { useAuth } from '../../hooks/useAuth'
import { attendanceService, socketService } from '../../services'
import GlassCard from '../../components/ui/GlassCard'
import Button from '../../components/ui/Button'

export default function CoachAttendance() {
  const { language } = useLanguage()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  
  // Get today's date in local timezone (YYYY-MM-DD format)
  const getTodayDate = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  const [selectedDate, setSelectedDate] = useState(getTodayDate())

  // Player attendance state
  const [playerAttendance, setPlayerAttendance] = useState([])
  const [playerStats, setPlayerStats] = useState({ present: 0, absent: 0, late: 0, leave: 0, total: 0 })
  const [localPlayerAttendance, setLocalPlayerAttendance] = useState({})
  const [savingPlayers, setSavingPlayers] = useState(false)
  const [playerSearchQuery, setPlayerSearchQuery] = useState('')
  const [expandedPrograms, setExpandedPrograms] = useState({})

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
      // Fetch players assigned to this coach
      const response = await attendanceService.getPlayersForAttendance(selectedDate, { coach_id: user?.id })
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
    } catch (err) {
      console.error('Error fetching attendance:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedDate, user?.id])

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
    }
    
    return () => {
      socketService.offPlayerAttendanceUpdate()
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

  const handlePrint = () => {
    const isRTL = language === 'ar'
    const programs = getPlayersByProgram()
    
    const formatDate = (dateStr) => {
      const date = new Date(dateStr)
      return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      })
    }

    const getStatusLabel = (status) => {
      return statusLabels[status]?.[language] || status
    }

    const getStatusColor = (status) => {
      const colors = {
        present: '#22c55e',
        late: '#f59e0b',
        absent: '#ef4444',
        leave: '#6b7280'
      }
      return colors[status] || '#6b7280'
    }

    let tablesHtml = ''
    programs.forEach(program => {
      tablesHtml += `
        <div style="margin-bottom: 30px;">
          <h3 style="margin-bottom: 10px; color: #10b981; font-size: 16px;">${program.name} (${program.players.length} ${isRTL ? 'لاعب' : 'players'})</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: ${isRTL ? 'right' : 'left'}; background-color: #10b981; color: white;">#</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: ${isRTL ? 'right' : 'left'}; background-color: #10b981; color: white;">${isRTL ? 'اسم اللاعب' : 'Player Name'}</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: ${isRTL ? 'right' : 'left'}; background-color: #10b981; color: white;">${isRTL ? 'الحالة' : 'Status'}</th>
              </tr>
            </thead>
            <tbody>
              ${program.players.map((record, idx) => {
                const status = getPlayerStatus(record)
                const playerName = isRTL
                  ? `${record.first_name_ar || record.first_name || ''} ${record.last_name_ar || record.last_name || ''}`
                  : `${record.first_name || ''} ${record.last_name || ''}`
                return `
                  <tr>
                    <td style="border: 1px solid #ddd; padding: 10px;">${idx + 1}</td>
                    <td style="border: 1px solid #ddd; padding: 10px;">${playerName}</td>
                    <td style="border: 1px solid #ddd; padding: 10px; color: ${getStatusColor(status)}; font-weight: bold;">${getStatusLabel(status)}</td>
                  </tr>
                `
              }).join('')}
            </tbody>
          </table>
        </div>
      `
    })

    const printContent = `
      <!DOCTYPE html>
      <html dir="${isRTL ? 'rtl' : 'ltr'}">
      <head>
        <title>${isRTL ? 'سجل الحضور' : 'Attendance Record'}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap');
          * { font-family: 'IBM Plex Sans Arabic', Arial, sans-serif; }
          body { padding: 30px; direction: ${isRTL ? 'rtl' : 'ltr'}; }
          h1 { color: #10b981; margin-bottom: 5px; font-size: 24px; }
          .date { color: #666; margin-bottom: 20px; font-size: 14px; }
          .summary { display: flex; gap: 20px; margin-bottom: 30px; flex-wrap: wrap; }
          .summary-item { padding: 10px 20px; border-radius: 8px; text-align: center; }
          .summary-item.present { background: #dcfce7; color: #166534; }
          .summary-item.absent { background: #fee2e2; color: #991b1b; }
          .summary-item.late { background: #fef3c7; color: #92400e; }
          .summary-item.leave { background: #f3f4f6; color: #374151; }
          .summary-item strong { display: block; font-size: 24px; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <h1>${isRTL ? 'سجل الحضور' : 'Attendance Record'}</h1>
        <p class="date">${formatDate(selectedDate)}</p>
        
        <div class="summary">
          <div class="summary-item present">
            <strong>${playerStats.present}</strong>
            ${isRTL ? 'حاضر' : 'Present'}
          </div>
          <div class="summary-item absent">
            <strong>${playerStats.absent}</strong>
            ${isRTL ? 'غائب' : 'Absent'}
          </div>
          <div class="summary-item late">
            <strong>${playerStats.late}</strong>
            ${isRTL ? 'متأخر' : 'Late'}
          </div>
          <div class="summary-item leave">
            <strong>${playerStats.leave}</strong>
            ${isRTL ? 'معذور' : 'Excused'}
          </div>
        </div>

        ${tablesHtml}
      </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    printWindow.document.write(printContent)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { printWindow.print(); printWindow.close() }, 300)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <svg className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4" fill="none" viewBox="0 0 24 24">
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
            {language === 'ar' ? 'تسجيل الحضور' : 'Take Attendance'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {language === 'ar' ? 'تسجيل حضور اللاعبين' : 'Record player attendance'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <Button 
            onClick={handlePrint}
            disabled={playerAttendance.length === 0}
            className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50"
          >
            <svg className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            {language === 'ar' ? 'طباعة' : 'Print'}
          </Button>
        </div>
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
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{playerStats.present}</p>
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
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{playerStats.absent}</p>
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
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{playerStats.late}</p>
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
              <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{playerStats.leave}</p>
              <p className="text-sm text-gray-500">{language === 'ar' ? 'معذور' : 'Excused'}</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Player Attendance Content */}
      <GlassCard className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-bold text-secondary dark:text-white">
            {language === 'ar' ? 'حضور اللاعبين' : 'Player Attendance'} - {selectedDate}
          </h2>
          <Button onClick={initializePlayerAttendance} className="bg-emerald-500 hover:bg-emerald-600">
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
              className="w-full px-4 py-3 pr-10 rtl:pr-4 rtl:pl-10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
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
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
            <Button onClick={initializePlayerAttendance} className="bg-emerald-500 hover:bg-emerald-600">
              {language === 'ar' ? 'تهيئة الحضور' : 'Initialize Attendance'}
            </Button>
          </div>
        )}
      </GlassCard>
    </div>
  )
}
