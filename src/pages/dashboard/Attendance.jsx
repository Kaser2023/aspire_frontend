import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { useAuth } from '../../hooks/useAuth'
import { playersService, attendanceService } from '../../services'
import GlassCard from '../../components/ui/GlassCard'
import Button from '../../components/ui/Button'

export default function Attendance() {
  const { language } = useLanguage()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [children, setChildren] = useState([])
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [selectedChild, setSelectedChild] = useState('')
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const fetchData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const childrenRes = await playersService.getByParent(user.id)
      if (childrenRes.success && childrenRes.data) {
        const transformedChildren = childrenRes.data.map((child) => ({
          id: child.id,
          name: {
            en: `${child.first_name || ''} ${child.last_name || ''}`.trim(),
            ar: child.first_name_ar
              ? `${child.first_name_ar} ${child.last_name_ar || ''}`.trim()
              : `${child.first_name || ''} ${child.last_name || ''}`.trim()
          },
          fullName: `${child.first_name || ''} ${child.last_name || ''}`.trim()
        }))
        setChildren(transformedChildren)
        if (transformedChildren.length > 0) {
          setSelectedChild(String(transformedChildren[0].id))
        }

        const attendanceResponses = await Promise.all(
          transformedChildren.map((child) => attendanceService.getByPlayer(child.id, { limit: 200 }))
        )
        const allRecords = attendanceResponses.flatMap((attRes) => (
          attRes.success && attRes.data ? attRes.data : []
        ))
        setAttendanceRecords(allRecords)
      }
    } catch (err) {
      console.error('Error fetching attendance:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Generate calendar data
  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay()

    const days = []
    for (let i = 0; i < startingDay; i++) {
      days.push(null)
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }
    return days
  }

  const days = getDaysInMonth(currentMonth)
  const weekDays = language === 'ar'
    ? ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const changeMonth = (delta) => {
    const newDate = new Date(currentMonth)
    newDate.setMonth(newDate.getMonth() + delta)
    setCurrentMonth(newDate)
  }

  const selectedChildId = selectedChild || null
  const filteredRecords = selectedChildId
    ? attendanceRecords.filter((record) => String(record.player_id) === String(selectedChildId))
    : []

  const isSameMonth = (dateStr) => {
    if (!dateStr) return false
    const date = new Date(dateStr)
    return date.getFullYear() === currentMonth.getFullYear()
      && date.getMonth() === currentMonth.getMonth()
  }

  const monthRecords = filteredRecords.filter((record) => isSameMonth(record.session_date))

  const attendanceStats = monthRecords.reduce((acc, record) => {
    const status = record.status
    acc.total += 1
    if (status === 'present') {
      acc.attended += 1
    } else if (status === 'late') {
      acc.late += 1
    } else if (status === 'absent') {
      acc.absent += 1
    } else if (status === 'leave') {
      acc.leave += 1
    }
    return acc
  }, {
    total: 0,
    attended: 0,
    late: 0,
    absent: 0,
    leave: 0
  })

  const attendancePercent = attendanceStats.total > 0
    ? Math.round(((attendanceStats.attended + attendanceStats.late) / attendanceStats.total) * 100)
    : 0

  const normalizeStatus = (status) => status

  const getDayStatus = (day) => {
    if (!day) return null
    const year = currentMonth.getFullYear()
    const month = String(currentMonth.getMonth() + 1).padStart(2, '0')
    const dayStr = String(day).padStart(2, '0')
    const dateKey = `${year}-${month}-${dayStr}`
    const dayRecords = monthRecords.filter((record) => record.session_date === dateKey)
    if (dayRecords.length === 0) return null
    const statuses = new Set(dayRecords.map((record) => normalizeStatus(record.status)))
    if (statuses.size === 1) return Array.from(statuses)[0]
    return 'mixed'
  }

  const getDayStatusForRecords = (records, day) => {
    if (!day) return null
    const year = currentMonth.getFullYear()
    const month = String(currentMonth.getMonth() + 1).padStart(2, '0')
    const dayStr = String(day).padStart(2, '0')
    const dateKey = `${year}-${month}-${dayStr}`
    const dayRecords = records.filter((record) => record.session_date === dateKey)
    if (dayRecords.length === 0) return null
    const statuses = new Set(dayRecords.map((record) => normalizeStatus(record.status)))
    if (statuses.size === 1) return Array.from(statuses)[0]
    return 'mixed'
  }

  const dayStatusClass = (status) => {
    switch (status) {
      case 'present':
        return 'bg-green-500 text-white'
      case 'late':
        return 'bg-orange-500 text-white'
      case 'absent':
        return 'bg-red-500 text-white'
      case 'leave':
        return 'bg-yellow-500 text-white'
      case 'mixed':
        return 'bg-yellow-400 text-white'
      default:
        return 'bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300'
    }
  }

  const playerNameById = children.reduce((acc, child) => {
    acc[String(child.id)] = child.name?.[language] || child.fullName
    return acc
  }, {})

  const recentRecords = [...filteredRecords]
    .sort((a, b) => new Date(b.session_date) - new Date(a.session_date))
    .slice(0, 6)

  const selectedChildName = children.find((child) => String(child.id) === String(selectedChildId))?.name?.[language] || ''

  const getAttendanceTableData = (childName, stats) => {
    const isRTL = language === 'ar'
    const monthLabel = currentMonth.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'long', year: 'numeric' })
    const attendanceRate = stats.total > 0 ? Math.round((stats.attended / stats.total) * 100) : 0

    const headers = [isRTL ? 'البند' : 'Item', isRTL ? 'القيمة' : 'Value']
    const rows = [
      [isRTL ? 'التاريخ' : 'Date', new Date().toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')],
      [isRTL ? 'اللاعب' : 'Player', childName],
      [isRTL ? 'الشهر' : 'Month', monthLabel],
      [isRTL ? 'إجمالي الجلسات' : 'Total Sessions', stats.total],
      [isRTL ? 'حضور' : 'Present', stats.attended],
      [isRTL ? 'متأخر' : 'Late', stats.late],
      [isRTL ? 'غياب' : 'Absent', stats.absent],
      [isRTL ? 'معذور' : 'Excused', stats.leave],
      [isRTL ? 'نسبة الحضور' : 'Attendance Rate', `${attendanceRate}%`]
    ]
    return { headers, rows }
  }

  const exportToPDF = () => {
    if (!selectedChildId) return

    const isRTL = language === 'ar'
    const { headers, rows } = getAttendanceTableData(selectedChildName, attendanceStats)
    const title = isRTL ? 'تقرير الحضور' : 'Attendance Report'

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
          h1 { color: #d8a52d; margin-bottom: 20px; font-size: 24px; text-align: center; }
          table { width: 100%; border-collapse: collapse; max-width: 500px; margin: 0 auto; }
          th, td { border: 1px solid #ddd; padding: 12px 16px; text-align: ${isRTL ? 'right' : 'left'}; }
          th { background-color: #d8a52d; color: white; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <table>
          <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
          <tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
      </body>
      </html>
    `
    const pdfWindow = window.open('', '_blank')
    pdfWindow.document.write(htmlContent)
    pdfWindow.document.close()
    setTimeout(() => pdfWindow.print(), 500)
  }

  const exportAllToPDF = () => {
    if (children.length === 0) return

    const isRTL = language === 'ar'
    const title = isRTL ? 'تقرير الحضور - جميع اللاعبين' : 'Attendance Report - All Players'
    const headers = [isRTL ? 'البند' : 'Item', isRTL ? 'القيمة' : 'Value']

    const sections = children.map((child) => {
      const childRecords = attendanceRecords.filter((record) => String(record.player_id) === String(child.id))
      const childMonthRecords = childRecords.filter((record) => isSameMonth(record.session_date))
      const childStats = childMonthRecords.reduce((acc, record) => {
        const status = record.status
        acc.total += 1
        if (status === 'present') acc.attended += 1
        else if (status === 'late') acc.late += 1
        else if (status === 'absent') acc.absent += 1
        else if (status === 'leave') acc.leave += 1
        return acc
      }, { total: 0, attended: 0, late: 0, absent: 0, leave: 0 })

      const childName = child.name?.[language] || child.fullName
      const { rows } = getAttendanceTableData(childName, childStats)

      return `
        <div class="section">
          <h2>${childName}</h2>
          <table>
            <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
            <tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
          </table>
        </div>
      `
    }).join('')

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
          h1 { color: #d8a52d; margin-bottom: 30px; font-size: 24px; text-align: center; }
          h2 { color: #111827; font-size: 18px; margin: 30px 0 15px; text-align: center; }
          .section { margin-bottom: 40px; page-break-inside: avoid; }
          table { width: 100%; border-collapse: collapse; max-width: 500px; margin: 0 auto; }
          th, td { border: 1px solid #ddd; padding: 12px 16px; text-align: ${isRTL ? 'right' : 'left'}; }
          th { background-color: #d8a52d; color: white; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        ${sections}
      </body>
      </html>
    `
    const pdfWindow = window.open('', '_blank')
    pdfWindow.document.write(htmlContent)
    pdfWindow.document.close()
    setTimeout(() => pdfWindow.print(), 500)
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
            {language === 'ar' ? 'سجل الحضور' : 'Attendance'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {language === 'ar' ? 'تتبع حضور اللاعبين' : 'Track your players\' attendance'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {children.length > 0 && (
            <select
              value={selectedChild}
              onChange={(e) => setSelectedChild(e.target.value)}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {children.map((child) => (
                <option key={child.id} value={child.id}>{child.name?.[language]}</option>
              ))}
            </select>
          )}
          <Button
            onClick={exportToPDF}
            disabled={!selectedChildId || attendanceStats.total === 0}
            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:opacity-50"
          >
            <svg className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            {language === 'ar' ? 'تصدير PDF' : 'Export PDF'}
          </Button>
          <Button
            onClick={exportAllToPDF}
            disabled={children.length === 0}
            className="bg-gradient-to-r from-red-400 to-red-500 hover:from-red-500 hover:to-red-600 disabled:opacity-50"
          >
            <svg className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            {language === 'ar' ? 'تصدير الكل PDF' : 'Export All PDF'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <GlassCard className="p-4 text-center">
          <p className="text-3xl font-bold text-secondary dark:text-white">{attendanceStats.total}</p>
          <p className="text-sm text-gray-500">{language === 'ar' ? 'إجمالي الجلسات' : 'Total Sessions'}</p>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <p className="text-3xl font-bold text-green-500">{attendanceStats.attended}</p>
          <p className="text-sm text-gray-500">{language === 'ar' ? 'حضور' : 'Attended'}</p>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <p className="text-3xl font-bold text-orange-500">{attendanceStats.late}</p>
          <p className="text-sm text-gray-500">{language === 'ar' ? 'متأخر' : 'Late'}</p>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <p className="text-3xl font-bold text-red-500">{attendanceStats.absent}</p>
          <p className="text-sm text-gray-500">{language === 'ar' ? 'غياب' : 'Absent'}</p>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <p className="text-3xl font-bold text-yellow-500">{attendanceStats.leave}</p>
          <p className="text-sm text-gray-500">{language === 'ar' ? 'معذور' : 'Excused'}</p>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <p className="text-3xl font-bold text-primary">{attendancePercent}%</p>
          <p className="text-sm text-gray-500">{language === 'ar' ? 'نسبة الحضور' : 'Attendance Rate'}</p>
        </GlassCard>
      </div>

      {/* Calendar */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl">
            <svg className="w-5 h-5 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-bold text-secondary dark:text-white">
            {currentMonth.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl">
            <svg className="w-5 h-5 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Week Days Header */}
        <div className="grid grid-cols-7 gap-1.5 mb-2">
          {weekDays.map((day, idx) => (
            <div key={idx} className="text-center text-xs font-semibold text-gray-500 py-1.5">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, idx) => (
          <div key={idx} className="aspect-square flex items-center justify-center rounded-lg text-xs sm:text-sm">
            {day === null ? (
              <span />
            ) : (
              <span className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg shadow-sm transition-transform duration-150 hover:-translate-y-0.5 ${dayStatusClass(getDayStatus(day))}`}>
                {day}
              </span>
            )}
          </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-6 mt-6 pt-4 border-t border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500"></div>
            <span className="text-sm text-gray-500">{language === 'ar' ? 'حاضر' : 'Present'}</span>
          </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-orange-500"></div>
          <span className="text-sm text-gray-500">{language === 'ar' ? 'متأخر' : 'Late'}</span>
        </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500"></div>
            <span className="text-sm text-gray-500">{language === 'ar' ? 'غائب' : 'Absent'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-500"></div>
            <span className="text-sm text-gray-500">{language === 'ar' ? 'عذر' : 'Excused'}</span>
          </div>
        </div>
      </GlassCard>

    {/* Attendance History */}
    <GlassCard className="p-6">
      <h2 className="text-lg font-bold text-secondary dark:text-white mb-4">
        {language === 'ar' ? 'سجل الحضور الأخير' : 'Recent Attendance'}
      </h2>
      {recentRecords.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {language === 'ar' ? 'لا توجد سجلات حضور بعد' : 'No attendance records yet'}
        </div>
      ) : (
        <div className="space-y-3">
          {recentRecords.map((record) => (
            <div
              key={record.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4 bg-gray-50 dark:bg-white/5 rounded-xl"
            >
              <div>
                <p className="font-semibold text-secondary dark:text-white">
                  {playerNameById[String(record.player_id)] || record.player?.first_name || (language === 'ar' ? 'طالب' : 'Player')}
                </p>
                <p className="text-sm text-gray-500">
                  {new Date(record.session_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                  {record.program?.name ? ` • ${record.program.name}` : ''}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                record.status === 'present'
                  ? 'bg-green-100 text-green-700'
                  : record.status === 'late'
                    ? 'bg-orange-100 text-orange-700'
                    : record.status === 'absent'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
              }`}>
                {record.status === 'present'
                  ? (language === 'ar' ? 'حاضر' : 'Present')
                  : record.status === 'late'
                    ? (language === 'ar' ? 'متأخر' : 'Late')
                    : record.status === 'absent'
                      ? (language === 'ar' ? 'غائب' : 'Absent')
                      : (language === 'ar' ? 'بعذر' : 'Excused')
                }
              </span>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
    </div>
  )
}
