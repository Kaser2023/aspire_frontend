import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { useAuth } from '../../hooks/useAuth'
import { statsService, playersService, usersService, attendanceService } from '../../services'
import GlassCard from '../../components/ui/GlassCard'
import Button from '../../components/ui/Button'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

export default function Reports() {
  const { language } = useLanguage()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [reportType, setReportType] = useState('comprehensive')
  const [branchStats, setBranchStats] = useState(null)
  const [players, setPlayers] = useState([])
  const [coaches, setCoaches] = useState([])
  const [attendanceData, setAttendanceData] = useState([])
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0])

  const reportTypes = [
    { id: 'comprehensive', label: { en: 'Comprehensive Report', ar: 'تقرير شامل' }, icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { id: 'players', label: { en: 'Players Report', ar: 'تقرير اللاعبين' }, icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { id: 'coaches', label: { en: 'Coaches Report', ar: 'تقرير المدربين' }, icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'attendance', label: { en: 'Attendance Report', ar: 'تقرير الحضور' }, icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  ]

  const fetchData = useCallback(async () => {
    if (!user?.branch_id) return
    try {
      setLoading(true)
      const [statsRes, playersRes, coachesRes] = await Promise.all([
        statsService.getBranchStats(user.branch_id),
        playersService.getAll({ branch_id: user.branch_id, limit: 500 }),
        usersService.getByRole('coach', { branch_id: user.branch_id, limit: 100 })
      ])
      if (statsRes.success) setBranchStats(statsRes.data)
      if (playersRes.success) setPlayers(playersRes.data || [])
      if (coachesRes.success) setCoaches(coachesRes.data || [])
    } catch (err) {
      console.error('Error fetching report data:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.branch_id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Fetch attendance when date changes
  useEffect(() => {
    const fetchAttendanceForDate = async () => {
      if (!user?.branch_id || !reportDate) return
      try {
        console.log('Fetching attendance for date:', reportDate)
        const response = await attendanceService.getPlayersForAttendance(reportDate, { branch_id: user.branch_id })
        if (response.success) {
          console.log('Attendance data:', response.data)
          setAttendanceData(response.data || [])
        }
      } catch (err) {
        console.error('Error fetching attendance:', err)
      }
    }
    fetchAttendanceForDate()
  }, [user?.branch_id, reportDate])

  const getReportTitle = () => {
    const type = reportTypes.find(t => t.id === reportType)
    return type?.label[language] || 'Report'
  }

  const getAttendanceSummary = () => {
    const total = attendanceData.length
    if (total === 0) return { present: 0, absent: 0, late: 0, excused: 0, total: 0, rate: 0 }
    const present = attendanceData.filter(a => a.status === 'present').length
    const absent = attendanceData.filter(a => a.status === 'absent').length
    const late = attendanceData.filter(a => a.status === 'late').length
    const excused = attendanceData.filter(a => a.status === 'leave').length
    return { present, absent, late, excused, total, rate: total > 0 ? Math.round(((present + late) / total) * 100) : 0 }
  }

  const getBranchName = () => {
    return language === 'ar' 
      ? (user?.branch?.name_ar || user?.branch?.name || branchStats?.branch_name || '')
      : (user?.branch?.name || branchStats?.branch_name || '')
  }

  const getAdminName = () => {
    return language === 'ar'
      ? (user?.name_ar || `${user?.first_name || ''} ${user?.last_name || ''}`.trim())
      : `${user?.first_name || ''} ${user?.last_name || ''}`.trim()
  }

  // Simple data for website preview
  const getReportTableData = () => {
    const headers = language === 'ar' ? ['البند', 'القيمة'] : ['Item', 'Value']
    let rows = []
    const activePlayers = players.filter(p => p.status === 'active').length
    const inactivePlayers = players.filter(p => p.status !== 'active').length
    const activeCoaches = coaches.filter(c => c.is_active !== false).length
    const summary = getAttendanceSummary()

    if (reportType === 'comprehensive') {
      rows = [
        [language === 'ar' ? 'إجمالي اللاعبين' : 'Total Players', branchStats?.player_count || players.length || 0],
        [language === 'ar' ? 'اللاعبين النشطين' : 'Active Players', activePlayers],
        [language === 'ar' ? 'إجمالي المدربين' : 'Total Coaches', branchStats?.coach_count || coaches.length || 0],
        [language === 'ar' ? 'إجمالي البرامج' : 'Total Programs', branchStats?.program_count || 0],
        [language === 'ar' ? 'معدل الحضور اليوم' : 'Today Attendance Rate', `${branchStats?.today_attendance_rate || 0}%`],
      ]
    } else if (reportType === 'players') {
      rows = [
        [language === 'ar' ? 'إجمالي اللاعبين' : 'Total Players', players.length],
        [language === 'ar' ? 'اللاعبين النشطين' : 'Active Players', activePlayers],
        [language === 'ar' ? 'اللاعبين غير النشطين' : 'Inactive Players', inactivePlayers],
      ]
    } else if (reportType === 'coaches') {
      rows = [
        [language === 'ar' ? 'إجمالي المدربين' : 'Total Coaches', coaches.length],
        [language === 'ar' ? 'المدربين النشطين' : 'Active Coaches', activeCoaches],
      ]
    } else if (reportType === 'attendance') {
      rows = [
        [language === 'ar' ? 'إجمالي اللاعبين' : 'Total Players', summary.total],
        [language === 'ar' ? 'حاضر' : 'Present', summary.present],
        [language === 'ar' ? 'غائب' : 'Absent', summary.absent],
        [language === 'ar' ? 'متأخر' : 'Late', summary.late],
        [language === 'ar' ? 'معذور' : 'Excused', summary.excused],
        [language === 'ar' ? 'معدل الحضور' : 'Attendance Rate', `${summary.rate}%`],
      ]
    }
    return { headers, rows }
  }

  // Format selected date for display
  const getFormattedReportDate = () => {
    const date = new Date(reportDate)
    return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')
  }

  // Detailed data for PDF/Print export
  const getExportTableData = () => {
    const headers = language === 'ar' ? ['البند', 'القيمة'] : ['Item', 'Value']
    let rows = []
    const activePlayers = players.filter(p => p.status === 'active').length
    const inactivePlayers = players.filter(p => p.status !== 'active').length
    const activeCoaches = coaches.filter(c => c.is_active !== false).length
    const summary = getAttendanceSummary()

    if (reportType === 'comprehensive') {
      rows = [
        // Branch Info Section
        [language === 'ar' ? '═══ معلومات الفرع ═══' : '═══ Branch Info ═══', ''],
        [language === 'ar' ? 'اسم الفرع' : 'Branch Name', getBranchName() || '-'],
        [language === 'ar' ? 'مدير الفرع' : 'Branch Admin', getAdminName() || '-'],
        [language === 'ar' ? 'تاريخ التقرير' : 'Report Date', getFormattedReportDate()],
        [language === 'ar' ? 'وقت التقرير' : 'Report Time', new Date().toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US')],
        // Players Section
        [language === 'ar' ? '═══ إحصائيات اللاعبين ═══' : '═══ Players Statistics ═══', ''],
        [language === 'ar' ? 'إجمالي اللاعبين' : 'Total Players', branchStats?.player_count || players.length || 0],
        [language === 'ar' ? 'اللاعبين النشطين' : 'Active Players', activePlayers],
        [language === 'ar' ? 'اللاعبين غير النشطين' : 'Inactive Players', inactivePlayers],
        // Coaches Section
        [language === 'ar' ? '═══ إحصائيات المدربين ═══' : '═══ Coaches Statistics ═══', ''],
        [language === 'ar' ? 'إجمالي المدربين' : 'Total Coaches', branchStats?.coach_count || coaches.length || 0],
        [language === 'ar' ? 'المدربين النشطين' : 'Active Coaches', activeCoaches],
        // Programs Section
        [language === 'ar' ? '═══ إحصائيات البرامج ═══' : '═══ Programs Statistics ═══', ''],
        [language === 'ar' ? 'إجمالي البرامج' : 'Total Programs', branchStats?.program_count || 0],
        // Attendance Section
        [language === 'ar' ? '═══ إحصائيات الحضور ═══' : '═══ Attendance Statistics ═══', ''],
        [language === 'ar' ? 'إجمالي اللاعبين' : 'Total Players', summary.total],
        [language === 'ar' ? 'حاضر' : 'Present', summary.present],
        [language === 'ar' ? 'غائب' : 'Absent', summary.absent],
        [language === 'ar' ? 'متأخر' : 'Late', summary.late],
        [language === 'ar' ? 'معذور' : 'Excused', summary.excused],
        [language === 'ar' ? 'معدل الحضور' : 'Attendance Rate', `${summary.rate}%`],
      ]
    } else if (reportType === 'players') {
      rows = [
        [language === 'ar' ? 'اسم الفرع' : 'Branch Name', getBranchName() || '-'],
        [language === 'ar' ? 'مدير الفرع' : 'Branch Admin', getAdminName() || '-'],
        [language === 'ar' ? 'تاريخ التقرير' : 'Report Date', getFormattedReportDate()],
        [language === 'ar' ? '═══ إحصائيات اللاعبين ═══' : '═══ Players Statistics ═══', ''],
        [language === 'ar' ? 'إجمالي اللاعبين' : 'Total Players', players.length],
        [language === 'ar' ? 'اللاعبين النشطين' : 'Active Players', activePlayers],
        [language === 'ar' ? 'اللاعبين غير النشطين' : 'Inactive Players', inactivePlayers],
        [language === 'ar' ? 'نسبة النشطين' : 'Active Rate', players.length > 0 ? `${Math.round((activePlayers / players.length) * 100)}%` : '0%'],
      ]
    } else if (reportType === 'coaches') {
      rows = [
        [language === 'ar' ? 'اسم الفرع' : 'Branch Name', getBranchName() || '-'],
        [language === 'ar' ? 'مدير الفرع' : 'Branch Admin', getAdminName() || '-'],
        [language === 'ar' ? 'تاريخ التقرير' : 'Report Date', getFormattedReportDate()],
        [language === 'ar' ? '═══ إحصائيات المدربين ═══' : '═══ Coaches Statistics ═══', ''],
        [language === 'ar' ? 'إجمالي المدربين' : 'Total Coaches', coaches.length],
        [language === 'ar' ? 'المدربين النشطين' : 'Active Coaches', activeCoaches],
        [language === 'ar' ? 'متوسط اللاعبين لكل مدرب' : 'Avg Players per Coach', coaches.length > 0 ? Math.round(players.length / coaches.length) : 0],
      ]
    } else if (reportType === 'attendance') {
      rows = [
        [language === 'ar' ? 'اسم الفرع' : 'Branch Name', getBranchName() || '-'],
        [language === 'ar' ? 'مدير الفرع' : 'Branch Admin', getAdminName() || '-'],
        [language === 'ar' ? 'تاريخ التقرير' : 'Report Date', getFormattedReportDate()],
        [language === 'ar' ? '═══ إحصائيات الحضور ═══' : '═══ Attendance Statistics ═══', ''],
        [language === 'ar' ? 'إجمالي اللاعبين' : 'Total Players', summary.total],
        [language === 'ar' ? 'حاضر' : 'Present', summary.present],
        [language === 'ar' ? 'غائب' : 'Absent', summary.absent],
        [language === 'ar' ? 'متأخر' : 'Late', summary.late],
        [language === 'ar' ? 'معذور' : 'Excused', summary.excused],
        [language === 'ar' ? 'معدل الحضور' : 'Attendance Rate', `${summary.rate}%`],
      ]
    }
    return { headers, rows }
  }

  const exportToPDF = () => {
    setExporting(true)
    try {
      const { headers, rows } = getExportTableData()
      const title = getReportTitle()
      const date = new Date().toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')
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
            h1 { color: #6366f1; margin-bottom: 10px; font-size: 24px; }
            .date { color: #666; margin-bottom: 30px; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: ${isRTL ? 'right' : 'left'}; }
            th { background-color: #6366f1; color: white; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <p class="date">${isRTL ? 'التاريخ:' : 'Date:'} ${date}</p>
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
      XLSX.utils.book_append_sheet(wb, ws, title)
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      saveAs(data, `${reportType}-report-${Date.now()}.xlsx`)
    } catch (err) {
      console.error('Error exporting Excel:', err)
    } finally {
      setExporting(false)
    }
  }

  const handlePrint = () => {
    const { headers, rows } = getExportTableData()
    const title = getReportTitle()
    const date = new Date().toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')
    const isRTL = language === 'ar'

    const printContent = `
      <!DOCTYPE html>
      <html dir="${isRTL ? 'rtl' : 'ltr'}">
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #6366f1; margin-bottom: 10px; }
          .date { color: #666; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: ${isRTL ? 'right' : 'left'}; }
          th { background-color: #6366f1; color: white; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p class="date">${isRTL ? 'التاريخ:' : 'Date:'} ${date}</p>
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
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-secondary dark:text-white">
          {language === 'ar' ? 'التقارير' : 'Reports'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {language === 'ar' ? 'إنشاء وتصدير تقارير مفصلة' : 'Generate and export detailed reports'}
        </p>
      </div>

      {/* Report Types */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {reportTypes.map((type) => (
          <GlassCard
            key={type.id}
            onClick={() => setReportType(type.id)}
            className={`p-4 cursor-pointer transition-all ${
              reportType === type.id
                ? 'border-2 border-indigo-500 shadow-lg shadow-indigo-500/20'
                : 'hover:border-2 hover:border-indigo-200 dark:hover:border-indigo-500/30'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                reportType === type.id
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500'
                  : 'bg-gray-100 dark:bg-white/10'
              }`}>
                <svg className={`w-5 h-5 ${reportType === type.id ? 'text-white' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={type.icon} />
                </svg>
              </div>
              <span className={`font-semibold text-sm ${reportType === type.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-300'}`}>
                {type.label[language]}
              </span>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Date Selector */}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {language === 'ar' ? 'تاريخ التقرير:' : 'Report Date:'}
          </label>
          <input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <p className="text-sm text-gray-500">
          {language === 'ar' ? 'التاريخ المحدد:' : 'Selected:'} <span className="font-semibold text-indigo-600">{getFormattedReportDate()}</span>
        </p>
      </div>

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
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-white/10">
                {getReportTableData().headers.map((header, idx) => (
                  <th key={idx} className="py-3 px-4 text-left rtl:text-right font-semibold text-gray-700 dark:text-gray-300 bg-indigo-50 dark:bg-indigo-500/10">
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
      </GlassCard>
    </div>
  )
}
