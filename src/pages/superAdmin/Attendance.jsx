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
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, total: 0 })
  
  // Coach attendance state
  const [coachAttendance, setCoachAttendance] = useState([])
  const [coachStats, setCoachStats] = useState({ present: 0, absent: 0, late: 0, leave: 0, total: 0 })
  const [savingCoach, setSavingCoach] = useState(null)
  const [localAttendance, setLocalAttendance] = useState({}) // Local state for unsaved changes
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedBranches, setExpandedBranches] = useState({})

  // Player attendance state
  const [playerAttendance, setPlayerAttendance] = useState([])
  const [playerStats, setPlayerStats] = useState({ present: 0, absent: 0, late: 0, leave: 0, total: 0 })
  const [localPlayerAttendance, setLocalPlayerAttendance] = useState({})
  const [savingPlayers, setSavingPlayers] = useState(false)
  const [playerSearchQuery, setPlayerSearchQuery] = useState('')
  const [expandedPrograms, setExpandedPrograms] = useState({})

  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true)
      if (activeTab === 'players') {
        // Fetch player attendance for super admin
        const [recordsRes, statsRes] = await Promise.all([
          attendanceService.getPlayersForAttendance(selectedDate),
          attendanceService.getStats({ date: selectedDate })
        ])
        if (recordsRes.success) {
          setPlayerAttendance(recordsRes.data || [])
          // Calculate stats from data
          const data = recordsRes.data || []
          const stats = {
            present: data.filter(p => p.status === 'present').length,
            absent: data.filter(p => p.status === 'absent').length,
            late: data.filter(p => p.status === 'late').length,
            leave: data.filter(p => p.status === 'leave').length,
            total: data.length
          }
          setPlayerStats(stats)
        }
      } else {
        // Fetch coach attendance
        const [recordsRes, statsRes] = await Promise.all([
          attendanceService.getCoachByDate(selectedDate),
          attendanceService.getCoachStats({ date: selectedDate })
        ])
        if (recordsRes.success) {
          setCoachAttendance(recordsRes.data || [])
        }
        if (statsRes.success) {
          setCoachStats(statsRes.data || { present: 0, absent: 0, late: 0, leave: 0, total: 0 })
        }
      }
    } catch (err) {
      console.error('Error fetching attendance:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedDate, activeTab])

  useEffect(() => {
    fetchAttendance()
  }, [fetchAttendance])

  // Initialize socket connection and listen for updates
  useEffect(() => {
    if (user) {
      socketService.initSocket(user)
      
      // Listen for player attendance updates
      socketService.onPlayerAttendanceUpdate((data) => {
        console.log('📡 Player attendance updated:', data)
        // Refresh data if the update is for the same date
        if (data.data?.date === selectedDate) {
          fetchAttendance()
        }
      })
      
      // Listen for coach attendance updates
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

  // Initialize coach attendance for selected date
  const initializeCoachAttendance = async () => {
    try {
      await attendanceService.initCoachAttendance(selectedDate)
      fetchAttendance()
    } catch (err) {
      console.error('Error initializing coach attendance:', err)
    }
  }

  // Initialize player attendance for selected date
  const initializePlayerAttendance = async () => {
    try {
      await attendanceService.initPlayerAttendance(selectedDate)
      fetchAttendance()
    } catch (err) {
      console.error('Error initializing player attendance:', err)
    }
  }

  // Update local attendance status (not saved yet) - for coaches
  const updateLocalStatus = (coachId, status) => {
    setLocalAttendance(prev => ({
      ...prev,
      [coachId]: status
    }))
  }

  // Update local player attendance status
  const updateLocalPlayerStatus = (playerId, status) => {
    setLocalPlayerAttendance(prev => ({
      ...prev,
      [playerId]: status
    }))
  }

  // Get current status for a coach (local or from server)
  const getCoachStatus = (record) => {
    const coachId = record.coach?.id || record.coach_id
    return localAttendance[coachId] !== undefined ? localAttendance[coachId] : record.status
  }

  // Get current status for a player (local or from server)
  const getPlayerStatus = (record) => {
    const playerId = record.player_id || record.id
    return localPlayerAttendance[playerId] !== undefined ? localPlayerAttendance[playerId] : record.status
  }

  const formatDateTime = (value) => {
    if (!value) return '-'
    return new Date(value).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US')
  }

  const getLastEditorName = (record) => {
    const editor = record.last_updated_by
    if (!editor) return language === 'ar' ? 'غير معروف' : 'Unknown'
    const fullName = `${editor.first_name || ''} ${editor.last_name || ''}`.trim()
    return fullName || (language === 'ar' ? 'غير معروف' : 'Unknown')
  }

  // Save all coach attendance
  const saveAllAttendance = async () => {
    setSaving(true)
    try {
      const attendances = coachAttendance.map(record => {
        const coachId = record.coach?.id || record.coach_id
        return {
          coach_id: coachId,
          branch_id: record.branch_id || record.branch?.id,
          status: localAttendance[coachId] !== undefined ? localAttendance[coachId] : record.status
        }
      })
      await attendanceService.recordCoachBulk(selectedDate, attendances)
      setLocalAttendance({}) // Clear local changes
      fetchAttendance()
    } catch (err) {
      console.error('Error saving attendance:', err)
    } finally {
      setSaving(false)
    }
  }

  // Save all player attendance
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
      setLocalPlayerAttendance({}) // Clear local changes
      fetchAttendance()
    } catch (err) {
      console.error('Error saving player attendance:', err)
    } finally {
      setSavingPlayers(false)
    }
  }

  // Group coaches by branch
  const getCoachesByBranch = () => {
    const filtered = coachAttendance.filter(record => {
      const coachName = `${record.coach?.first_name || ''} ${record.coach?.last_name || ''}`.toLowerCase()
      return coachName.includes(searchQuery.toLowerCase())
    })

    const grouped = {}
    filtered.forEach(record => {
      const branchId = record.branch?.id || record.branch_id || 'unknown'
      const branchName = language === 'ar' 
        ? (record.branch?.name_ar || record.branch?.name || 'غير محدد')
        : (record.branch?.name || 'Unknown')
      
      if (!grouped[branchId]) {
        grouped[branchId] = {
          id: branchId,
          name: branchName,
          coaches: []
        }
      }
      grouped[branchId].coaches.push(record)
    })

    return Object.values(grouped)
  }

  // Toggle branch expansion
  const toggleBranch = (branchId) => {
    setExpandedBranches(prev => ({
      ...prev,
      [branchId]: !prev[branchId]
    }))
  }

  // Expand all branches by default when data loads
  useEffect(() => {
    if (coachAttendance.length > 0) {
      const allBranches = {}
      coachAttendance.forEach(record => {
        const branchId = record.branch?.id || record.branch_id || 'unknown'
        allBranches[branchId] = true
      })
      setExpandedBranches(allBranches)
    }
  }, [coachAttendance])

  // Group players by program
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
        grouped[programId] = {
          id: programId,
          name: programName,
          players: []
        }
      }
      grouped[programId].players.push(record)
    })

    return Object.values(grouped)
  }

  // Toggle program expansion
  const toggleProgram = (programId) => {
    setExpandedPrograms(prev => ({
      ...prev,
      [programId]: !prev[programId]
    }))
  }

  // Expand all programs by default when data loads
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

  // Export player attendance to Excel
  const exportPlayerExcel = () => {
    const headers = [
      language === 'ar' ? 'اللاعب' : 'Player',
      language === 'ar' ? 'البرنامج' : 'Program',
      language === 'ar' ? 'الحالة' : 'Status',
      language === 'ar' ? 'التاريخ' : 'Date'
    ]
    const rows = playerAttendance.map(r => [
      language === 'ar' 
        ? `${r.first_name_ar || r.first_name || ''} ${r.last_name_ar || r.last_name || ''}`
        : `${r.first_name || ''} ${r.last_name || ''}`,
      language === 'ar' ? (r.program?.name_ar || r.program?.name || '') : (r.program?.name || ''),
      r.status,
      selectedDate
    ])
    
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Player Attendance')
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    saveAs(new Blob([buffer]), `player-attendance-${selectedDate}.xlsx`)
  }

  // Print player attendance
  const printPlayerAttendance = () => {
    const title = language === 'ar' ? 'سجل حضور اللاعبين' : 'Player Attendance'
    const isRTL = language === 'ar'
    const headers = [
      language === 'ar' ? 'اللاعب' : 'Player',
      language === 'ar' ? 'البرنامج' : 'Program',
      language === 'ar' ? 'الحالة' : 'Status'
    ]
    
    const htmlContent = `
      <!DOCTYPE html>
      <html dir="${isRTL ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap');
          * { font-family: 'IBM Plex Sans Arabic', Arial, sans-serif; }
          body { padding: 40px; direction: ${isRTL ? 'rtl' : 'ltr'}; }
          h1 { color: #7c3aed; margin-bottom: 10px; }
          .date { color: #666; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: ${isRTL ? 'right' : 'left'}; }
          th { background-color: #7c3aed; color: white; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .present { color: #16a34a; } .absent { color: #dc2626; } .late { color: #f59e0b; } .leave { color: #6b7280; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p class="date">${language === 'ar' ? 'التاريخ:' : 'Date:'} ${selectedDate}</p>
        <table>
          <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
          <tbody>
            ${playerAttendance.map(r => `
              <tr>
                <td>${isRTL ? `${r.first_name_ar || r.first_name || ''} ${r.last_name_ar || r.last_name || ''}` : `${r.first_name || ''} ${r.last_name || ''}`}</td>
                <td>${isRTL ? (r.program?.name_ar || r.program?.name || '') : (r.program?.name || '')}</td>
                <td class="${r.status}">${r.status}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `
    const printWindow = window.open('', '_blank')
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 500)
  }

  // Export coach attendance to Excel
  const exportCoachExcel = () => {
    const headers = [
      language === 'ar' ? 'المدرب' : 'Coach',
      language === 'ar' ? 'الفرع' : 'Branch',
      language === 'ar' ? 'الحالة' : 'Status',
      language === 'ar' ? 'التاريخ' : 'Date'
    ]
    const rows = coachAttendance.map(r => [
      `${r.coach?.first_name || ''} ${r.coach?.last_name || ''}`,
      language === 'ar' ? (r.branch?.name_ar || r.branch?.name || '') : (r.branch?.name || ''),
      r.status,
      selectedDate
    ])
    
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Coach Attendance')
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    saveAs(new Blob([buffer]), `coach-attendance-${selectedDate}.xlsx`)
  }

  // Print coach attendance
  const printCoachAttendance = () => {
    const title = language === 'ar' ? 'سجل حضور المدربين' : 'Coach Attendance'
    const isRTL = language === 'ar'
    const headers = [
      language === 'ar' ? 'المدرب' : 'Coach',
      language === 'ar' ? 'الفرع' : 'Branch',
      language === 'ar' ? 'الحالة' : 'Status'
    ]
    
    const htmlContent = `
      <!DOCTYPE html>
      <html dir="${isRTL ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap');
          * { font-family: 'IBM Plex Sans Arabic', Arial, sans-serif; }
          body { padding: 40px; direction: ${isRTL ? 'rtl' : 'ltr'}; }
          h1 { color: #7c3aed; margin-bottom: 10px; }
          .date { color: #666; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: ${isRTL ? 'right' : 'left'}; }
          th { background-color: #7c3aed; color: white; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .present { color: #16a34a; } .absent { color: #dc2626; } .late { color: #f59e0b; } .leave { color: #6b7280; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p class="date">${language === 'ar' ? 'التاريخ:' : 'Date:'} ${selectedDate}</p>
        <table>
          <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
          <tbody>
            ${coachAttendance.map(r => `
              <tr>
                <td>${r.coach?.first_name || ''} ${r.coach?.last_name || ''}</td>
                <td>${isRTL ? (r.branch?.name_ar || r.branch?.name || '') : (r.branch?.name || '')}</td>
                <td class="${r.status}">${r.status}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `
    const printWindow = window.open('', '_blank')
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 500)
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

  const statusColors = {
    present: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
    absent: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
    late: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
    leave: 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400'
  }

  const statusLabels = {
    present: { en: 'Present', ar: 'حاضر' },
    late: { en: 'Late', ar: 'متأخر' },
    absent: { en: 'Absent', ar: 'غائب' },
    leave: { en: 'Excused', ar: 'معذور' }
  }

  const statusButtonColors = {
    present: 'bg-green-500 hover:bg-green-600 text-white',
    late: 'bg-amber-500 hover:bg-amber-600 text-white',
    absent: 'bg-red-500 hover:bg-red-600 text-white',
    leave: 'bg-gray-400 hover:bg-gray-500 text-white'
  }

  const statusButtonInactive = 'bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-white/10 dark:hover:bg-white/20 dark:text-gray-300'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-secondary dark:text-white">
            {language === 'ar' ? 'سجل الحضور' : 'Attendance Records'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {language === 'ar' ? 'متابعة حضور المدربين واللاعبين' : 'Track coach and player attendance'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('players')}
          className={`px-4 py-2 rounded-xl font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'players'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
              : 'bg-white dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/20'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          {language === 'ar' ? 'اللاعبون' : 'Players'}
        </button>
        <button
          onClick={() => setActiveTab('coaches')}
          className={`px-4 py-2 rounded-xl font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'coaches'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
              : 'bg-white dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/20'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {language === 'ar' ? 'المدربون' : 'Coaches'}
        </button>
      </div>

      {/* Stats */}
      {activeTab === 'coaches' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{coachStats.present}</p>
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
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{coachStats.absent}</p>
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
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{coachStats.late}</p>
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
                <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{coachStats.leave}</p>
                <p className="text-sm text-gray-500">{language === 'ar' ? 'معذور' : 'Excused'}</p>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Coach Attendance Content */}
      {activeTab === 'coaches' && (
        <GlassCard className="p-6">
          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <h2 className="text-lg font-bold text-secondary dark:text-white">
              {language === 'ar' ? 'حضور المدربين' : 'Coach Attendance'} - {selectedDate}
            </h2>
            <div className="flex flex-wrap gap-2">
              <Button onClick={initializeCoachAttendance} className="bg-purple-500 hover:bg-purple-600">
                <svg className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {language === 'ar' ? 'تهيئة الحضور' : 'Initialize'}
              </Button>
              <Button onClick={exportCoachExcel} className="bg-green-500 hover:bg-green-600">
                <svg className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Excel
              </Button>
              <Button onClick={printCoachAttendance} className="bg-blue-500 hover:bg-blue-600">
                <svg className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                {language === 'ar' ? 'طباعة' : 'Print'}
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <svg className="w-5 h-5 absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder={language === 'ar' ? 'ابحث عن مستخدم...' : 'Search for a user...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pr-10 rtl:pr-4 rtl:pl-10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Branch Selection Header */}
          <div className="flex items-center justify-end mb-4">
            <span className="text-purple-600 dark:text-purple-400 font-medium">
              {language === 'ar' ? 'اختر من الفروع' : 'Select from branches'}
            </span>
          </div>

          {/* Attendance List Grouped by Branch */}
          {coachAttendance.length > 0 ? (
            <div className="space-y-2">
              {getCoachesByBranch().map((branch) => (
                <div key={branch.id} className="border border-gray-100 dark:border-white/10 rounded-xl overflow-hidden">
                  {/* Branch Header */}
                  <button
                    onClick={() => toggleBranch(branch.id)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                  >
                    <span className="text-sm text-gray-500">
                      {branch.coaches.length} {language === 'ar' ? 'مستخدم' : 'user(s)'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800 dark:text-white">{branch.name}</span>
                      <svg 
                        className={`w-5 h-5 text-gray-400 transition-transform ${expandedBranches[branch.id] ? 'rotate-90' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>

                  {/* Coaches List */}
                  {expandedBranches[branch.id] && (
                    <div className="divide-y divide-gray-100 dark:divide-white/5">
                      {branch.coaches.map((record) => {
                        const coachId = record.coach?.id || record.coach_id
                        const currentStatus = getCoachStatus(record)
                        return (
                          <div key={record.id} className="px-4 py-3 bg-white dark:bg-transparent">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                                  {record.coach?.first_name?.charAt(0) || '?'}
                                </div>
                                <p className="font-medium text-gray-800 dark:text-white">
                                  {record.coach?.first_name} {record.coach?.last_name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {language === 'ar' ? 'آخر تحديث:' : 'Last updated:'} {getLastEditorName(record)}
                                  {' • '}
                                  {formatDateTime(record.last_updated_at)}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2 rtl:flex-row-reverse justify-end">
                                {Object.entries(statusLabels).map(([key, label]) => (
                                  <button
                                    key={key}
                                    onClick={() => updateLocalStatus(coachId, key)}
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

              {/* Save Button */}
              <div className="pt-6">
                <button
                  onClick={saveAllAttendance}
                  disabled={saving}
                  className="w-full py-4 bg-teal-500 hover:bg-teal-600 text-white font-bold text-lg rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? (
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

      {/* Player Stats */}
      {activeTab === 'players' && (
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
      )}

      {/* Player Attendance Content */}
      {activeTab === 'players' && (
        <GlassCard className="p-6">
          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <h2 className="text-lg font-bold text-secondary dark:text-white">
              {language === 'ar' ? 'حضور اللاعبين' : 'Player Attendance'} - {selectedDate}
            </h2>
            <div className="flex flex-wrap gap-2">
              <Button onClick={initializePlayerAttendance} className="bg-purple-500 hover:bg-purple-600">
                <svg className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {language === 'ar' ? 'تهيئة الحضور' : 'Initialize'}
              </Button>
              <Button onClick={exportPlayerExcel} className="bg-green-500 hover:bg-green-600">
                <svg className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Excel
              </Button>
              <Button onClick={printPlayerAttendance} className="bg-blue-500 hover:bg-blue-600">
                <svg className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                {language === 'ar' ? 'طباعة' : 'Print'}
              </Button>
            </div>
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

          {/* Program Selection Header */}
          <div className="flex items-center justify-end mb-4">
            <span className="text-purple-600 dark:text-purple-400 font-medium">
              {language === 'ar' ? 'اختر من البرامج' : 'Select from programs'}
            </span>
          </div>

          {/* Attendance List Grouped by Program */}
          {playerAttendance.length > 0 ? (
            <div className="space-y-2">
              {getPlayersByProgram().map((program) => (
                <div key={program.id} className="border border-gray-100 dark:border-white/10 rounded-xl overflow-hidden">
                  {/* Program Header */}
                  <button
                    onClick={() => toggleProgram(program.id)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                  >
                    <span className="text-sm text-gray-500">
                      {program.players.length} {language === 'ar' ? 'لاعب' : 'player(s)'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800 dark:text-white">{program.name}</span>
                      <svg 
                        className={`w-5 h-5 text-gray-400 transition-transform ${expandedPrograms[program.id] ? 'rotate-90' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>

                  {/* Players List */}
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
                                <p className="font-medium text-gray-800 dark:text-white">
                                  {playerName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {language === 'ar' ? 'آخر تحديث:' : 'Last updated:'} {getLastEditorName(record)}
                                  {' • '}
                                  {formatDateTime(record.last_updated_at)}
                                </p>
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

              {/* Save Button */}
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
    </div>
  )
}
