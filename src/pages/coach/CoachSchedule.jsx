import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { useAuth } from '../../hooks/useAuth'
import scheduleService from '../../services/schedule.service'
import GlassCard from '../../components/ui/GlassCard'
import { parseLocalDate, formatDateString, isFutureOrToday } from '../../utils/dateUtils'

export default function CoachSchedule() {
  const { language } = useLanguage()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [sessions, setSessions] = useState([])
  const [viewMode, setViewMode] = useState('week') // week or list

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

  const isToday = (day) => {
    if (!day) return false
    const today = new Date()
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    )
  }

  const getSessionsForDay = (day) => {
    if (!day) return []
    const dayDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    const dateStr = formatDateString(dayDate)
    
    return sessions.filter(session => {
      return session.date === dateStr && !session.is_cancelled
    })
  }

  const fetchSchedule = useCallback(async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      // Get all sessions for the current month for this coach
      const year = currentMonth.getFullYear()
      const month = currentMonth.getMonth()
      const startDateStr = formatDateString(new Date(year, month, 1))
      const endDateStr = formatDateString(new Date(year, month + 1, 0))
      
      // The API expects a week, so let's fetch all weeks in this month by getting sessions
      // starting from the first day. We'll collect all unique sessions across all weeks in the month.
      const allSessions = []
      const currentDate = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)
      
      // Fetch sessions week by week to cover the entire month (add extra week to ensure coverage)
      while (currentDate <= lastDay) {
        const response = await scheduleService.getCoachSchedule(
          user.id,
          formatDateString(currentDate)
        )
        
        if (response.success && response.data) {
          const sessionsList = response.data.sessions || response.data || []
          // Add sessions that we haven't already added (avoid duplicates)
          sessionsList.forEach(session => {
            if (!allSessions.find(s => s.id === session.id)) {
              allSessions.push(session)
            }
          })
        }
        
        // Move to next week
        currentDate.setDate(currentDate.getDate() + 7)
      }
      
      // Filter sessions to only include those in the current month
      const monthSessions = allSessions.filter(session => {
        return session.date >= startDateStr && session.date <= endDateStr
      })
      
      setSessions(monthSessions)
    } catch (err) {
      console.error('Error fetching schedule:', err)
      setSessions([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }, [user?.id, currentMonth])

  useEffect(() => {
    fetchSchedule()
  }, [fetchSchedule])

  // Print schedule function
  const handlePrint = () => {
    const printContent = document.getElementById('schedule-print-content')
    if (!printContent) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert(language === 'ar' ? 'يرجى السماح بالنوافذ المنبثقة للطباعة' : 'Please allow popups to print')
      return
    }

    const monthName = currentMonth.toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'long', year: 'numeric' })
    
    // Get upcoming sessions for print
    const upcomingSessions = sessions
      .filter(session => isFutureOrToday(session.date) && !session.is_cancelled)
      .sort((a, b) => a.date > b.date ? 1 : -1)

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${language === 'ar' ? 'rtl' : 'ltr'}">
      <head>
        <title>${language === 'ar' ? 'جدول التدريبات' : 'Training Schedule'} - ${monthName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: ${language === 'ar' ? "'Segoe UI', Tahoma, Arial" : "'Segoe UI', Tahoma, sans-serif"}; 
            padding: 20px; 
            direction: ${language === 'ar' ? 'rtl' : 'ltr'};
          }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #10b981; padding-bottom: 20px; }
          .header h1 { color: #10b981; font-size: 24px; margin-bottom: 5px; }
          .header h2 { color: #374151; font-size: 18px; }
          .header p { color: #6b7280; font-size: 14px; margin-top: 10px; }
          .sessions-list { margin-top: 20px; }
          .session-item { 
            border: 1px solid #e5e7eb; 
            border-radius: 8px; 
            padding: 15px; 
            margin-bottom: 15px;
            page-break-inside: avoid;
          }
          .session-date { 
            display: inline-block;
            background: #10b981; 
            color: white; 
            padding: 8px 15px; 
            border-radius: 8px; 
            font-weight: bold;
            margin-${language === 'ar' ? 'left' : 'right'}: 15px;
          }
          .session-info { display: inline-block; vertical-align: top; }
          .session-program { font-size: 16px; font-weight: bold; color: #1f2937; }
          .session-details { color: #6b7280; font-size: 14px; margin-top: 5px; }
          .session-notes { 
            margin-top: 10px; 
            padding: 10px; 
            background: #f3f4f6; 
            border-radius: 5px; 
            font-style: italic;
            color: #4b5563;
          }
          .no-sessions { text-align: center; color: #6b7280; padding: 40px; }
          .footer { margin-top: 30px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 15px; }
          @media print {
            body { padding: 0; }
            .session-item { break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${language === 'ar' ? 'جدول التدريبات' : 'Training Schedule'}</h1>
          <h2>${monthName}</h2>
          <p>${language === 'ar' ? 'المدرب:' : 'Coach:'} ${user?.name_ar || user?.first_name + ' ' + user?.last_name}</p>
        </div>
        
        <div class="sessions-list">
          ${upcomingSessions.length === 0 ? `
            <div class="no-sessions">${language === 'ar' ? 'لا توجد جلسات مجدولة' : 'No scheduled sessions'}</div>
          ` : upcomingSessions.map(session => {
            const displayDate = parseLocalDate(session.date)
            const dayName = displayDate.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'long' })
            const dateStr = displayDate.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { day: 'numeric', month: 'long' })
            return `
              <div class="session-item">
                <span class="session-date">${dateStr}<br/>${dayName}</span>
                <div class="session-info">
                  <div class="session-program">${language === 'ar' ? (session.program?.name_ar || session.program?.name) : session.program?.name}</div>
                  <div class="session-details">
                    ${session.start_time} - ${session.end_time}
                    ${session.facility ? ` | ${language === 'ar' ? 'المكان:' : 'Facility:'} ${session.facility}` : ''}
                  </div>
                  ${session.notes ? `<div class="session-notes">${language === 'ar' ? 'ملاحظات:' : 'Notes:'} ${session.notes}</div>` : ''}
                </div>
              </div>
            `
          }).join('')}
        </div>
        
        <div class="footer">
          ${language === 'ar' ? 'تم الطباعة في' : 'Printed on'} ${new Date().toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { 
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
          })}
        </div>
      </body>
      </html>
    `)
    
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 250)
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-secondary dark:text-white">
            {language === 'ar' ? 'جدولي' : 'My Schedule'}
          </h1>
          <p className="text-sm md:text-base text-gray-500 dark:text-gray-400">{language === 'ar' ? 'عرض جلسات التدريب المقبلة' : 'View your upcoming training sessions'}</p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm md:text-base font-medium transition-colors shadow-lg w-full sm:w-auto"
        >
          <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          {language === 'ar' ? 'طباعة' : 'Print'}
        </button>
      </div>

      {/* Calendar */}
      <GlassCard id="schedule-print-content" className="p-3 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base md:text-lg font-bold text-secondary dark:text-white">
            {currentMonth.toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex gap-1 md:gap-2">
            <button onClick={() => changeMonth(-1)} className="p-1.5 md:p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors">
              <svg className="w-4 h-4 md:w-5 md:h-5 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button onClick={() => setCurrentMonth(new Date())} className="px-2 md:px-4 py-1.5 md:py-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-xs md:text-sm font-medium transition-colors">
              {language === 'ar' ? 'اليوم' : 'Today'}
            </button>
            <button onClick={() => changeMonth(1)} className="p-1.5 md:p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors">
              <svg className="w-4 h-4 md:w-5 md:h-5 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-0.5 md:gap-2">
          {weekDays.map(day => (
            <div key={day} className="text-center text-[10px] md:text-sm font-semibold text-gray-500 dark:text-gray-400 py-1 md:py-2">
              {day}
            </div>
          ))}
          {days.map((day, idx) => {
            const daySessions = getSessionsForDay(day)
            return (
              <div
                key={idx}
                className={`min-h-[50px] md:min-h-[80px] p-1 md:p-2 rounded-md md:rounded-lg border ${
                  day ? 'border-gray-200 dark:border-white/10 hover:border-emerald-300 dark:hover:border-emerald-500 cursor-pointer transition-colors' : 'border-transparent'
                } ${isToday(day) ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500' : 'bg-white dark:bg-white/5'}`}
              >
                {day && (
                  <>
                    <div className={`text-[10px] md:text-sm font-medium mb-0.5 md:mb-1 ${isToday(day) ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-gray-700 dark:text-gray-300'}`}>
                      {day}
                    </div>
                    {daySessions.length > 0 && (
                      <div className="space-y-0.5 md:space-y-1">
                        {daySessions.slice(0, 2).map((session, i) => (
                          <div key={i} className="text-[8px] md:text-xs px-1 md:px-2 py-0.5 md:py-1 bg-emerald-500 text-white rounded truncate" title={session.program?.name || session.program_name}>
                            {session.start_time?.substring(0, 5)}
                          </div>
                        ))}
                        {daySessions.length > 2 && (
                          <div className="text-[8px] md:text-xs text-gray-500 dark:text-gray-400 text-center">
                            +{daySessions.length - 2}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </GlassCard>

      {/* Upcoming Sessions List */}
      <GlassCard className="p-3 md:p-6">
        <h2 className="text-base md:text-lg font-bold text-secondary dark:text-white mb-4">
          {language === 'ar' ? 'الجلسات القادمة' : 'Upcoming Sessions'}
        </h2>
        {sessions.length === 0 ? (
          <div className="text-center py-8 md:py-12">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 md:w-10 md:h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-base md:text-lg text-gray-500 dark:text-gray-400 mb-2">{language === 'ar' ? 'لا توجد جلسات مجدولة' : 'No sessions scheduled'}</p>
            <p className="text-xs md:text-sm text-gray-400">{language === 'ar' ? 'سيقوم مدير الفرع بجدولة الجلسات التدريبية' : 'The branch admin will schedule your training sessions'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions
              .filter(session => isFutureOrToday(session.date) && !session.is_cancelled)
              .sort((a, b) => a.date > b.date ? 1 : -1)
              .slice(0, 10)
              .map(session => {
                const displayDate = parseLocalDate(session.date)
                return (
                  <div key={session.id} className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 p-3 md:p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 rounded-xl border-l-4 border-emerald-500 hover:shadow-md transition-shadow">
                    {/* Date badge - horizontal on mobile */}
                    <div className="flex md:block items-center gap-3">
                      <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex flex-col items-center justify-center text-white shadow-lg flex-shrink-0">
                        <span className="text-lg md:text-2xl font-bold">{displayDate.getDate()}</span>
                        <span className="text-[10px] md:text-xs">{displayDate.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short' })}</span>
                      </div>
                      {/* Day name - only show on mobile next to date */}
                      <div className="md:hidden">
                        <p className="font-bold text-sm text-secondary dark:text-white">
                          {language === 'ar' ? (session.program?.name_ar || session.program?.name) : session.program?.name}
                        </p>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {displayDate.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'long' })}
                        </span>
                      </div>
                    </div>
                    
                    {/* Session info */}
                    <div className="flex-1">
                      {/* Program name - hide on mobile (shown above) */}
                      <p className="hidden md:block font-bold text-lg text-secondary dark:text-white">
                        {language === 'ar' ? (session.program?.name_ar || session.program?.name) : session.program?.name}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{session.start_time} - {session.end_time}</span>
                        </div>
                        {session.facility && (
                          <div className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            </svg>
                            <span>{session.facility}</span>
                          </div>
                        )}
                      </div>
                      {session.notes && (
                        <p className="mt-2 text-xs md:text-sm text-gray-500 dark:text-gray-400 italic">
                          <span className="font-medium">{language === 'ar' ? 'ملاحظات:' : 'Notes:'}</span> {session.notes}
                        </p>
                      )}
                    </div>
                    
                    {/* Day name - only on desktop */}
                    <div className="hidden md:block text-right">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {displayDate.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'long' })}
                      </span>
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </GlassCard>
    </div>
  )
}
