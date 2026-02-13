import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { useAuth } from '../../hooks/useAuth'
import { playersService, scheduleService } from '../../services'
import GlassCard from '../../components/ui/GlassCard'

export default function Schedule() {
  const { language } = useLanguage()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [children, setChildren] = useState([])
  const [sessions, setSessions] = useState([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedChild, setSelectedChild] = useState('')

  const fetchChildren = useCallback(async () => {
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
            firstName,
            lastName,
            programId: child.program_id || child.program?.id || null,
            branchId: child.branch_id || child.branch?.id || child.program?.branch_id || child.program?.branch?.id || null,
            program: child.program || null,
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
      console.error('Error fetching schedule:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchChildren()
  }, [fetchChildren])

  const fetchSchedule = useCallback(async () => {
    if (children.length === 0) {
      setSessions([])
      return
    }
    try {
      setLoading(true)
      const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
      const params = {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      }
      const uniqueBranches = Array.from(new Set(children.map((c) => c.branchId).filter(Boolean)))
      const allSessions = []

      if (uniqueBranches.length > 0) {
        for (const branchId of uniqueBranches) {
          const response = await scheduleService.getBranchSchedule(branchId, params)
          if (response.success) {
            const branchSessions = response.data?.sessions || response.data || []
            branchSessions.forEach((session) => {
              const programId = session.program_id || session.program?.id
              if (!programId) return
              const matchingChildren = children.filter((child) => child.programId === programId)
              matchingChildren.forEach((child) => {
                allSessions.push({
                  id: `${child.id}-${session.id}`,
                  date: session.date,
                  notes: session.notes || '',
                  program: { en: session.program?.name || '', ar: session.program?.name_ar || session.program?.name || '' },
                  child: { en: `${child.firstName} ${child.lastName}`.trim(), ar: child.name?.ar || child.firstName },
                  childId: child.id,
                  time: session.start_time?.substring(0, 5) || session.start_time || '',
                  endTime: session.end_time?.substring(0, 5) || session.end_time || '',
                  location: { en: session.facility || '', ar: session.facility || '' }
                })
              })
            })
          }
        }
      } else {
        const uniquePrograms = Array.from(new Set(children.map((c) => c.programId).filter(Boolean)))
        for (const programId of uniquePrograms) {
          const response = await scheduleService.getProgramSchedule(programId, params)
          if (response.success) {
            const programSessions = response.data?.sessions || response.data || []
            const matchingChildren = children.filter((child) => child.programId === programId)
            programSessions.forEach((session) => {
              matchingChildren.forEach((child) => {
                allSessions.push({
                  id: `${child.id}-${session.id}`,
                  date: session.date,
                  notes: session.notes || '',
                  program: { en: session.program?.name || '', ar: session.program?.name_ar || session.program?.name || '' },
                  child: { en: `${child.firstName} ${child.lastName}`.trim(), ar: child.name?.ar || child.firstName },
                  childId: child.id,
                  time: session.start_time?.substring(0, 5) || session.start_time || '',
                  endTime: session.end_time?.substring(0, 5) || session.end_time || '',
                  location: { en: session.facility || '', ar: session.facility || '' }
                })
              })
            })
          }
        }
      }

      setSessions(allSessions)
    } catch (err) {
      console.error('Error fetching schedule:', err)
    } finally {
      setLoading(false)
    }
  }, [children, currentMonth])

  useEffect(() => {
    fetchSchedule()
  }, [fetchSchedule])

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

  const filteredSessions = sessions.filter((session) =>
    selectedChild ? String(session.childId) === String(selectedChild) : true
  )

  const getScheduleTableData = (childName) => {
    const isRTL = language === 'ar'
    const monthLabel = currentMonth.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'long', year: 'numeric' })
    const totalSessions = filteredSessions.length

    const headers = [isRTL ? 'البند' : 'Item', isRTL ? 'القيمة' : 'Value']
    const rows = [
      [isRTL ? 'التاريخ' : 'Date', new Date().toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')],
      [isRTL ? 'اللاعب' : 'Player', childName],
      [isRTL ? 'الشهر' : 'Month', monthLabel],
      [isRTL ? 'عدد الجلسات' : 'Total Sessions', totalSessions]
    ]

    // Add session details as rows
    if (filteredSessions.length > 0) {
      rows.push([isRTL ? '═══ تفاصيل الجلسات ═══' : '═══ Session Details ═══', ''])
      filteredSessions.forEach((session, idx) => {
        const sessionDate = session.date || '-'
        const sessionTime = session.time ? `${session.time}${session.endTime ? ` - ${session.endTime}` : ''}` : '-'
        const program = session.program?.[language] || '-'
        const location = session.location?.[language] || '-'
        rows.push([`${idx + 1}. ${sessionDate}`, `${program} | ${sessionTime} | ${location}`])
      })
    }

    return { headers, rows }
  }

  const exportToPDF = () => {
    const isRTL = language === 'ar'
    const child = children.find((c) => String(c.id) === String(selectedChild))
    const childName = child?.name?.[language] || ''
    const title = isRTL ? 'تقرير الجدول' : 'Schedule Report'
    const { headers, rows } = getScheduleTableData(childName)

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
          table { width: 100%; border-collapse: collapse; max-width: 600px; margin: 0 auto; }
          th, td { border: 1px solid #ddd; padding: 12px 16px; text-align: ${isRTL ? 'right' : 'left'}; vertical-align: top; }
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
    const isRTL = language === 'ar'
    const title = isRTL ? 'تقرير الجدول - جميع اللاعبين' : 'Schedule Report - All Players'
    const headers = [isRTL ? 'البند' : 'Item', isRTL ? 'القيمة' : 'Value']
    const monthLabel = currentMonth.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'long', year: 'numeric' })

    const sections = children.map((child) => {
      const childSessions = sessions.filter((session) => String(session.childId) === String(child.id))
      const childName = child.name?.[language] || ''

      const rows = [
        [isRTL ? 'الشهر' : 'Month', monthLabel],
        [isRTL ? 'عدد الجلسات' : 'Total Sessions', childSessions.length]
      ]

      if (childSessions.length > 0) {
        rows.push([isRTL ? '═══ تفاصيل الجلسات ═══' : '═══ Session Details ═══', ''])
        childSessions.forEach((session, idx) => {
          const sessionDate = session.date || '-'
          const sessionTime = session.time ? `${session.time}${session.endTime ? ` - ${session.endTime}` : ''}` : '-'
          const program = session.program?.[language] || '-'
          const location = session.location?.[language] || '-'
          rows.push([`${idx + 1}. ${sessionDate}`, `${program} | ${sessionTime} | ${location}`])
        })
      }

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
          table { width: 100%; border-collapse: collapse; max-width: 600px; margin: 0 auto; }
          th, td { border: 1px solid #ddd; padding: 12px 16px; text-align: ${isRTL ? 'right' : 'left'}; vertical-align: top; }
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

  const formatDayLabel = (dateStr) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    if (Number.isNaN(date.getTime())) return '-'
    return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'long' })
  }

  const changeMonth = (delta) => {
    const newDate = new Date(currentMonth)
    newDate.setMonth(newDate.getMonth() + delta)
    setCurrentMonth(newDate)
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
            {language === 'ar' ? 'جدول التدريب' : 'Training Schedule'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {language === 'ar' ? 'عرض وإدارة جداول التدريب' : 'View and manage training schedules'}
          </p>
        </div>
        {children.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedChild}
              onChange={(e) => setSelectedChild(e.target.value)}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.name?.[language] || child.name?.en || child.name?.ar || ''}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={exportToPDF}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-sm font-semibold flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              {language === 'ar' ? 'تصدير PDF' : 'Export PDF'}
            </button>
            <button
              type="button"
              onClick={exportAllToPDF}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-400 to-red-500 hover:from-red-500 hover:to-red-600 text-white text-sm font-semibold flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              {language === 'ar' ? 'تصدير الكل PDF' : 'Export All PDF'}
            </button>
          </div>
        )}
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
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day, idx) => (
            <div key={idx} className="text-center text-sm font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, idx) => {
            if (!day) {
              return <div key={idx} className="aspect-square" />
            }
            const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
            const dateString = dateObj.toISOString().split('T')[0]
            const daySessions = filteredSessions.filter((session) => session.date === dateString)

            return (
              <div
                key={idx}
                className="aspect-square flex flex-col items-start justify-start p-1 rounded-lg text-xs bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10"
              >
                <span className="text-gray-600 dark:text-gray-300 mb-1">{day}</span>
                <div className="space-y-1 w-full">
                  {daySessions.slice(0, 2).map((session) => (
                    <div key={session.id} className="px-1 py-0.5 rounded bg-primary/10 text-[10px] text-primary">
                      {session.time || '--'}
                    </div>
                  ))}
                  {daySessions.length > 2 && (
                    <div className="text-[10px] text-gray-400">
                      +{daySessions.length - 2}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

      </GlassCard>

      {/* Upcoming Sessions */}
      <GlassCard className="p-6">
        <h2 className="text-lg font-bold text-secondary dark:text-white mb-4">
          {language === 'ar' ? 'الجلسات القادمة' : 'Upcoming Sessions'}
        </h2>
        {filteredSessions.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-500 mb-2">{language === 'ar' ? 'لا توجد جلسات قادمة' : 'No upcoming sessions'}</p>
            <p className="text-sm text-gray-400">{language === 'ar' ? 'قم بتسجيل اللاعب في برنامج لرؤية الجدول' : 'Enroll your player in a program to see the schedule'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSessions.map(session => (
              <div key={session.id} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  session.type === 'training' ? 'bg-blue-100 dark:bg-blue-500/20' :
                  session.type === 'match' ? 'bg-primary/20' : 'bg-purple-100 dark:bg-purple-500/20'
                }`}>
                  <svg className={`w-6 h-6 ${
                    session.type === 'training' ? 'text-blue-500' :
                    session.type === 'match' ? 'text-primary' : 'text-purple-500'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-secondary dark:text-white">{session.program?.[language]}</p>
                  <p className="text-sm text-gray-500">
                    {formatDayLabel(session.date)} • {session.date || '--'} • {session.time || '--'}{session.endTime ? ` - ${session.endTime}` : ''}
                  </p>
                  {session.notes && (
                    <p className="text-xs text-gray-500 mt-1">{session.notes}</p>
                  )}
                </div>
                <div className="text-end">
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">{session.child?.[language]}</p>
                  <p className="text-xs text-gray-500">{session.location?.[language]}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  )
}
