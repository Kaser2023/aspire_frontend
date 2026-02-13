import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { useAuth } from '../../hooks/useAuth'
import { programsService, evaluationService, playersService } from '../../services'
import GlassCard from '../../components/ui/GlassCard'
import Button from '../../components/ui/Button'
import { getTodayString } from '../../utils/dateUtils'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

export default function CoachReports() {
  const { language } = useLanguage()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [selectedReportType, setSelectedReportType] = useState('player')
  const [programs, setPrograms] = useState([])
  const [players, setPlayers] = useState([])
  const [evaluations, setEvaluations] = useState([])
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [selectedProgram, setSelectedProgram] = useState(null)
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: getTodayString()
  })

  const reportTypes = [
    {
      id: 'player',
      icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
      label: { en: 'Player Report', ar: 'تقرير لاعب' },
      description: { en: 'Individual player evaluations and performance', ar: 'تقييمات وأداء اللاعب الفردي' }
    },
    {
      id: 'program',
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
      label: { en: 'Program Report', ar: 'تقرير البرنامج' },
      description: { en: 'Overall program statistics and player averages', ar: 'إحصائيات البرنامج ومتوسطات اللاعبين' }
    },
    {
      id: 'evaluation',
      icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
      label: { en: 'Evaluations Summary', ar: 'ملخص التقييمات' },
      description: { en: 'All evaluations within date range', ar: 'جميع التقييمات ضمن الفترة' }
    },
    {
      id: 'progress',
      icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
      label: { en: 'Progress Report', ar: 'تقرير التقدم' },
      description: { en: 'Player improvement over time', ar: 'تحسن اللاعب عبر الوقت' }
    },
  ]

  // Fetch coach's programs and players
  const fetchData = useCallback(async () => {
    if (!user?.id) return
    try {
      setLoading(true)
      
      // Fetch programs and players in parallel
      const [programsRes, playersRes, evalRes] = await Promise.all([
        programsService.getAll({ coach_id: user.id }),
        playersService.getAll({ coach_id: user.id }),
        evaluationService.getAll({
          start_date: dateRange.start,
          end_date: dateRange.end
        })
      ])
      
      if (programsRes.success && programsRes.data) {
        setPrograms(programsRes.data)
      }
      
      if (playersRes.success && playersRes.data) {
        // Format player data with proper names
        const formattedPlayers = playersRes.data.map(p => ({
          id: p.id,
          name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
          name_ar: `${p.first_name_ar || p.first_name || ''} ${p.last_name_ar || p.last_name || ''}`.trim(),
          program_id: p.program_id,
          program_name: p.program_name,
          program_name_ar: p.program_name_ar,
          status: p.status
        }))
        setPlayers(formattedPlayers)
      }
      
      if (evalRes.success) {
        setEvaluations(evalRes.data || [])
      }
    } catch (err) {
      console.error('Error fetching report data:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.id, dateRange])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const getReportTitle = () => {
    const type = reportTypes.find(t => t.id === selectedReportType)
    return type?.label[language] || 'Report'
  }

  const getCoachName = () => {
    return language === 'ar'
      ? (user?.name_ar || `${user?.first_name || ''} ${user?.last_name || ''}`.trim())
      : `${user?.first_name || ''} ${user?.last_name || ''}`.trim()
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')
  }

  // Get player evaluation stats
  const getPlayerStats = (playerId) => {
    const playerEvals = evaluations.filter(e => e.player_id === playerId)
    if (playerEvals.length === 0) return null
    
    const avgRating = playerEvals.reduce((sum, e) => sum + (e.overall_rating || 0), 0) / playerEvals.length
    const totalGoals = playerEvals.reduce((sum, e) => sum + (e.goals || 0), 0)
    const lastEval = playerEvals.sort((a, b) => new Date(b.evaluation_date) - new Date(a.evaluation_date))[0]
    
    return {
      totalEvaluations: playerEvals.length,
      avgRating: avgRating.toFixed(1),
      totalGoals,
      lastEvalDate: lastEval?.evaluation_date,
      lastRating: lastEval?.overall_rating
    }
  }

  // Get program stats
  const getProgramStats = (programId) => {
    const programPlayers = players.filter(p => p.program_id === programId)
    const programEvals = evaluations.filter(e => 
      programPlayers.some(p => p.id === e.player_id)
    )
    
    if (programPlayers.length === 0) return null
    
    const avgRating = programEvals.length > 0 
      ? programEvals.reduce((sum, e) => sum + (e.overall_rating || 0), 0) / programEvals.length
      : 0
    const totalGoals = programEvals.reduce((sum, e) => sum + (e.goals || 0), 0)
    
    return {
      totalPlayers: programPlayers.length,
      totalEvaluations: programEvals.length,
      avgRating: avgRating.toFixed(1),
      totalGoals
    }
  }

  // Get player display name
  const getPlayerName = (player) => {
    if (!player) return ''
    return language === 'ar' ? (player.name_ar || player.name) : player.name
  }

  // Get program display name
  const getProgramName = (program) => {
    if (!program) return ''
    return language === 'ar' ? (program.name_ar || program.name) : program.name
  }

  // Report data generators
  const getReportTableData = () => {
    const headers = language === 'ar' ? ['البند', 'القيمة'] : ['Item', 'Value']
    let rows = []

    if (selectedReportType === 'player' && selectedPlayer) {
      const stats = getPlayerStats(selectedPlayer.id)
      const playerName = getPlayerName(selectedPlayer)
      const programName = language === 'ar' ? (selectedPlayer.program_name_ar || selectedPlayer.program_name) : selectedPlayer.program_name
      rows = [
        [language === 'ar' ? 'اسم اللاعب' : 'Player Name', playerName],
        [language === 'ar' ? 'البرنامج' : 'Program', programName || '-'],
        [language === 'ar' ? 'عدد التقييمات' : 'Total Evaluations', stats?.totalEvaluations || 0],
        [language === 'ar' ? 'متوسط التقييم' : 'Average Rating', stats ? `${stats.avgRating} / 5` : '-'],
        [language === 'ar' ? 'إجمالي الأهداف' : 'Total Goals', stats?.totalGoals || 0],
        [language === 'ar' ? 'آخر تقييم' : 'Last Evaluation', stats?.lastEvalDate ? formatDate(stats.lastEvalDate) : '-'],
        [language === 'ar' ? 'آخر تقييم' : 'Last Rating', stats?.lastRating ? `${stats.lastRating} / 5` : '-'],
      ]
    } else if (selectedReportType === 'program' && selectedProgram) {
      const stats = getProgramStats(selectedProgram.id)
      const programName = getProgramName(selectedProgram)
      rows = [
        [language === 'ar' ? 'اسم البرنامج' : 'Program Name', programName],
        [language === 'ar' ? 'عدد اللاعبين' : 'Total Players', stats?.totalPlayers || 0],
        [language === 'ar' ? 'عدد التقييمات' : 'Total Evaluations', stats?.totalEvaluations || 0],
        [language === 'ar' ? 'متوسط التقييم' : 'Average Rating', stats ? `${stats.avgRating} / 5` : '-'],
        [language === 'ar' ? 'إجمالي الأهداف' : 'Total Goals', stats?.totalGoals || 0],
      ]
    } else if (selectedReportType === 'evaluation') {
      const avgRating = evaluations.length > 0 
        ? (evaluations.reduce((sum, e) => sum + (e.overall_rating || 0), 0) / evaluations.length).toFixed(1)
        : 0
      const totalGoals = evaluations.reduce((sum, e) => sum + (e.goals || 0), 0)
      rows = [
        [language === 'ar' ? 'إجمالي التقييمات' : 'Total Evaluations', evaluations.length],
        [language === 'ar' ? 'متوسط التقييم العام' : 'Overall Avg Rating', `${avgRating} / 5`],
        [language === 'ar' ? 'إجمالي الأهداف' : 'Total Goals', totalGoals],
        [language === 'ar' ? 'عدد اللاعبين المقيمين' : 'Players Evaluated', new Set(evaluations.map(e => e.player_id)).size],
      ]
    } else if (selectedReportType === 'progress' && selectedPlayer) {
      const playerEvals = evaluations
        .filter(e => e.player_id === selectedPlayer.id)
        .sort((a, b) => new Date(a.evaluation_date) - new Date(b.evaluation_date))
      
      if (playerEvals.length >= 2) {
        const first = playerEvals[0]
        const last = playerEvals[playerEvals.length - 1]
        const improvement = last.overall_rating - first.overall_rating
        rows = [
          [language === 'ar' ? 'اسم اللاعب' : 'Player Name', getPlayerName(selectedPlayer)],
          [language === 'ar' ? 'عدد التقييمات' : 'Total Evaluations', playerEvals.length],
          [language === 'ar' ? 'أول تقييم' : 'First Evaluation', `${first.overall_rating}/5 (${formatDate(first.evaluation_date)})`],
          [language === 'ar' ? 'آخر تقييم' : 'Latest Evaluation', `${last.overall_rating}/5 (${formatDate(last.evaluation_date)})`],
          [language === 'ar' ? 'التحسن' : 'Improvement', improvement > 0 ? `+${improvement}` : improvement.toString()],
        ]
      } else {
        rows = [
          [language === 'ar' ? 'ملاحظة' : 'Note', language === 'ar' ? 'يحتاج على الأقل تقييمين لعرض التقدم' : 'Needs at least 2 evaluations to show progress'],
        ]
      }
    } else {
      // Summary when nothing selected
      rows = [
        [language === 'ar' ? 'إجمالي البرامج' : 'Total Programs', programs.length],
        [language === 'ar' ? 'إجمالي اللاعبين' : 'Total Players', players.length],
        [language === 'ar' ? 'إجمالي التقييمات' : 'Total Evaluations', evaluations.length],
      ]
    }
    return { headers, rows }
  }

  // Detailed export data
  const getExportTableData = () => {
    const headers = language === 'ar' ? ['البند', 'القيمة'] : ['Item', 'Value']
    let rows = []
    const today = formatDate(getTodayString())

    // Header info
    rows.push([language === 'ar' ? '═══ معلومات التقرير ═══' : '═══ Report Info ═══', ''])
    rows.push([language === 'ar' ? 'المدرب' : 'Coach', getCoachName()])
    rows.push([language === 'ar' ? 'تاريخ التقرير' : 'Report Date', today])
    rows.push([language === 'ar' ? 'الفترة' : 'Period', `${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`])
    rows.push(['', ''])

    if (selectedReportType === 'player' && selectedPlayer) {
      const stats = getPlayerStats(selectedPlayer.id)
      const playerName = getPlayerName(selectedPlayer)
      const programName = language === 'ar' ? (selectedPlayer.program_name_ar || selectedPlayer.program_name) : selectedPlayer.program_name
      rows.push([language === 'ar' ? '═══ تقرير اللاعب ═══' : '═══ Player Report ═══', ''])
      rows.push([language === 'ar' ? 'اسم اللاعب' : 'Player Name', playerName])
      rows.push([language === 'ar' ? 'البرنامج' : 'Program', programName || '-'])
      rows.push([language === 'ar' ? 'عدد التقييمات' : 'Total Evaluations', stats?.totalEvaluations || 0])
      rows.push([language === 'ar' ? 'متوسط التقييم' : 'Average Rating', stats ? `${stats.avgRating} / 5` : '-'])
      rows.push([language === 'ar' ? 'إجمالي الأهداف' : 'Total Goals', stats?.totalGoals || 0])
      
      // Add evaluation history
      const playerEvals = evaluations.filter(e => e.player_id === selectedPlayer.id)
      if (playerEvals.length > 0) {
        rows.push(['', ''])
        rows.push([language === 'ar' ? '═══ سجل التقييمات ═══' : '═══ Evaluation History ═══', ''])
        playerEvals.forEach((ev, idx) => {
          rows.push([`${idx + 1}. ${formatDate(ev.evaluation_date)}`, `${ev.overall_rating}/5 - ${language === 'ar' ? 'أهداف' : 'Goals'}: ${ev.goals || 0}`])
        })
      }
    } else if (selectedReportType === 'program' && selectedProgram) {
      const stats = getProgramStats(selectedProgram.id)
      const programName = getProgramName(selectedProgram)
      rows.push([language === 'ar' ? '═══ تقرير البرنامج ═══' : '═══ Program Report ═══', ''])
      rows.push([language === 'ar' ? 'اسم البرنامج' : 'Program Name', programName])
      rows.push([language === 'ar' ? 'عدد اللاعبين' : 'Total Players', stats?.totalPlayers || 0])
      rows.push([language === 'ar' ? 'عدد التقييمات' : 'Total Evaluations', stats?.totalEvaluations || 0])
      rows.push([language === 'ar' ? 'متوسط التقييم' : 'Average Rating', stats ? `${stats.avgRating} / 5` : '-'])
      rows.push([language === 'ar' ? 'إجمالي الأهداف' : 'Total Goals', stats?.totalGoals || 0])
      
      // Add players list
      const programPlayers = players.filter(p => p.program_id === selectedProgram.id)
      if (programPlayers.length > 0) {
        rows.push(['', ''])
        rows.push([language === 'ar' ? '═══ قائمة اللاعبين ═══' : '═══ Players List ═══', ''])
        programPlayers.forEach((p, idx) => {
          const pStats = getPlayerStats(p.id)
          rows.push([`${idx + 1}. ${getPlayerName(p)}`, pStats ? `${language === 'ar' ? 'تقييم' : 'Rating'}: ${pStats.avgRating}/5` : '-'])
        })
      }
    } else if (selectedReportType === 'evaluation') {
      rows.push([language === 'ar' ? '═══ ملخص التقييمات ═══' : '═══ Evaluations Summary ═══', ''])
      const avgRating = evaluations.length > 0 
        ? (evaluations.reduce((sum, e) => sum + (e.overall_rating || 0), 0) / evaluations.length).toFixed(1)
        : 0
      const totalGoals = evaluations.reduce((sum, e) => sum + (e.goals || 0), 0)
      rows.push([language === 'ar' ? 'إجمالي التقييمات' : 'Total Evaluations', evaluations.length])
      rows.push([language === 'ar' ? 'متوسط التقييم العام' : 'Overall Avg Rating', `${avgRating} / 5`])
      rows.push([language === 'ar' ? 'إجمالي الأهداف' : 'Total Goals', totalGoals])
      
      // List all evaluations
      if (evaluations.length > 0) {
        rows.push(['', ''])
        rows.push([language === 'ar' ? '═══ جميع التقييمات ═══' : '═══ All Evaluations ═══', ''])
        evaluations.forEach((ev, idx) => {
          const player = players.find(p => p.id === ev.player_id)
          const name = player ? getPlayerName(player) : 'Unknown'
          rows.push([`${idx + 1}. ${name} (${formatDate(ev.evaluation_date)})`, `${ev.overall_rating}/5 - ${language === 'ar' ? 'أهداف' : 'Goals'}: ${ev.goals || 0}`])
        })
      }
    } else if (selectedReportType === 'progress' && selectedPlayer) {
      const playerEvals = evaluations
        .filter(e => e.player_id === selectedPlayer.id)
        .sort((a, b) => new Date(a.evaluation_date) - new Date(b.evaluation_date))
      
      rows.push([language === 'ar' ? '═══ تقرير التقدم ═══' : '═══ Progress Report ═══', ''])
      rows.push([language === 'ar' ? 'اسم اللاعب' : 'Player Name', getPlayerName(selectedPlayer)])
      
      if (playerEvals.length >= 2) {
        const first = playerEvals[0]
        const last = playerEvals[playerEvals.length - 1]
        const improvement = last.overall_rating - first.overall_rating
        rows.push([language === 'ar' ? 'أول تقييم' : 'First Evaluation', `${first.overall_rating}/5`])
        rows.push([language === 'ar' ? 'آخر تقييم' : 'Latest Evaluation', `${last.overall_rating}/5`])
        rows.push([language === 'ar' ? 'التحسن' : 'Improvement', improvement > 0 ? `+${improvement}` : improvement.toString()])
        
        rows.push(['', ''])
        rows.push([language === 'ar' ? '═══ مسار التقدم ═══' : '═══ Progress Timeline ═══', ''])
        playerEvals.forEach((ev, idx) => {
          rows.push([formatDate(ev.evaluation_date), `${ev.overall_rating}/5 - ${language === 'ar' ? 'أهداف' : 'Goals'}: ${ev.goals || 0}`])
        })
      }
    }

    return { headers, rows }
  }

  const exportToPDF = () => {
    setExporting(true)
    try {
      const { headers, rows } = getExportTableData()
      const title = getReportTitle()
      const isRTL = language === 'ar'

      const htmlContent = `
        <!DOCTYPE html>
        <html dir="${isRTL ? 'rtl' : 'ltr'}">
        <head>
          <meta charset="UTF-8">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap');
            * { font-family: 'IBM Plex Sans Arabic', Arial, sans-serif; }
            body { padding: 40px; direction: ${isRTL ? 'rtl' : 'ltr'}; }
            h1 { color: #10b981; margin-bottom: 10px; font-size: 24px; }
            .date { color: #666; margin-bottom: 30px; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: ${isRTL ? 'right' : 'left'}; }
            th { background-color: #10b981; color: white; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <p class="date">${isRTL ? 'المدرب:' : 'Coach:'} ${getCoachName()}</p>
          <table>
            <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
            <tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
          </table>
        </body>
        </html>
      `
      const printWindow = window.open('', '_blank')
      printWindow.document.write(htmlContent)
      printWindow.document.close()
      setTimeout(() => printWindow.print(), 500)
    } catch (err) {
      console.error('Error exporting PDF:', err)
    } finally {
      setExporting(false)
    }
  }

  const exportToExcel = () => {
    setExporting(true)
    try {
      const { headers, rows } = getExportTableData()
      const title = getReportTitle()
      const wsData = [headers, ...rows]
      const ws = XLSX.utils.aoa_to_sheet(wsData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 31))
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      saveAs(data, `${selectedReportType}-report-${Date.now()}.xlsx`)
    } catch (err) {
      console.error('Error exporting Excel:', err)
    } finally {
      setExporting(false)
    }
  }

  const handlePrint = () => {
    const { headers, rows } = getExportTableData()
    const title = getReportTitle()
    const isRTL = language === 'ar'

    const printContent = `
      <!DOCTYPE html>
      <html dir="${isRTL ? 'rtl' : 'ltr'}">
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #10b981; margin-bottom: 10px; }
          .date { color: #666; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: ${isRTL ? 'right' : 'left'}; }
          th { background-color: #10b981; color: white; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p class="date">${isRTL ? 'المدرب:' : 'Coach:'} ${getCoachName()}</p>
        <table>
          <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
          <tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
      </body>
      </html>
    `
    const printWindow = window.open('', '_blank')
    printWindow.document.write(printContent)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { printWindow.print(); printWindow.close() }, 250)
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
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-secondary dark:text-white">
          {language === 'ar' ? 'التقارير' : 'Reports'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {language === 'ar' ? 'إنشاء وتصدير تقارير الأداء والتقييمات' : 'Generate and export performance and evaluation reports'}
        </p>
      </div>

      {/* Report Type Selection */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {reportTypes.map((type) => (
          <GlassCard
            key={type.id}
            onClick={() => {
              setSelectedReportType(type.id)
              setSelectedPlayer(null)
              setSelectedProgram(null)
            }}
            className={`p-4 cursor-pointer transition-all ${
              selectedReportType === type.id
                ? 'border-2 border-emerald-500 shadow-lg shadow-emerald-500/20'
                : 'hover:border-2 hover:border-emerald-200 dark:hover:border-emerald-500/30'
            }`}
          >
            <div className="flex flex-col items-center text-center gap-2">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                selectedReportType === type.id
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                  : 'bg-gray-100 dark:bg-white/10'
              }`}>
                <svg className={`w-6 h-6 ${selectedReportType === type.id ? 'text-white' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={type.icon} />
                </svg>
              </div>
              <span className={`font-semibold text-sm ${selectedReportType === type.id ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-300'}`}>
                {type.label[language]}
              </span>
              <span className="text-xs text-gray-400 hidden md:block">{type.description[language]}</span>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Filters */}
      <GlassCard className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Date Range */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
              {language === 'ar' ? 'الفترة:' : 'Period:'}
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-gray-400">-</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Player selector for player/progress reports */}
          {(selectedReportType === 'player' || selectedReportType === 'progress') && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                {language === 'ar' ? 'اللاعب:' : 'Player:'}
              </label>
              <select
                value={selectedPlayer?.id || ''}
                onChange={(e) => {
                  const player = players.find(p => p.id === e.target.value)
                  setSelectedPlayer(player || null)
                }}
                className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">{language === 'ar' ? 'اختر لاعب...' : 'Select player...'}</option>
                {players.map(player => (
                  <option key={player.id} value={player.id}>
                    {getPlayerName(player)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Program selector for program report */}
          {selectedReportType === 'program' && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                {language === 'ar' ? 'البرنامج:' : 'Program:'}
              </label>
              <select
                value={selectedProgram?.id || ''}
                onChange={(e) => {
                  const program = programs.find(p => p.id === e.target.value)
                  setSelectedProgram(program || null)
                }}
                className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">{language === 'ar' ? 'اختر برنامج...' : 'Select program...'}</option>
                {programs.map(program => (
                  <option key={program.id} value={program.id}>
                    {language === 'ar' ? (program.name_ar || program.name) : program.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Export Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button 
          onClick={exportToPDF} 
          disabled={exporting}
          className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
        >
          <svg className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          {language === 'ar' ? 'تصدير PDF' : 'Export PDF'}
        </Button>
        <Button 
          onClick={exportToExcel} 
          disabled={exporting}
          className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
        >
          <svg className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {language === 'ar' ? 'تصدير Excel' : 'Export Excel'}
        </Button>
        <Button 
          onClick={handlePrint} 
          disabled={exporting}
          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
        >
          <svg className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          {language === 'ar' ? 'طباعة' : 'Print'}
        </Button>
      </div>

      {/* Report Preview */}
      <GlassCard className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-secondary dark:text-white">{getReportTitle()}</h2>
          <p className="text-sm text-gray-500">
            {formatDate(dateRange.start)} - {formatDate(dateRange.end)}
          </p>
        </div>

        {/* Show message if selection needed */}
        {((selectedReportType === 'player' || selectedReportType === 'progress') && !selectedPlayer) && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <p className="text-gray-500">{language === 'ar' ? 'اختر لاعباً لعرض التقرير' : 'Select a player to view the report'}</p>
          </div>
        )}

        {(selectedReportType === 'program' && !selectedProgram) && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-gray-500">{language === 'ar' ? 'اختر برنامجاً لعرض التقرير' : 'Select a program to view the report'}</p>
          </div>
        )}

        {/* Table */}
        {(selectedReportType === 'evaluation' || 
          (selectedReportType === 'player' && selectedPlayer) || 
          (selectedReportType === 'program' && selectedProgram) ||
          (selectedReportType === 'progress' && selectedPlayer)) && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10">
                  {getReportTableData().headers.map((header, idx) => (
                    <th key={idx} className="py-3 px-4 text-left rtl:text-right font-semibold text-gray-700 dark:text-gray-300 bg-emerald-50 dark:bg-emerald-500/10">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {getReportTableData().rows.map((row, rowIdx) => (
                  <tr key={rowIdx} className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5">
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx} className="py-3 px-4 text-gray-600 dark:text-gray-300">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* No data state */}
        {evaluations.length === 0 && selectedReportType === 'evaluation' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-500 mb-2">{language === 'ar' ? 'لا توجد تقييمات في هذه الفترة' : 'No evaluations in this period'}</p>
            <p className="text-sm text-gray-400">{language === 'ar' ? 'قم بإضافة تقييمات للاعبين لعرض التقارير' : 'Add player evaluations to view reports'}</p>
          </div>
        )}
      </GlassCard>
    </div>
  )
}
