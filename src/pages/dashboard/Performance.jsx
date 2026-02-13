import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { useAuth } from '../../hooks/useAuth'
import { playersService, evaluationService } from '../../services'
import GlassCard from '../../components/ui/GlassCard'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

export default function Performance() {
  const { language } = useLanguage()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [children, setChildren] = useState([])
  const [selectedChild, setSelectedChild] = useState('')
  const [evaluations, setEvaluations] = useState([])
  const [filterDate, setFilterDate] = useState('') // '' means all time
  const [filterMode, setFilterMode] = useState('all') // 'all' | 'date'

  const fetchData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const childrenRes = await playersService.getByParent(user.id)
      if (childrenRes.success && childrenRes.data) {
        const normalizedChildren = (childrenRes.data || []).map((child) => {
          const firstName = child.first_name || child.firstName || ''
          const lastName = child.last_name || child.lastName || ''
          const fullName = `${firstName} ${lastName}`.trim()
          const fullNameAr = child.first_name_ar
            ? `${child.first_name_ar} ${child.last_name_ar || ''}`.trim()
            : fullName
          return {
            ...child,
            name: {
              en: child.name?.en || fullName || child.name?.ar || child.name || '',
              ar: child.name?.ar || fullNameAr || fullName || child.name?.en || child.name || ''
            }
          }
        })
        setChildren(normalizedChildren)
        if (normalizedChildren.length > 0) {
          setSelectedChild((prev) => prev || String(normalizedChildren[0].id))
        }
      }
    } catch (err) {
      console.error('Error fetching performance data:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const fetchPerformance = useCallback(async () => {
    if (!selectedChild) {
      setEvaluations([])
      return
    }
    try {
      if (selectedChild === 'all') {
        const childIds = children.map((child) => child.id)
        if (childIds.length === 0) {
          setEvaluations([])
          return
        }

        const evalRequests = childIds.map((id) => evaluationService.getByPlayer(id, { limit: 100 }))
        const evalResults = await Promise.all(evalRequests)

        const combinedEvaluations = evalResults
          .filter((res) => res.success)
          .flatMap((res) => res.data || [])
          .map((item) => ({
            ...item,
            __childId: item.player_id || item.player?.id || item.playerId
          }))

        const sortedEvaluations = [...combinedEvaluations].sort((a, b) => {
          const aDate = new Date(a.evaluation_date || a.created_at || 0)
          const bDate = new Date(b.evaluation_date || b.created_at || 0)
          return bDate - aDate
        })
        setEvaluations(sortedEvaluations)
      } else {
        const evalRes = await evaluationService.getByPlayer(selectedChild, { limit: 100 })

        if (evalRes.success) {
          setEvaluations(evalRes.data || [])
        } else {
          setEvaluations([])
        }
      }
    } catch (err) {
      console.error('Error fetching evaluations:', err)
      setEvaluations([])
    }
  }, [selectedChild, children])

  useEffect(() => {
    fetchPerformance()
  }, [fetchPerformance])

  // Filter evaluations by selected date
  const filteredEvaluations = filterMode === 'all' || !filterDate
    ? evaluations
    : evaluations.filter((evaluation) => {
        const dateStr = evaluation.session?.date || evaluation.evaluation_date || ''
        const dateKey = dateStr ? dateStr.substring(0, 10) : ''
        return dateKey === filterDate
      })

  // Get unique dates for reference
  const availableDates = [...new Set(
    evaluations.map((e) => {
      const dateStr = e.session?.date || e.evaluation_date || ''
      return dateStr ? dateStr.substring(0, 10) : ''
    }).filter(Boolean)
  )].sort((a, b) => b.localeCompare(a))

  const renderStars = (rating) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-5 h-5 ${star <= Math.round(rating) ? 'text-primary' : 'text-gray-300 dark:text-gray-600'}`}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        ))}
      </div>
    )
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '--'
    const date = new Date(dateStr)
    if (Number.isNaN(date.getTime())) return '--'
    return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')
  }

  const getChildDisplayName = (childId) => {
    if (childId === 'all') {
      return language === 'ar' ? 'جميع اللاعبين' : 'All Players'
    }
    const child = children.find((item) => String(item.id) === String(childId))
    return child?.name?.[language] || child?.name?.en || child?.name?.ar || ''
  }

  const getReportTitle = () => {
    const playerName = getChildDisplayName(selectedChild)
    const dateLabel = filterMode === 'all'
      ? (language === 'ar' ? 'كل الفترات' : 'All Time')
      : formatDate(filterDate)
    return language === 'ar'
      ? `تقرير التقييمات - ${playerName} - ${dateLabel}`
      : `Evaluations Report - ${playerName} - ${dateLabel}`
  }

  const skillLabels = [
    { key: 'ball_control', label: { en: 'Ball Control', ar: 'التحكم بالكرة' } },
    { key: 'passing', label: { en: 'Passing', ar: 'التمرير' } },
    { key: 'shooting', label: { en: 'Shooting', ar: 'التسديد' } },
    { key: 'dribbling', label: { en: 'Dribbling', ar: 'المراوغة' } },
    { key: 'speed', label: { en: 'Speed', ar: 'السرعة' } },
    { key: 'stamina', label: { en: 'Stamina', ar: 'اللياقة' } },
    { key: 'strength', label: { en: 'Strength', ar: 'القوة' } },
    { key: 'agility', label: { en: 'Agility', ar: 'الرشاقة' } },
    { key: 'attitude', label: { en: 'Attitude', ar: 'السلوك' } },
    { key: 'discipline', label: { en: 'Discipline', ar: 'الانضباط' } },
    { key: 'teamwork', label: { en: 'Teamwork', ar: 'العمل الجماعي' } },
    { key: 'effort', label: { en: 'Effort', ar: 'الالتزام' } }
  ]

  const getExportRows = () => {
    const isAr = language === 'ar'
    const headers = isAr
      ? ['التاريخ', 'المدرب', 'النوع', 'التقييم العام', 'الأهداف', ...skillLabels.map(s => s.label.ar), 'ملاحظات']
      : ['Date', 'Coach', 'Type', 'Overall Rating', 'Goals', ...skillLabels.map(s => s.label.en), 'Notes']

    if (selectedChild === 'all') {
      headers.splice(1, 0, isAr ? 'اللاعب' : 'Player')
    }

    const rows = filteredEvaluations.map((evaluation) => {
      const sessionDate = formatDate(evaluation.session?.date || evaluation.evaluation_date)
      const coachName = evaluation.coach
        ? `${evaluation.coach.first_name || ''} ${evaluation.coach.last_name || ''}`.trim()
        : '--'
      const evalType = evaluation.evaluation_type === 'detailed'
        ? (isAr ? 'تفصيلي' : 'Detailed')
        : (isAr ? 'سريع' : 'Quick')
      const rating = evaluation.overall_rating ?? '--'
      const goals = evaluation.goals ?? 0

      const skillValues = skillLabels.map((skill) => evaluation[skill.key] ?? '')
      const notes = evaluation.notes || ''

      const row = [sessionDate, coachName, evalType, rating, goals, ...skillValues, notes]
      if (selectedChild === 'all') {
        const childName = getChildDisplayName(evaluation.__childId || evaluation.player_id || evaluation.player?.id)
        row.splice(1, 0, childName)
      }
      return row
    })

    return { headers, rows }
  }

  // Helper: build the HTML template used by both PDF and Print (same as Reports page)
  const buildHtmlReport = (title, date, headers, rows, isRTL) => {
    const colCount = headers.length
    // Scale font size based on number of columns so table fits on page
    const fontSize = colCount > 12 ? '9px' : colCount > 8 ? '10px' : '12px'
    const cellPad = colCount > 12 ? '4px 5px' : colCount > 8 ? '6px 7px' : '8px 10px'
    return `
      <!DOCTYPE html>
      <html dir="${isRTL ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap');
          * { font-family: 'IBM Plex Sans Arabic', Arial, sans-serif; margin: 0; padding: 0; box-sizing: border-box; }
          body { padding: 20px; direction: ${isRTL ? 'rtl' : 'ltr'}; }
          h1 { color: #7c3aed; margin-bottom: 6px; font-size: 18px; }
          .date { color: #666; margin-bottom: 12px; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; font-size: ${fontSize}; table-layout: auto; }
          th, td { border: 1px solid #ddd; padding: ${cellPad}; text-align: ${isRTL ? 'right' : 'left'}; white-space: nowrap; }
          th { background-color: #7c3aed; color: white; font-weight: bold; font-size: ${fontSize}; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          td.notes-col { white-space: normal; max-width: 180px; word-wrap: break-word; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
          @page { size: landscape; margin: 8mm; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p class="date">${isRTL ? 'التاريخ:' : 'Date:'} ${date}</p>
        <table>
          <thead>
            <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${rows.map(row => `<tr>${row.map((cell, i) => `<td${i === row.length - 1 ? ' class="notes-col"' : ''}>${cell}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `
  }

  // Export to PDF (same as Reports page)
  const exportToPDF = () => {
    setExporting(true)
    try {
      const { headers, rows } = getExportRows()
      const title = getReportTitle()
      const date = new Date().toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')
      const isRTL = language === 'ar'

      const htmlContent = buildHtmlReport(title, date, headers, rows, isRTL)

      const printWindow = window.open('', '_blank')
      printWindow.document.write(htmlContent)
      printWindow.document.close()

      // Wait for fonts to load then print
      setTimeout(() => {
        printWindow.print()
      }, 500)
    } catch (err) {
      console.error('Error exporting PDF:', err)
    } finally {
      setExporting(false)
    }
  }

  // Export to Excel (same as Reports page)
  const exportToExcel = () => {
    setExporting(true)
    try {
      const { headers, rows } = getExportRows()
      const title = getReportTitle()

      const wsData = [headers, ...rows]
      const ws = XLSX.utils.aoa_to_sheet(wsData)

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 31))

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const fileName = filterMode === 'all'
        ? `evaluations-all-${Date.now()}.xlsx`
        : `evaluations-${filterDate}-${Date.now()}.xlsx`
      saveAs(data, fileName)
    } catch (err) {
      console.error('Error exporting Excel:', err)
    } finally {
      setExporting(false)
    }
  }

  // Print report (same as Reports page)
  const handlePrint = () => {
    const { headers, rows } = getExportRows()
    const title = getReportTitle()
    const date = new Date().toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')
    const isRTL = language === 'ar'

    const printContent = buildHtmlReport(title, date, headers, rows, isRTL)

    const printWindow = window.open('', '_blank')
    printWindow.document.write(printContent)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <svg className="w-12 h-12 text-primary animate-spin mx-auto mb-4" fill="none" viewBox="0 0 24 24">
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
            {language === 'ar' ? 'تقييمات الجلسات' : 'Session Evaluations'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {language === 'ar' ? 'عرض تقييمات وأداء اللاعب' : 'View player evaluations and performance'}
          </p>
        </div>
        {children.length > 0 && (
          <select
            value={selectedChild}
            onChange={(e) => setSelectedChild(e.target.value)}
            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">{language === 'ar' ? 'جميع اللاعبين' : 'All Players'}</option>
            {children.map((child) => (
              <option key={child.id} value={String(child.id)}>
                {child.name?.[language] || child.name?.en || child.name?.ar || ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Empty State */}
      {children.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-primary/20 to-yellow-300/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-secondary dark:text-white mb-2">
            {language === 'ar' ? 'لا توجد بيانات أداء بعد' : 'No Performance Data Yet'}
          </h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            {language === 'ar'
              ? 'قم بتسجيل اللاعب في برنامج لبدء تتبع الأداء والتقييمات'
              : 'Enroll your player in a program to start tracking performance and evaluations'}
          </p>
        </GlassCard>
      ) : (
        <>
          {/* Filters & Actions Bar */}
          <GlassCard className="p-3 sm:p-4">
            {/* Row 1: Date Filter + Count */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div className="flex items-center bg-gray-100 dark:bg-white/10 rounded-lg p-0.5">
                <button
                  onClick={() => { setFilterMode('all'); setFilterDate('') }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    filterMode === 'all'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'
                  }`}
                >
                  {language === 'ar' ? 'كل الفترات' : 'All Time'}
                </button>
                <button
                  onClick={() => {
                    setFilterMode('date')
                    if (!filterDate && availableDates.length > 0) {
                      setFilterDate(availableDates[0])
                    }
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    filterMode === 'date'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'
                  }`}
                >
                  {language === 'ar' ? 'حسب التاريخ' : 'By Date'}
                </button>
              </div>
              {filterMode === 'date' && (
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              )}
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {(filterMode === 'all' ? evaluations.length : filteredEvaluations.length)} {language === 'ar' ? 'تقييم' : 'evaluation'}{(filterMode === 'all' ? evaluations.length : filteredEvaluations.length) !== 1 && language !== 'ar' ? 's' : ''}
              </span>
            </div>

            {/* Row 2: Export & Print Buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={exportToPDF}
                disabled={exporting || filteredEvaluations.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                PDF
              </button>
              <button
                onClick={exportToExcel}
                disabled={exporting || filteredEvaluations.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Excel
              </button>
              <button
                onClick={handlePrint}
                disabled={exporting || filteredEvaluations.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                {language === 'ar' ? 'طباعة' : 'Print'}
              </button>
            </div>
          </GlassCard>

          {/* Session Evaluations */}
          <GlassCard className="p-6">
            {filteredEvaluations.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-lg font-medium mb-1">
                  {filterMode === 'date' && filterDate
                    ? (language === 'ar' ? 'لا توجد تقييمات في هذا التاريخ' : 'No evaluations on this date')
                    : (language === 'ar' ? 'لا توجد تقييمات بعد' : 'No evaluations yet')}
                </p>
                {filterMode === 'date' && filterDate && (
                  <button
                    onClick={() => { setFilterMode('all'); setFilterDate('') }}
                    className="mt-3 text-primary hover:text-primary/80 text-sm font-medium"
                  >
                    {language === 'ar' ? 'عرض كل الفترات' : 'Show all time'}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredEvaluations.map((evaluation) => {
                  const sessionDate = evaluation.session?.date || evaluation.evaluation_date
                  return (
                    <div key={evaluation.id} className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                      {/* Header row */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-secondary dark:text-white">
                            {formatDate(sessionDate)}
                          </span>
                          {evaluation.session?.start_time && (
                            <span className="text-xs text-gray-500 bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded-full">
                              {evaluation.session.start_time.substring(0, 5)}
                            </span>
                          )}
                          {selectedChild === 'all' && (
                            <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                              {getChildDisplayName(evaluation.__childId || evaluation.player_id || evaluation.player?.id)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            evaluation.evaluation_type === 'detailed'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
                              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400'
                          }`}>
                            {evaluation.evaluation_type === 'detailed'
                              ? (language === 'ar' ? 'تفصيلي' : 'Detailed')
                              : (language === 'ar' ? 'سريع' : 'Quick')}
                          </span>
                          <span className="text-sm text-gray-500">
                            {evaluation.coach
                              ? `${evaluation.coach.first_name || ''} ${evaluation.coach.last_name || ''}`.trim()
                              : '--'}
                          </span>
                        </div>
                      </div>

                      {/* Rating & Goals */}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-300 mb-2">
                        {evaluation.overall_rating && (
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            {evaluation.overall_rating}/5
                          </span>
                        )}
                        {(evaluation.goals > 0) && (
                          <span>⚽ {evaluation.goals} {language === 'ar' ? 'أهداف' : 'goals'}</span>
                        )}
                      </div>

                      {/* Detailed skills */}
                      {evaluation.evaluation_type === 'detailed' && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 mb-2">
                          {skillLabels.map((skill) => {
                            const value = evaluation[skill.key]
                            if (!value) return null
                            return (
                              <div key={skill.key} className="flex items-center justify-between text-xs px-2 py-1 bg-white dark:bg-white/5 rounded-lg">
                                <span className="text-gray-500 dark:text-gray-400">{skill.label[language]}</span>
                                <span className="font-semibold text-secondary dark:text-white">{value}/5</span>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Notes / Coach Feedback */}
                      {evaluation.notes && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 p-2 bg-white/50 dark:bg-white/5 rounded-lg italic">
                          &ldquo;{evaluation.notes}&rdquo;
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </GlassCard>
        </>
      )}
    </div>
  )
}
