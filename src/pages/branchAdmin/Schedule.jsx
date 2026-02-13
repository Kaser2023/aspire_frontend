import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { useAuth } from '../../hooks/useAuth'
import { scheduleService, programsService } from '../../services'
import {
  onScheduleCreated,
  onScheduleUpdated,
  onScheduleCancelled,
  onScheduleDeleted,
  offScheduleEvents
} from '../../services/socket.service'
import GlassCard from '../../components/ui/GlassCard'
import Button from '../../components/ui/Button'
import { DndContext, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

export default function Schedule() {
  const { language } = useLanguage()
  const { user } = useAuth()

  // State management
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('week') // week, day, list
  const [currentDate, setCurrentDate] = useState(new Date())
  const [sessions, setSessions] = useState([])
  const [programs, setPrograms] = useState([])
  const [coaches, setCoaches] = useState([])
  const [stats, setStats] = useState(null)
  const [selectedProgram, setSelectedProgram] = useState('all')
  const [selectedSession, setSelectedSession] = useState(null)
  const [showSessionModal, setShowSessionModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingSession, setEditingSession] = useState(null)
  const [formData, setFormData] = useState({
    program_id: '',
    coach_id: '',
    date: '',
    start_time: '',
    end_time: '',
    facility: '',
    notes: '',
    is_recurring: false
  })
  const [formErrors, setFormErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [validationMessage, setValidationMessage] = useState('')
  const [activeId, setActiveId] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [coachesLoading, setCoachesLoading] = useState(false)

  const days = language === 'ar'
    ? ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Fetch programs and coaches
  const fetchPrograms = useCallback(async () => {
    try {
      const response = await programsService.getAll({ branch_id: user?.branch_id })
      if (response.success && response.data) {
        setPrograms(response.data)
      }
    } catch (err) {
      console.error('Error fetching programs:', err)
    }
  }, [user?.branch_id])

  const fetchCoaches = useCallback(async (programId) => {
    if (!programId) {
      setCoaches([])
      return
    }
    try {
      setCoachesLoading(true)
      const response = await programsService.getCoaches(programId)
      if (response.success && response.data) {
        setCoaches(response.data)
      } else {
        setCoaches([])
      }
    } catch (err) {
      console.error('Error fetching program coaches:', err)
      setCoaches([])
    } finally {
      setCoachesLoading(false)
    }
  }, [])

  // Fetch schedule based on view mode
  const fetchSchedule = useCallback(async () => {
    if (!user?.branch_id) return

    try {
      setLoading(true)
      let response

      if (viewMode === 'week') {
        response = await scheduleService.getWeekSchedule(
          user.branch_id,
          currentDate.toISOString().split('T')[0]
        )
        if (response.success) {
          setSessions(response.data.sessions || [])
          setStats(response.data.stats)
        }
      } else if (viewMode === 'day') {
        response = await scheduleService.getDaySchedule(
          user.branch_id,
          currentDate.toISOString().split('T')[0]
        )
        if (response.success) {
          setSessions(response.data.sessions || [])
        }
      } else {
        // For list view, get all sessions in current month
        const startDate = new Date(currentDate)
        startDate.setDate(1)
        const endDate = new Date(currentDate)
        endDate.setMonth(endDate.getMonth() + 1, 0)

        const params = {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        }

        if (selectedProgram !== 'all') params.programId = selectedProgram

        response = await scheduleService.getBranchSchedule(user.branch_id, params)
        if (response.success) {
          setSessions(response.data || [])
        }
      }
    } catch (err) {
      console.error('Error fetching schedule:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.branch_id, viewMode, currentDate, selectedProgram])

  useEffect(() => {
    fetchPrograms()
  }, [fetchPrograms, fetchCoaches])

  useEffect(() => {
    fetchCoaches(formData.program_id)
  }, [fetchCoaches, formData.program_id])

  useEffect(() => {
    fetchSchedule()
  }, [fetchSchedule])

  // Socket.IO real-time updates
  useEffect(() => {
    const handleScheduleUpdate = (payload) => {
      console.log('📡 Real-time schedule update received:', payload)
      // Refresh schedule when any update is received
      fetchSchedule()
    }

    // Subscribe to all schedule events
    onScheduleCreated(handleScheduleUpdate)
    onScheduleUpdated(handleScheduleUpdate)
    onScheduleCancelled(handleScheduleUpdate)
    onScheduleDeleted(handleScheduleUpdate)

    // Cleanup listeners on unmount
    return () => {
      offScheduleEvents()
    }
  }, [fetchSchedule])

  // Date navigation
  const navigateDate = (direction) => {
    const newDate = new Date(currentDate)
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction * 7))
    } else if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + direction)
    } else {
      newDate.setMonth(newDate.getMonth() + direction)
    }
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Get week start and end dates
  const getWeekDates = () => {
    const weekStart = new Date(currentDate)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    return { weekStart, weekEnd }
  }

  // Format date display
  const formatDateDisplay = () => {
    if (viewMode === 'week') {
      const { weekStart, weekEnd } = getWeekDates()
      const format = language === 'ar' ? 'ar-SA' : 'en-US'
      return `${weekStart.toLocaleDateString(format, { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString(format, { month: 'short', day: 'numeric', year: 'numeric' })}`
    } else if (viewMode === 'day') {
      const format = language === 'ar' ? 'ar-SA' : 'en-US'
      return currentDate.toLocaleDateString(format, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    } else {
      const format = language === 'ar' ? 'ar-SA' : 'en-US'
      return currentDate.toLocaleDateString(format, { year: 'numeric', month: 'long' })
    }
  }

  const totalSessions = viewMode === 'week'
    ? (stats?.total_sessions ?? sessions.length)
    : sessions.length

  // Export schedule to PDF (report-style print)
  const exportScheduleToPDF = async (period) => {
    if (!user?.branch_id || exporting) return

    setExporting(true)
    try {
      let exportSessions = []
      let periodLabel = period
      let dateLabel = ''

      if (period === 'daily') {
        const targetDate = currentDate.toISOString().split('T')[0]
        const response = await scheduleService.getDaySchedule(user.branch_id, targetDate)
        exportSessions = response.success ? (response.data.sessions || []) : []
        periodLabel = language === 'ar' ? 'يومي' : 'Daily'
        dateLabel = currentDate.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')
      } else if (period === 'weekly') {
        const response = await scheduleService.getWeekSchedule(
          user.branch_id,
          currentDate.toISOString().split('T')[0]
        )
        exportSessions = response.success ? (response.data.sessions || []) : []
        const { weekStart, weekEnd } = getWeekDates()
        periodLabel = language === 'ar' ? 'أسبوعي' : 'Weekly'
        const format = language === 'ar' ? 'ar-SA' : 'en-US'
        dateLabel = `${weekStart.toLocaleDateString(format)} - ${weekEnd.toLocaleDateString(format)}`
      } else {
        const startDate = new Date(currentDate)
        startDate.setDate(1)
        const endDate = new Date(currentDate)
        endDate.setMonth(endDate.getMonth() + 1, 0)

        const params = {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        }

        const response = await scheduleService.getBranchSchedule(user.branch_id, params)
        exportSessions = response.success ? (response.data || []) : []
        periodLabel = language === 'ar' ? 'شهري' : 'Monthly'
        dateLabel = currentDate.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'long' })
      }

      const isRTL = language === 'ar'
      const title = language === 'ar' ? 'جدول التدريب' : 'Training Schedule'
      const branchName = language === 'ar'
        ? (user?.branch?.name_ar || user?.branch?.name || '')
        : (user?.branch?.name || '')

      const headers = [
        language === 'ar' ? 'التاريخ' : 'Date',
        language === 'ar' ? 'الوقت' : 'Time',
        language === 'ar' ? 'البرنامج' : 'Program',
        language === 'ar' ? 'المدرب' : 'Coach',
        language === 'ar' ? 'المكان' : 'Facility',
        language === 'ar' ? 'الحالة' : 'Status'
      ]

      const rows = exportSessions.map(session => ([
        session.date || '-',
        `${session.start_time?.substring(0, 5) || ''} - ${session.end_time?.substring(0, 5) || ''}`.trim(),
        language === 'ar' ? (session.program?.name_ar || session.program?.name || '-') : (session.program?.name || '-'),
        language === 'ar'
          ? (session.coach?.name_ar || `${session.coach?.first_name || ''} ${session.coach?.last_name || ''}`.trim() || '-')
          : (`${session.coach?.first_name || ''} ${session.coach?.last_name || ''}`.trim() || '-'),
        session.facility || '-',
        session.is_cancelled
          ? (language === 'ar' ? 'ملغاة' : 'Cancelled')
          : (language === 'ar' ? 'نشطة' : 'Active')
      ]))

      const htmlContent = `
        <!DOCTYPE html>
        <html dir="${isRTL ? 'rtl' : 'ltr'}">
        <head>
          <meta charset="UTF-8">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap');
            * { font-family: 'IBM Plex Sans Arabic', Arial, sans-serif; }
            body { padding: 40px; direction: ${isRTL ? 'rtl' : 'ltr'}; }
            h1 { color: #6366f1; margin-bottom: 8px; font-size: 24px; }
            .meta { color: #666; margin-bottom: 24px; font-size: 14px; }
            .meta span { display: inline-block; margin-${isRTL ? 'left' : 'right'}: 16px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: ${isRTL ? 'right' : 'left'}; font-size: 12px; }
            th { background-color: #6366f1; color: white; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <div class="meta">
            <span>${isRTL ? 'الفرع:' : 'Branch:'} ${branchName || '-'}</span>
            <span>${isRTL ? 'الفترة:' : 'Period:'} ${periodLabel}</span>
            <span>${isRTL ? 'التاريخ:' : 'Date:'} ${dateLabel}</span>
          </div>
          <table>
            <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
            <tbody>${rows.length > 0
              ? rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')
              : `<tr><td colspan="${headers.length}">${isRTL ? 'لا توجد بيانات' : 'No data available'}</td></tr>`
            }</tbody>
          </table>
        </body>
        </html>
      `

      const printWindow = window.open('', '_blank')
      printWindow.document.write(htmlContent)
      printWindow.document.close()
      setTimeout(() => printWindow.print(), 500)
    } catch (err) {
      console.error('Error exporting schedule PDF:', err)
    } finally {
      setExporting(false)
    }
  }

  // Get sessions for a specific day
  const getSessionsForDay = (dayIndex) => {
    const { weekStart } = getWeekDates()
    const targetDate = new Date(weekStart)
    targetDate.setDate(targetDate.getDate() + dayIndex)
    // Format date without timezone conversion (YYYY-MM-DD)
    const year = targetDate.getFullYear()
    const month = String(targetDate.getMonth() + 1).padStart(2, '0')
    const day = String(targetDate.getDate()).padStart(2, '0')
    const targetDateString = `${year}-${month}-${day}`

    return sessions.filter(s => s.date === targetDateString)
  }

  // View Session Details
  const handleSessionClick = (session) => {
    setSelectedSession(session)
    setShowSessionModal(true)
  }

  // Open create modal
  const handleCreateSession = () => {
    setEditingSession(null)
    setFormData({
      program_id: '',
      coach_id: '',
      date: '',
      start_time: '',
      end_time: '',
      facility: '',
      notes: '',
      is_recurring: false
    })
    setFormErrors({})
    setValidationMessage('')
    setShowFormModal(true)
  }

  // Open edit modal
  const handleEditSession = (session) => {
    setEditingSession(session)
    setFormData({
      program_id: session.program_id,
      coach_id: session.coach_id,
      date: session.date,
      start_time: session.start_time.substring(0, 5),
      end_time: session.end_time.substring(0, 5),
      facility: session.facility || '',
      notes: session.notes || '',
      is_recurring: session.is_recurring || false
    })
    setFormErrors({})
    setValidationMessage('')
    setShowFormModal(true)
  }

  // Handle form input change
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
      ...(name === 'program_id' ? { coach_id: '' } : null)
    }))
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  // Validate form
  const validateForm = () => {
    const errors = {}
    if (!formData.program_id) errors.program_id = language === 'ar' ? 'البرنامج مطلوب' : 'Program is required'
    if (!formData.coach_id) errors.coach_id = language === 'ar' ? 'المدرب مطلوب' : 'Coach is required'
    if (!formData.date) errors.date = language === 'ar' ? 'التاريخ مطلوب' : 'Date is required'
    if (!formData.start_time) errors.start_time = language === 'ar' ? 'وقت البداية مطلوب' : 'Start time is required'
    if (!formData.end_time) errors.end_time = language === 'ar' ? 'وقت النهاية مطلوب' : 'End time is required'

    // Validate time range
    if (formData.start_time && formData.end_time && formData.start_time >= formData.end_time) {
      errors.end_time = language === 'ar' ? 'وقت النهاية يجب أن يكون بعد وقت البداية' : 'End time must be after start time'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle form submit
  const handleFormSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setSubmitting(true)
    setValidationMessage('')

    try {
      // First, validate for conflicts (only if not editing the same session)
      const validationData = {
        coach_id: formData.coach_id,
        branch_id: user.branch_id,
        facility: formData.facility,
        date: formData.date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        session_id: editingSession?.id
      }

      const validationResponse = await scheduleService.validateSchedule(validationData)

      if (!validationResponse.success || validationResponse.data.hasConflict) {
        setValidationMessage(
          validationResponse.data.message ||
          (language === 'ar' ? 'يوجد تعارض في الجدول' : 'Schedule conflict detected')
        )
        setSubmitting(false)
        return
      }

      // Prepare session data
      const sessionData = {
        program_id: formData.program_id,
        coach_id: formData.coach_id,
        date: formData.date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        facility: formData.facility || null,
        notes: formData.notes || null,
        is_recurring: formData.is_recurring
      }

      let response
      if (editingSession) {
        response = await scheduleService.updateSession(editingSession.id, sessionData)
      } else {
        response = await scheduleService.createSession(sessionData)
      }

      if (response.success) {
        setShowFormModal(false)
        fetchSchedule() // Refresh the schedule
        // Could add toast notification here
      }
    } catch (err) {
      console.error('Error saving session:', err)
      setValidationMessage(err.message || (language === 'ar' ? 'حدث خطأ أثناء الحفظ' : 'Error saving session'))
    } finally {
      setSubmitting(false)
    }
  }

  // Handle session delete
  const handleDeleteSession = async (sessionId) => {
    try {
      const response = await scheduleService.cancelSession(sessionId, { permanent: true })
      if (response.success) {
        setShowSessionModal(false)
        setShowDeleteConfirm(false)
        fetchSchedule()
      }
    } catch (err) {
      console.error('Error deleting session:', err)
      alert(err.message || (language === 'ar' ? 'حدث خطأ أثناء الحذف' : 'Error deleting session'))
    }
  }

  // Drag and Drop Handlers
  const handleDragStart = (event) => {
    setActiveId(event.active.id)
    setIsDragging(true)
  }

  const handleDragEnd = async (event) => {
    const { active, over } = event
    setActiveId(null)
    setIsDragging(false)

    if (!over || active.id === over.id) return

    // Parse the dragged session ID and target day index
    const sessionId = active.id
    const targetDayIndex = parseInt(over.id.replace('day-', ''))

    // Find the session being dragged
    const session = sessions.find(s => s.id === sessionId)
    if (!session) return

    // Calculate the new date based on target day
    const { weekStart } = getWeekDates()
    const newDate = new Date(weekStart)
    newDate.setDate(newDate.getDate() + targetDayIndex)
    // Format date without timezone conversion (YYYY-MM-DD)
    const year = newDate.getFullYear()
    const month = String(newDate.getMonth() + 1).padStart(2, '0')
    const dayNum = String(newDate.getDate()).padStart(2, '0')
    const newDateString = `${year}-${month}-${dayNum}`

    // Don't update if dropping on the same day
    if (session.date === newDateString) return

    // Validate the reschedule
    try {
      const validationData = {
        coach_id: session.coach_id,
        branch_id: user.branch_id,
        facility: session.facility,
        date: newDateString,
        start_time: session.start_time,
        end_time: session.end_time,
        session_id: session.id
      }

      const validationResponse = await scheduleService.validateSchedule(validationData)

      if (!validationResponse.success || validationResponse.data.hasConflict) {
        alert(
          validationResponse.data.message ||
          (language === 'ar' ? 'يوجد تعارض في الجدول' : 'Schedule conflict detected')
        )
        return
      }

      // Update the session with new date
      const updateData = {
        program_id: session.program_id,
        coach_id: session.coach_id,
        date: newDateString,
        start_time: session.start_time,
        end_time: session.end_time,
        facility: session.facility,
        max_capacity: session.max_capacity,
        notes: session.notes,
        is_recurring: session.is_recurring
      }

      const response = await scheduleService.updateSession(session.id, updateData)

      if (response.success) {
        fetchSchedule() // Refresh the schedule
        // Could add toast notification here
      }
    } catch (err) {
      console.error('Error rescheduling session:', err)
      alert(err.message || (language === 'ar' ? 'حدث خطأ أثناء إعادة الجدولة' : 'Error rescheduling session'))
    }
  }

  const handleDragCancel = () => {
    setActiveId(null)
    setIsDragging(false)
  }

  // Get the active session being dragged
  const activeSession = activeId ? sessions.find(s => s.id === activeId) : null

  // Draggable Session Component
  const DraggableSession = ({ session, children }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging: isItemDragging } = useDraggable({
      id: session.id,
      data: session
    })

    const style = {
      transform: CSS.Translate.toString(transform),
      opacity: isItemDragging ? 0.5 : 1,
      cursor: isItemDragging ? 'grabbing' : 'grab'
    }

    return children({
      setNodeRef,
      style,
      isItemDragging,
      dragHandleProps: { ...attributes, ...listeners }
    })
  }

  // Droppable Day Container Component
  const DroppableDay = ({ dayIndex, children }) => {
    const { setNodeRef, isOver } = useDroppable({
      id: `day-${dayIndex}`
    })

    return (
      <div
        ref={setNodeRef}
        className={`transition-colors ${isOver ? 'bg-indigo-50 dark:bg-indigo-500/10' : ''}`}
      >
        {children}
      </div>
    )
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
    <DndContext
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
        <div className="text-center md:text-start">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-secondary dark:text-white">
            {language === 'ar' ? 'جدول التدريبات' : 'Training Schedule'}
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            {language === 'ar' ? 'عرض وإدارة جدول الحصص التدريبية' : 'View and manage training sessions schedule'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full md:w-auto">
          {/* Export PDF Menu */}
          <div className="relative">
            <Button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={exporting}
              className="w-full sm:w-auto bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white flex items-center justify-center gap-1 sm:gap-2 text-[11px] sm:text-sm py-1.5 sm:py-2.5 px-3 sm:px-4"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span className="hidden sm:inline">{language === 'ar' ? 'تصدير PDF' : 'Export PDF'}</span>
              <span className="sm:hidden">PDF</span>
            </Button>
            {showExportMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowExportMenu(false)}
                />
                <div className="absolute right-0 rtl:left-0 rtl:right-auto mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                <div className="px-4 pt-3 text-[11px] text-gray-500 dark:text-gray-400">
                  Daily - Weekly - Monthly
                </div>
                <button
                  onClick={() => {
                    exportScheduleToPDF('daily')
                    setShowExportMenu(false)
                  }}
                  className="w-full text-left rtl:text-right px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-xl flex items-center gap-2"
                >
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white text-sm">
                      {language === 'ar' ? 'يومي' : 'Daily'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {language === 'ar' ? 'جدول اليوم' : "Today's schedule"}
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => {
                    exportScheduleToPDF('weekly')
                    setShowExportMenu(false)
                  }}
                  className="w-full text-left rtl:text-right px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white text-sm">
                      {language === 'ar' ? 'أسبوعي' : 'Weekly'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {language === 'ar' ? 'جدول هذا الأسبوع' : 'This week'}
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => {
                    exportScheduleToPDF('monthly')
                    setShowExportMenu(false)
                  }}
                  className="w-full text-left rtl:text-right px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 last:rounded-b-xl flex items-center gap-2"
                >
                  <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white text-sm">
                      {language === 'ar' ? 'شهري' : 'Monthly'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {language === 'ar' ? 'جدول هذا الشهر' : 'This month'}
                    </p>
                  </div>
                </button>
              </div>
              </>
            )}
          </div>
          <Button
            onClick={handleCreateSession}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-1 sm:gap-2 text-[11px] sm:text-sm py-1.5 sm:py-2.5 px-3 sm:px-4"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">{language === 'ar' ? 'إضافة حصة' : 'Add Session'}</span>
            <span className="sm:hidden">{language === 'ar' ? 'إضافة' : 'Add'}</span>
          </Button>
        </div>
      </div>

      {/* Controls Bar */}
      <GlassCard className="p-3 sm:p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 sm:gap-4">
          {/* View Mode Selector */}
          <div className="w-full lg:w-auto flex items-center gap-1 sm:gap-2 bg-gray-100 dark:bg-white/5 p-1 rounded-xl overflow-x-auto">
            {[
              { value: 'week', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', label: language === 'ar' ? 'أسبوع' : 'Week' },
              { value: 'day', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', label: language === 'ar' ? 'يوم' : 'Day' },
              { value: 'list', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16', label: language === 'ar' ? 'قائمة' : 'List' }
            ].map(mode => (
              <button
                key={mode.value}
                onClick={() => setViewMode(mode.value)}
                className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-all whitespace-nowrap text-xs sm:text-sm ${
                  viewMode === mode.value
                    ? 'bg-white dark:bg-white/10 text-indigo-600 dark:text-indigo-400 shadow-md'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mode.icon} />
                </svg>
                <span className="hidden md:inline">{mode.label}</span>
              </button>
            ))}
          </div>
          <div className="w-full sm:w-auto flex items-center gap-2 px-3 py-2 rounded-xl bg-white/60 dark:bg-white/5 border border-gray-200 dark:border-white/10 justify-center sm:justify-start text-xs sm:text-sm">
            <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="text-xs sm:text-sm">
              <span className="font-bold text-secondary dark:text-white">{totalSessions}</span>
              <span className="ml-1 rtl:ml-0 rtl:mr-1 text-gray-600 dark:text-gray-400">
                {language === 'ar' ? 'مجموع الحصص' : 'Total Sessions'}
              </span>
            </div>
          </div>

          {/* Date Navigation */}
          <div className="flex flex-wrap items-center gap-2 flex-1 justify-center lg:justify-start text-xs sm:text-sm">
            <button
              onClick={() => navigateDate(-1)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors"
            >
              <svg className="w-5 h-5 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex-1 text-center">
              <p className="font-semibold text-secondary dark:text-white">{formatDateDisplay()}</p>
            </div>

            <button
              onClick={() => navigateDate(1)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors"
            >
              <svg className="w-5 h-5 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button
              onClick={goToToday}
              className="px-4 py-2 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl font-medium hover:bg-indigo-200 dark:hover:bg-indigo-500/30 transition-colors w-full sm:w-auto"
            >
              {language === 'ar' ? 'اليوم' : 'Today'}
            </button>
          </div>

          {/* Filters */}
          {viewMode === 'list' && (
            <div className="flex items-center gap-2 w-full lg:w-auto">
              <select
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value)}
                className="w-full lg:w-auto px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">{language === 'ar' ? 'كل البرامج' : 'All Programs'}</option>
                {programs.map(p => (
                  <option key={p.id} value={p.id}>{language === 'ar' ? p.name_ar : p.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Main Content */}
      {sessions.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-gray-500 mb-2">{language === 'ar' ? 'لا توجد حصص مجدولة' : 'No sessions scheduled'}</p>
          <p className="text-sm text-gray-400">{language === 'ar' ? 'سيتم عرض الحصص التدريبية هنا' : 'Training sessions will appear here'}</p>
        </GlassCard>
      ) : (
        <>
          {/* Weekly View */}
          {viewMode === 'week' && (
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <div className="sm:hidden space-y-3">
                {days.map((day, idx) => {
                  const daySessions = getSessionsForDay(idx)
                  const { weekStart } = getWeekDates()
                  const dayDate = new Date(weekStart)
                  dayDate.setDate(dayDate.getDate() + idx)
                  const isToday = dayDate.toDateString() === new Date().toDateString()

                  return (
                    <div
                      key={day}
                      className={`rounded-xl border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-white/5 p-3 ${
                        isToday ? 'ring-1 ring-indigo-500' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className={`font-bold text-sm ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-secondary dark:text-white'}`}>
                            {day}
                          </p>
                          <p className="text-xs text-gray-500">{dayDate.getDate()}</p>
                        </div>
                        <p className="text-xs text-gray-500">{daySessions.length} {language === 'ar' ? 'حصة' : 'sessions'}</p>
                      </div>
                      <div className="space-y-2">
                        {daySessions.length === 0 ? (
                          <p className="text-xs text-gray-400">{language === 'ar' ? 'لا توجد حصص' : 'No sessions'}</p>
                        ) : (
                          daySessions.map(session => (
                            <button
                              key={session.id}
                              onClick={() => handleSessionClick(session)}
                              className={`w-full p-2 rounded-lg text-left text-xs transition-all ${
                                session.is_cancelled
                                  ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 line-through'
                                  : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                              }`}
                            >
                              <p className="font-bold">{session.start_time.substring(0, 5)}</p>
                              <p className="truncate">{language === 'ar' ? session.program?.name_ar : session.program?.name}</p>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="hidden sm:inline-grid grid-cols-7 gap-2 sm:gap-3 min-w-full sm:min-w-0">
                {days.map((day, idx) => {
                const daySessions = getSessionsForDay(idx)
                const { weekStart } = getWeekDates()
                  const dayDate = new Date(weekStart)
                  dayDate.setDate(dayDate.getDate() + idx)
                  const isToday = dayDate.toDateString() === new Date().toDateString()

                  return (
                    <GlassCard key={day} className={`p-2 sm:p-3 min-w-[120px] sm:min-w-0 ${isToday ? 'ring-2 ring-indigo-500' : ''}`}>
                      <div className="mb-2 sm:mb-3">
                        <p className={`font-bold text-xs sm:text-sm ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-secondary dark:text-white'}`}>
                          {day}
                        </p>
                        <p className="text-[10px] sm:text-xs text-gray-500">{dayDate.getDate()}</p>
                        <p className="text-[10px] sm:text-xs text-gray-500">{daySessions.length} {language === 'ar' ? 'حصة' : 'sessions'}</p>
                      </div>
                      <DroppableDay dayIndex={idx}>
                        <div className="space-y-1.5 sm:space-y-2 min-h-[80px] sm:min-h-[100px]">
                          {daySessions.slice(0, 3).map(session => (
                            <DraggableSession key={session.id} session={session}>
                              {({ setNodeRef, style, dragHandleProps, isItemDragging }) => (
                                <div ref={setNodeRef} style={style}>
                                  <button
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      if (!isDragging && !isItemDragging) {
                                        handleSessionClick(session)
                                      }
                                    }}
                                    className={`w-full p-1.5 sm:p-2 rounded-lg text-left text-[10px] sm:text-xs transition-all hover:scale-105 touch-manipulation ${
                                      session.is_cancelled
                                        ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 line-through'
                                        : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-1">
                                      <div className="min-w-0">
                                        <p className="font-bold">{session.start_time.substring(0, 5)}</p>
                                        <p className="truncate">{language === 'ar' ? session.program?.name_ar : session.program?.name}</p>
                                      </div>
                                      <span
                                        {...dragHandleProps}
                                        onClick={(event) => event.preventDefault()}
                                        className="flex items-center justify-center w-5 h-5 rounded-md bg-white/60 dark:bg-white/10 text-indigo-600 dark:text-indigo-400 cursor-grab active:cursor-grabbing"
                                        title={language === 'ar' ? 'اسحب' : 'Drag'}
                                        aria-label={language === 'ar' ? 'اسحب' : 'Drag'}
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6h.01M14 6h.01M10 12h.01M14 12h.01M10 18h.01M14 18h.01" />
                                        </svg>
                                      </span>
                                    </div>
                                  </button>
                                </div>
                              )}
                            </DraggableSession>
                          ))}
                          {daySessions.length > 3 && (
                            <p className="text-[10px] sm:text-xs text-gray-500 text-center">+{daySessions.length - 3} {language === 'ar' ? 'أكثر' : 'more'}</p>
                          )}
                        </div>
                      </DroppableDay>
                    </GlassCard>
                  )
                })}
              </div>
            </div>
          )}

          {/* Day View */}
          {viewMode === 'day' && (
            <GlassCard className="p-6">
              <div className="space-y-3">
                {sessions.map(session => (
                  <button
                    key={session.id}
                    onClick={() => handleSessionClick(session)}
                    className={`w-full p-4 rounded-xl transition-all text-left ${
                      session.is_cancelled
                        ? 'bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20'
                        : 'bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-500/10 dark:to-purple-500/10 hover:from-indigo-100 hover:to-purple-100 dark:hover:from-indigo-500/20 dark:hover:to-purple-500/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className={`text-2xl font-bold ${session.is_cancelled ? 'text-red-600 dark:text-red-400 line-through' : 'text-indigo-600 dark:text-indigo-400'}`}>
                            {session.start_time.substring(0, 5)}
                          </p>
                          <p className="text-xs text-gray-500">{session.end_time.substring(0, 5)}</p>
                        </div>
                        <div>
                          <p className={`font-bold text-secondary dark:text-white ${session.is_cancelled ? 'line-through' : ''}`}>
                            {language === 'ar' ? session.program?.name_ar : session.program?.name}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {language === 'ar' ? session.coach?.name_ar : `${session.coach?.first_name} ${session.coach?.last_name}`}
                          </p>
                          {session.is_cancelled && (
                            <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                              {language === 'ar' ? 'ملغاة' : 'Cancelled'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          {session.current_enrollment} / {session.max_capacity}
                        </p>
                        {session.facility && (
                          <p className="text-xs text-gray-500">{session.facility}</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </GlassCard>
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <GlassCard className="overflow-hidden">
              <div className="sm:hidden space-y-3 p-3">
                {sessions.map(session => (
                  <button
                    key={session.id}
                    onClick={() => handleSessionClick(session)}
                    className="w-full text-left bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-3 shadow-sm hover:shadow transition-shadow"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-secondary dark:text-white truncate">
                          {language === 'ar' ? session.program?.name_ar : session.program?.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {language === 'ar' ? session.coach?.name_ar : `${session.coach?.first_name} ${session.coach?.last_name}`}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        session.is_cancelled
                          ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                          : 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400'
                      }`}>
                        {session.is_cancelled ? (language === 'ar' ? 'ملغاة' : 'Cancelled') : (language === 'ar' ? 'نشطة' : 'Active')}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                      <span>{session.date}</span>
                      <span>{session.start_time.substring(0, 5)} - {session.end_time.substring(0, 5)}</span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                        {language === 'ar' ? 'التاريخ' : 'Date'}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                        {language === 'ar' ? 'الوقت' : 'Time'}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                        {language === 'ar' ? 'البرنامج' : 'Program'}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                        {language === 'ar' ? 'المدرب' : 'Coach'}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                        {language === 'ar' ? 'الحالة' : 'Status'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                    {sessions.map(session => (
                      <tr
                        key={session.id}
                        onClick={() => handleSessionClick(session)}
                        className="hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 text-sm text-secondary dark:text-white">{session.date}</td>
                        <td className="px-4 py-3 text-sm text-secondary dark:text-white">
                          {session.start_time.substring(0, 5)} - {session.end_time.substring(0, 5)}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-secondary dark:text-white">
                          {language === 'ar' ? session.program?.name_ar : session.program?.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {language === 'ar' ? session.coach?.name_ar : `${session.coach?.first_name} ${session.coach?.last_name}`}
                        </td>
                        <td className="px-4 py-3">
                          {session.is_cancelled ? (
                            <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-full">
                              {language === 'ar' ? 'ملغاة' : 'Cancelled'}
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 rounded-full">
                              {language === 'ar' ? 'نشطة' : 'Active'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}
        </>
      )}

      {/* Session Details Modal */}
      {showSessionModal && selectedSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowSessionModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-secondary dark:text-white">
                {language === 'ar' ? 'تفاصيل الحصة' : 'Session Details'}
              </h2>
              <button
                onClick={() => setShowSessionModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{language === 'ar' ? 'البرنامج' : 'Program'}</p>
                <p className="text-lg font-bold text-secondary dark:text-white">
                  {language === 'ar' ? selectedSession.program?.name_ar : selectedSession.program?.name}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{language === 'ar' ? 'المدرب' : 'Coach'}</p>
                  <p className="font-semibold text-secondary dark:text-white">
                    {language === 'ar' ? selectedSession.coach?.name_ar : `${selectedSession.coach?.first_name} ${selectedSession.coach?.last_name}`}
                  </p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{language === 'ar' ? 'التاريخ' : 'Date'}</p>
                  <p className="font-semibold text-secondary dark:text-white">{selectedSession.date}</p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{language === 'ar' ? 'الوقت' : 'Time'}</p>
                  <p className="font-semibold text-secondary dark:text-white">
                    {selectedSession.start_time.substring(0, 5)} - {selectedSession.end_time.substring(0, 5)}
                  </p>
                </div>

              </div>

              {selectedSession.facility && (
                <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{language === 'ar' ? 'المكان' : 'Facility'}</p>
                  <p className="font-semibold text-secondary dark:text-white">{selectedSession.facility}</p>
                </div>
              )}

              {selectedSession.notes && (
                <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{language === 'ar' ? 'ملاحظات' : 'Notes'}</p>
                  <p className="text-secondary dark:text-white">{selectedSession.notes}</p>
                </div>
              )}

              {selectedSession.is_cancelled && (
                <div className="p-4 bg-red-50 dark:bg-red-500/10 rounded-xl border-2 border-red-200 dark:border-red-500/30">
                  <p className="text-sm text-red-600 dark:text-red-400 font-bold mb-2">
                    {language === 'ar' ? '⚠️ هذه الحصة ملغاة' : '⚠️ This session is cancelled'}
                  </p>
                  {selectedSession.cancellation_reason && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {language === 'ar' ? 'السبب: ' : 'Reason: '}{selectedSession.cancellation_reason}
                    </p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-white/10">
                <Button
                  onClick={() => {
                    setShowSessionModal(false)
                    handleEditSession(selectedSession)
                  }}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  {language === 'ar' ? 'تعديل' : 'Edit'}
                </Button>
                <Button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  {language === 'ar' ? 'حذف' : 'Delete'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-secondary dark:text-white mb-2">
              {language === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              {language === 'ar'
                ? 'هل أنت متأكد من حذف هذه الحصة؟ لا يمكن التراجع عن هذا الإجراء.'
                : 'Are you sure you want to delete this session? This action cannot be undone.'}
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-white/20"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                onClick={() => handleDeleteSession(selectedSession.id)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {language === 'ar' ? 'حذف' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Session Form Modal (Create/Edit) */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowFormModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-secondary dark:text-white">
                {editingSession
                  ? (language === 'ar' ? 'تعديل الحصة' : 'Edit Session')
                  : (language === 'ar' ? 'إضافة حصة جديدة' : 'Create New Session')
                }
              </h2>
              <button
                onClick={() => setShowFormModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Validation Message */}
              {validationMessage && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-xl">
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">{validationMessage}</p>
                </div>
              )}

              {/* Program Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'ar' ? 'البرنامج' : 'Program'} *
                </label>
                <select
                  name="program_id"
                  value={formData.program_id}
                  onChange={handleFormChange}
                  className={`w-full px-4 py-2 rounded-xl border ${
                    formErrors.program_id
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-gray-200 dark:border-white/10'
                  } bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                  required
                >
                  <option value="">{language === 'ar' ? 'اختر البرنامج' : 'Select Program'}</option>
                  {programs.map(program => (
                    <option key={program.id} value={program.id}>
                      {language === 'ar' ? program.name_ar : program.name}
                    </option>
                  ))}
                </select>
                {formErrors.program_id && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.program_id}</p>
                )}
              </div>

              {/* Coach Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'ar' ? 'المدرب' : 'Coach'} *
                </label>
                <select
                  name="coach_id"
                  value={formData.coach_id}
                  onChange={handleFormChange}
                  className={`w-full px-4 py-2 rounded-xl border ${
                    formErrors.coach_id
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-gray-200 dark:border-white/10'
                  } bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                  required
                disabled={!formData.program_id || coachesLoading || coaches.length === 0}
                >
                {!formData.program_id && (
                  <option value="">
                    {language === 'ar' ? 'اختر البرنامج أولاً' : 'Select a program first'}
                  </option>
                )}
                {formData.program_id && coachesLoading && (
                  <option value="">
                    {language === 'ar' ? 'جاري تحميل المدربين...' : 'Loading coaches...'}
                  </option>
                )}
                {formData.program_id && !coachesLoading && coaches.length === 0 && (
                  <option value="">
                    {language === 'ar' ? 'لا يوجد مدربون لهذا البرنامج' : 'No coaches assigned to this program'}
                  </option>
                )}
                {formData.program_id && !coachesLoading && coaches.length > 0 && (
                  <option value="">{language === 'ar' ? 'اختر المدرب' : 'Select Coach'}</option>
                )}
                  {coaches.map(coach => (
                    <option key={coach.id} value={coach.id}>
                    {language === 'ar'
                      ? (coach.name_ar || `${coach.first_name} ${coach.last_name}`)
                      : `${coach.first_name} ${coach.last_name}`}
                    </option>
                  ))}
                </select>
                {formErrors.coach_id && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.coach_id}</p>
                )}
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'ar' ? 'التاريخ' : 'Date'} *
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleFormChange}
                    className={`w-full px-4 py-2 rounded-xl border ${
                      formErrors.date
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-gray-200 dark:border-white/10'
                    } bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                    required
                  />
                  {formErrors.date && (
                    <p className="text-sm text-red-500 mt-1">{formErrors.date}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'ar' ? 'وقت البداية' : 'Start Time'} *
                  </label>
                  <input
                    type="time"
                    name="start_time"
                    value={formData.start_time}
                    onChange={handleFormChange}
                    className={`w-full px-4 py-2 rounded-xl border ${
                      formErrors.start_time
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-gray-200 dark:border-white/10'
                    } bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                    required
                  />
                  {formErrors.start_time && (
                    <p className="text-sm text-red-500 mt-1">{formErrors.start_time}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'ar' ? 'وقت النهاية' : 'End Time'} *
                  </label>
                  <input
                    type="time"
                    name="end_time"
                    value={formData.end_time}
                    onChange={handleFormChange}
                    className={`w-full px-4 py-2 rounded-xl border ${
                      formErrors.end_time
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-gray-200 dark:border-white/10'
                    } bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                    required
                  />
                  {formErrors.end_time && (
                    <p className="text-sm text-red-500 mt-1">{formErrors.end_time}</p>
                  )}
                </div>
              </div>

              {/* Facility */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'ar' ? 'المكان' : 'Facility'}
                </label>
                <input
                  type="text"
                  name="facility"
                  value={formData.facility}
                  onChange={handleFormChange}
                  placeholder={language === 'ar' ? 'مثال: الملعب الرئيسي' : 'e.g., Main Field'}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'ar' ? 'ملاحظات' : 'Notes'}
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleFormChange}
                  rows="3"
                  placeholder={language === 'ar' ? 'أضف أي ملاحظات إضافية...' : 'Add any additional notes...'}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Recurring Option */}
              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                <input
                  type="checkbox"
                  name="is_recurring"
                  checked={formData.is_recurring}
                  onChange={handleFormChange}
                  className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {language === 'ar' ? 'حصة متكررة (أسبوعياً)' : 'Recurring Session (Weekly)'}
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-white/10">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {submitting
                    ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                    : editingSession
                      ? (language === 'ar' ? 'تحديث' : 'Update')
                      : (language === 'ar' ? 'إنشاء' : 'Create')
                  }
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-white/20"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>

    {/* Drag Overlay - Shows the dragged item */}
    <DragOverlay>
      {activeSession && (
        <div className="bg-indigo-100 dark:bg-indigo-500/20 p-3 rounded-xl border-2 border-indigo-300 dark:border-indigo-500 shadow-lg cursor-grabbing">
          <p className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">
            {activeSession.start_time.substring(0, 5)}
          </p>
          <p className="text-sm truncate text-gray-700 dark:text-gray-300">
            {language === 'ar' ? activeSession.program?.name_ar : activeSession.program?.name}
          </p>
        </div>
      )}
    </DragOverlay>
  </DndContext>
  )
}
