import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { useAuth } from '../../hooks/useAuth'
import { programsService, evaluationService } from '../../services'
import scheduleService from '../../services/schedule.service'
import GlassCard from '../../components/ui/GlassCard'
import Button from '../../components/ui/Button'
import { formatDateString, parseLocalDate, getTodayString } from '../../utils/dateUtils'

export default function Evaluations() {
  const { language } = useLanguage()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState(getTodayString())
  const [sessions, setSessions] = useState([])
  const [programs, setPrograms] = useState([])
  const [players, setPlayers] = useState([])
  const [selectedProgram, setSelectedProgram] = useState(null)
  const [selectedSession, setSelectedSession] = useState(null)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [evaluations, setEvaluations] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [activeTab, setActiveTab] = useState('quick')
  const [editingQuickEval, setEditingQuickEval] = useState(null) // Track existing quick evaluation
  const [editingDetailedEval, setEditingDetailedEval] = useState(null) // Track existing detailed evaluation
  
  // Quick evaluation form
  const [quickForm, setQuickForm] = useState({
    overall_rating: 0,
    goals: 0,
    notes: ''
  })

  // Detailed evaluation form
  const [detailedForm, setDetailedForm] = useState({
    ball_control: 0, passing: 0, shooting: 0, dribbling: 0,
    speed: 0, stamina: 0, strength: 0, agility: 0,
    attitude: 0, discipline: 0, teamwork: 0, effort: 0,
    notes: ''
  })

  const skillCategories = [
    {
      id: 'technical',
      name: { en: 'Technical Skills', ar: 'المهارات التقنية' },
      icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z',
      color: 'from-blue-400 to-blue-600',
      skills: [
        { id: 'ball_control', name: { en: 'Ball Control', ar: 'السيطرة على الكرة' } },
        { id: 'passing', name: { en: 'Passing', ar: 'التمرير' } },
        { id: 'shooting', name: { en: 'Shooting', ar: 'التسديد' } },
        { id: 'dribbling', name: { en: 'Dribbling', ar: 'المراوغة' } },
      ]
    },
    {
      id: 'physical',
      name: { en: 'Physical Fitness', ar: 'اللياقة البدنية' },
      icon: 'M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7',
      color: 'from-orange-400 to-orange-600',
      skills: [
        { id: 'speed', name: { en: 'Speed', ar: 'السرعة' } },
        { id: 'stamina', name: { en: 'Stamina', ar: 'التحمل' } },
        { id: 'strength', name: { en: 'Strength', ar: 'القوة' } },
        { id: 'agility', name: { en: 'Agility', ar: 'الرشاقة' } },
      ]
    },
    {
      id: 'mental',
      name: { en: 'Mental Attributes', ar: 'الصفات الذهنية' },
      icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2-3.5l5-2.5-5-2.5v5zm5-8.5H9v2h6V8z',
      color: 'from-purple-400 to-purple-600',
      skills: [
        { id: 'attitude', name: { en: 'Attitude', ar: 'السلوك' } },
        { id: 'discipline', name: { en: 'Discipline', ar: 'الانضباط' } },
        { id: 'teamwork', name: { en: 'Teamwork', ar: 'العمل الجماعي' } },
        { id: 'effort', name: { en: 'Effort', ar: 'الجهد' } },
      ]
    },
  ]

  // Fetch sessions for selected date (coach's sessions)
  const fetchSessionsForDate = useCallback(async () => {
    if (!selectedDate || !user?.id) return
    
    try {
      setLoading(true)
      const response = await scheduleService.getCoachSchedule(user.id, selectedDate)
      
      if (response.success && response.data) {
        const allSessions = response.data.sessions || []
        // Filter sessions for the selected date only
        const dateSessions = allSessions
          .filter(s => s.date === selectedDate && !s.is_cancelled)
          .sort((a, b) => a.start_time > b.start_time ? 1 : -1)
        
        setSessions(dateSessions)
        
        // Extract unique programs from sessions
        const uniquePrograms = []
        dateSessions.forEach(session => {
          if (session.program && !uniquePrograms.find(p => p.id === session.program.id)) {
            uniquePrograms.push(session.program)
          }
        })
        setPrograms(uniquePrograms)
      } else {
        setSessions([])
        setPrograms([])
      }
    } catch (err) {
      console.error('Error fetching sessions:', err)
      setSessions([])
      setPrograms([])
    } finally {
      setLoading(false)
    }
  }, [selectedDate, user?.id])

  // Fetch players for selected program
  const fetchPlayers = useCallback(async () => {
    if (!selectedProgram) {
      setPlayers([])
      return
    }
    try {
      const response = await programsService.getPlayers(selectedProgram.id)
      if (response.success && response.data) {
        const playerList = (response.data || []).map(p => ({
          id: p.id,
          name: `${p.first_name} ${p.last_name}`,
          name_ar: `${p.first_name_ar || p.first_name} ${p.last_name_ar || p.last_name}`,
          avatar: p.avatar
        }))
        setPlayers(playerList)
      }
    } catch (err) {
      console.error('Error fetching players:', err)
    }
  }, [selectedProgram])

  // Fetch evaluations for selected session
  const fetchSessionEvaluations = useCallback(async () => {
    if (!selectedSession) {
      setEvaluations([])
      return
    }
    try {
      const response = await evaluationService.getAll({ session_id: selectedSession.id })
      if (response.success && response.data) {
        setEvaluations(response.data)
      }
    } catch (err) {
      console.error('Error fetching evaluations:', err)
    }
  }, [selectedSession])

  useEffect(() => {
    fetchSessionsForDate()
  }, [fetchSessionsForDate])

  useEffect(() => {
    if (selectedProgram) {
      fetchPlayers()
    }
  }, [selectedProgram, fetchPlayers])

  useEffect(() => {
    if (selectedSession) {
      fetchSessionEvaluations()
    }
  }, [selectedSession, fetchSessionEvaluations])

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value)
    setSelectedProgram(null)
    setSelectedSession(null)
    setSelectedPlayer(null)
  }

  const handleProgramSelect = (program) => {
    setSelectedProgram(program)
    setSelectedSession(null)
    setSelectedPlayer(null)
  }

  const handleSessionSelect = (session) => {
    setSelectedSession(session)
    setSelectedPlayer(null)
  }

  const handlePlayerSelect = (player) => {
    setSelectedPlayer(player)
    
    // Check if player already has evaluations for this session (by type)
    const existingQuick = getPlayerEvaluationByType(player.id, 'quick')
    const existingDetailed = getPlayerEvaluationByType(player.id, 'detailed')
    
    setEditingQuickEval(existingQuick || null)
    setEditingDetailedEval(existingDetailed || null)
    
    // Load quick form from existing quick eval
    if (existingQuick) {
      setQuickForm({
        overall_rating: existingQuick.overall_rating || 0,
        goals: existingQuick.goals || 0,
        notes: existingQuick.notes || ''
      })
    } else {
      setQuickForm({ overall_rating: 0, goals: 0, notes: '' })
    }
    
    // Load detailed form from existing detailed eval
    if (existingDetailed) {
      setDetailedForm({
        ball_control: existingDetailed.ball_control || 0,
        passing: existingDetailed.passing || 0,
        shooting: existingDetailed.shooting || 0,
        dribbling: existingDetailed.dribbling || 0,
        speed: existingDetailed.speed || 0,
        stamina: existingDetailed.stamina || 0,
        strength: existingDetailed.strength || 0,
        agility: existingDetailed.agility || 0,
        attitude: existingDetailed.attitude || 0,
        discipline: existingDetailed.discipline || 0,
        teamwork: existingDetailed.teamwork || 0,
        effort: existingDetailed.effort || 0,
        notes: existingDetailed.notes || ''
      })
    } else {
      setDetailedForm({
        ball_control: 0, passing: 0, shooting: 0, dribbling: 0,
        speed: 0, stamina: 0, strength: 0, agility: 0,
        attitude: 0, discipline: 0, teamwork: 0, effort: 0,
        notes: ''
      })
    }
    
    // Default to quick tab, or detailed if only detailed exists
    if (existingDetailed && !existingQuick) {
      setActiveTab('detailed')
    } else {
      setActiveTab('quick')
    }
  }

  const getPlayerEvaluationByType = (playerId, type) => {
    return evaluations.find(e => e.player_id === playerId && e.session_id === selectedSession?.id && e.evaluation_type === type)
  }

  const getPlayerEvaluations = (playerId) => {
    return evaluations.filter(e => e.player_id === playerId && e.session_id === selectedSession?.id)
  }

  const getSessionsForProgram = () => {
    if (!selectedProgram) return []
    return sessions.filter(s => s.program_id === selectedProgram.id || s.program?.id === selectedProgram.id)
  }

  const handleQuickSubmit = async () => {
    if (!selectedPlayer || !selectedSession || quickForm.overall_rating === 0) {
      setMessage({ type: 'error', text: language === 'ar' ? 'يرجى اختيار تقييم' : 'Please select a rating' })
      return
    }

    setSubmitting(true)
    try {
      const evalData = {
        player_id: selectedPlayer.id,
        session_id: selectedSession.id,
        evaluation_type: 'quick',
        overall_rating: quickForm.overall_rating,
        goals: quickForm.goals || 0,
        notes: quickForm.notes,
        evaluation_date: selectedSession.date
      }

      let response
      if (editingQuickEval) {
        // Update existing quick evaluation
        response = await evaluationService.update(editingQuickEval.id, evalData)
      } else {
        // Create new quick evaluation
        response = await evaluationService.create(evalData)
      }

      if (response.success) {
        setMessage({ 
          type: 'success', 
          text: editingQuickEval 
            ? (language === 'ar' ? 'تم تحديث التقييم بنجاح' : 'Evaluation updated successfully')
            : (language === 'ar' ? 'تم حفظ التقييم بنجاح' : 'Evaluation saved successfully')
        })
        setQuickForm({ overall_rating: 0, goals: 0, notes: '' })
        setEditingQuickEval(null)
        setEditingDetailedEval(null)
        fetchSessionEvaluations()
        setSelectedPlayer(null)
      }
    } catch (err) {
      setMessage({ type: 'error', text: language === 'ar' ? 'حدث خطأ أثناء الحفظ' : 'Error saving evaluation' })
    } finally {
      setSubmitting(false)
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    }
  }

  const handleDetailedSubmit = async () => {
    if (!selectedPlayer || !selectedSession) return

    const hasRating = Object.entries(detailedForm).some(([key, val]) => key !== 'notes' && val > 0)
    if (!hasRating) {
      setMessage({ type: 'error', text: language === 'ar' ? 'يرجى تقييم مهارة واحدة على الأقل' : 'Please rate at least one skill' })
      return
    }

    setSubmitting(true)
    try {
      const submitData = { 
        player_id: selectedPlayer.id, 
        session_id: selectedSession.id,
        evaluation_type: 'detailed',
        evaluation_date: selectedSession.date
      }
      Object.entries(detailedForm).forEach(([key, val]) => {
        if (key === 'notes' || val > 0) {
          submitData[key] = val
        }
      })

      let response
      if (editingDetailedEval) {
        // Update existing detailed evaluation
        response = await evaluationService.update(editingDetailedEval.id, submitData)
      } else {
        // Create new detailed evaluation
        response = await evaluationService.create(submitData)
      }

      if (response.success) {
        setMessage({ 
          type: 'success', 
          text: editingDetailedEval
            ? (language === 'ar' ? 'تم تحديث التقييم التفصيلي بنجاح' : 'Detailed evaluation updated successfully')
            : (language === 'ar' ? 'تم حفظ التقييم التفصيلي بنجاح' : 'Detailed evaluation saved successfully')
        })
        setDetailedForm({
          ball_control: 0, passing: 0, shooting: 0, dribbling: 0,
          speed: 0, stamina: 0, strength: 0, agility: 0,
          attitude: 0, discipline: 0, teamwork: 0, effort: 0, notes: ''
        })
        setEditingQuickEval(null)
        setEditingDetailedEval(null)
        fetchSessionEvaluations()
        setSelectedPlayer(null)
      }
    } catch (err) {
      setMessage({ type: 'error', text: language === 'ar' ? 'حدث خطأ أثناء الحفظ' : 'Error saving evaluation' })
    } finally {
      setSubmitting(false)
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    }
  }

  const renderStars = (rating, onRate, size = 'large') => {
    const sizeClass = size === 'large' ? 'w-8 h-8 md:w-10 md:h-10' : 'w-5 h-5 md:w-6 md:h-6'
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRate && onRate(star)}
            className={`${onRate ? 'cursor-pointer hover:scale-110' : ''} transition-transform`}
          >
            <svg
              className={`${sizeClass} ${star <= rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
      </div>
    )
  }

  const formatDisplayDate = (dateStr) => {
    const date = parseLocalDate(dateStr)
    return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    })
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-3xl font-bold text-secondary dark:text-white">
          {language === 'ar' ? 'تقييم اللاعبين' : 'Player Evaluations'}
        </h1>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
          {language === 'ar' ? 'تقييم أداء اللاعبين بعد كل جلسة' : 'Evaluate player performance after each session'}
        </p>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`p-3 md:p-4 rounded-xl text-sm md:text-base ${message.type === 'success' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
          {message.text}
        </div>
      )}

      {/* Step 1: Date Selection */}
      <GlassCard className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
            <span className="font-bold text-secondary dark:text-white">{language === 'ar' ? 'اختر التاريخ' : 'Select Date'}</span>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            className="flex-1 sm:max-w-xs px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <span className="text-sm text-gray-500">
            {formatDisplayDate(selectedDate)}
          </span>
        </div>
      </GlassCard>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <svg className="w-8 h-8 text-emerald-500 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : sessions.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-gray-500 mb-2">{language === 'ar' ? 'لا توجد جلسات في هذا التاريخ' : 'No sessions on this date'}</p>
          <p className="text-sm text-gray-400">{language === 'ar' ? 'اختر تاريخاً آخر أو تحقق من الجدول' : 'Select another date or check your schedule'}</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Step 2: Program */}
          <div className="lg:col-span-3">
            <GlassCard className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                <span className="font-bold text-secondary dark:text-white">{language === 'ar' ? 'البرنامج' : 'Program'}</span>
              </div>
              <div className="space-y-2">
                {programs.map(program => (
                  <button
                    key={program.id}
                    onClick={() => handleProgramSelect(program)}
                    className={`w-full p-3 rounded-xl border-2 transition-all text-left ${
                      selectedProgram?.id === program.id
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10'
                        : 'border-gray-200 dark:border-white/10 hover:border-emerald-300'
                    }`}
                  >
                    <p className="font-bold text-sm text-secondary dark:text-white">
                      {language === 'ar' ? (program.name_ar || program.name) : program.name}
                    </p>
                  </button>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* Step 3: Session */}
          <div className="lg:col-span-3">
            <GlassCard className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <span className={`w-8 h-8 ${selectedProgram ? 'bg-emerald-500' : 'bg-gray-300'} text-white rounded-full flex items-center justify-center text-sm font-bold`}>3</span>
                <span className="font-bold text-secondary dark:text-white">{language === 'ar' ? 'الجلسة' : 'Session'}</span>
              </div>
              {!selectedProgram ? (
                <p className="text-sm text-gray-400 text-center py-4">{language === 'ar' ? 'اختر برنامجاً أولاً' : 'Select a program first'}</p>
              ) : getSessionsForProgram().length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">{language === 'ar' ? 'لا توجد جلسات' : 'No sessions'}</p>
              ) : (
                <div className="space-y-2">
                  {getSessionsForProgram().map(session => (
                    <button
                      key={session.id}
                      onClick={() => handleSessionSelect(session)}
                      className={`w-full p-3 rounded-xl border-2 transition-all text-left ${
                        selectedSession?.id === session.id
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10'
                          : 'border-gray-200 dark:border-white/10 hover:border-emerald-300'
                      }`}
                    >
                      <p className="font-bold text-sm text-secondary dark:text-white">
                        {session.start_time} - {session.end_time}
                      </p>
                      {session.facility && (
                        <p className="text-xs text-gray-500">{session.facility}</p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </GlassCard>
          </div>

          {/* Step 4: Players */}
          <div className="lg:col-span-6">
            <GlassCard className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <span className={`w-8 h-8 ${selectedSession ? 'bg-emerald-500' : 'bg-gray-300'} text-white rounded-full flex items-center justify-center text-sm font-bold`}>4</span>
                <span className="font-bold text-secondary dark:text-white">{language === 'ar' ? 'اللاعبون' : 'Players'}</span>
                {selectedSession && players.length > 0 && (
                  <span className="text-xs text-gray-400">
                    ({evaluations.length}/{players.length} {language === 'ar' ? 'تم تقييمهم' : 'evaluated'})
                  </span>
                )}
              </div>
              {!selectedSession ? (
                <p className="text-sm text-gray-400 text-center py-8">{language === 'ar' ? 'اختر جلسة لعرض اللاعبين' : 'Select a session to view players'}</p>
              ) : players.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">{language === 'ar' ? 'لا يوجد لاعبون' : 'No players'}</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {players.map(player => {
                    const playerEvals = getPlayerEvaluations(player.id)
                    const quickEval = playerEvals.find(e => e.evaluation_type === 'quick')
                    const detailedEval = playerEvals.find(e => e.evaluation_type === 'detailed')
                    const isEvaluated = playerEvals.length > 0
                    return (
                      <button
                        key={player.id}
                        onClick={() => handlePlayerSelect(player)}
                        className={`p-3 rounded-xl border-2 transition-all text-center hover:shadow-md ${
                          selectedPlayer?.id === player.id
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10'
                            : isEvaluated
                              ? 'border-green-300 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10 hover:border-green-400'
                              : 'border-gray-200 dark:border-white/10 hover:border-emerald-300'
                        }`}
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center text-white text-sm font-bold mx-auto mb-2 overflow-hidden">
                          {player.avatar ? (
                            <img 
                              src={player.avatar.startsWith('http') ? player.avatar : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${player.avatar}`}
                              alt={language === 'ar' ? player.name_ar : player.name}
                              className="w-full h-full object-cover"
                              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'block') }}
                            />
                          ) : null}
                          <span style={{ display: player.avatar ? 'none' : 'block' }}>{(player.name?.[0] || '?').toUpperCase()}</span>
                        </div>
                        <p className="font-medium text-xs text-secondary dark:text-white truncate">
                          {language === 'ar' ? player.name_ar : player.name}
                        </p>
                        {isEvaluated && (
                          <div className="mt-1 flex items-center justify-center gap-1 flex-wrap">
                            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            {quickEval && (
                              <span className="text-xs text-yellow-500">★{quickEval.overall_rating}</span>
                            )}
                            {detailedEval && (
                              <span className="text-xs text-blue-500 font-medium">{language === 'ar' ? 'تفصيلي' : 'D'}</span>
                            )}
                            <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </GlassCard>
          </div>
        </div>
      )}

      {/* Evaluation Form */}
      {selectedPlayer && selectedSession && (
        <GlassCard className={`p-4 md:p-6 border-2 ${(editingQuickEval || editingDetailedEval) ? 'border-blue-500' : 'border-emerald-500'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 bg-gradient-to-br ${(editingQuickEval || editingDetailedEval) ? 'from-blue-400 to-blue-600' : 'from-emerald-400 to-emerald-600'} rounded-xl flex items-center justify-center text-white text-lg font-bold overflow-hidden`}>
                {selectedPlayer.avatar ? (
                  <img 
                    src={selectedPlayer.avatar.startsWith('http') ? selectedPlayer.avatar : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${selectedPlayer.avatar}`}
                    alt={language === 'ar' ? selectedPlayer.name_ar : selectedPlayer.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'block') }}
                  />
                ) : null}
                <span style={{ display: selectedPlayer.avatar ? 'none' : 'block' }}>{selectedPlayer.name?.[0]?.toUpperCase()}</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-secondary dark:text-white">
                    {language === 'ar' ? selectedPlayer.name_ar : selectedPlayer.name}
                  </h3>
                  {(activeTab === 'quick' ? editingQuickEval : editingDetailedEval) && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 rounded-full">
                      {language === 'ar' ? 'تعديل' : 'Editing'}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  {selectedSession.start_time} - {selectedSession.end_time}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedPlayer(null)
                setEditingQuickEval(null)
                setEditingDetailedEval(null)
              }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab('quick')}
              className={`px-4 py-2 rounded-xl font-medium text-sm ${
                activeTab === 'quick' ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300'
              }`}
            >
              {language === 'ar' ? 'سريع' : 'Quick'}
            </button>
            <button
              onClick={() => setActiveTab('detailed')}
              className={`px-4 py-2 rounded-xl font-medium text-sm ${
                activeTab === 'detailed' ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300'
              }`}
            >
              {language === 'ar' ? 'تفصيلي' : 'Detailed'}
            </button>
          </div>

          {/* Quick Evaluation */}
          {activeTab === 'quick' && (
            <div>
              <div className="text-center mb-6">
                <p className="text-sm text-gray-500 mb-4">
                  {language === 'ar' ? 'كيف كان أداء اللاعب في هذه الجلسة؟' : 'How was the player\'s performance?'}
                </p>
                <div className="flex justify-center">
                  {renderStars(quickForm.overall_rating, (star) => setQuickForm(prev => ({ ...prev, overall_rating: star })))}
                </div>
                <p className="mt-2 text-lg font-bold text-secondary dark:text-white">
                  {quickForm.overall_rating > 0 && (
                    ['', 
                      language === 'ar' ? 'يحتاج تحسين' : 'Needs Improvement',
                      language === 'ar' ? 'مقبول' : 'Fair',
                      language === 'ar' ? 'جيد' : 'Good',
                      language === 'ar' ? 'جيد جداً' : 'Very Good',
                      language === 'ar' ? 'ممتاز' : 'Excellent'
                    ][quickForm.overall_rating]
                  )}
                </p>
              </div>
              
              {/* Goals */}
              <div className="flex items-center justify-center gap-4 mb-4 p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                  </svg>
                </div>
                <div className="text-center">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === 'ar' ? 'عدد الأهداف' : 'Number of Goals'}
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setQuickForm(prev => ({ ...prev, goals: Math.max(0, prev.goals - 1) }))}
                      className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 flex items-center justify-center text-xl font-bold"
                    >
                      -
                    </button>
                    <span className="text-3xl font-bold text-emerald-500 w-12 text-center">{quickForm.goals}</span>
                    <button
                      type="button"
                      onClick={() => setQuickForm(prev => ({ ...prev, goals: prev.goals + 1 }))}
                      className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center text-xl font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <textarea
                value={quickForm.notes}
                onChange={(e) => setQuickForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none mb-4"
                placeholder={language === 'ar' ? 'ملاحظات (اختياري)...' : 'Notes (optional)...'}
              />
              <Button
                onClick={handleQuickSubmit}
                disabled={submitting || quickForm.overall_rating === 0}
                className={`w-full ${editingQuickEval ? 'bg-blue-500 hover:bg-blue-600' : 'bg-emerald-500 hover:bg-emerald-600'} disabled:opacity-50`}
              >
                {submitting 
                  ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') 
                  : editingQuickEval
                    ? (language === 'ar' ? 'تحديث التقييم' : 'Update Evaluation')
                    : (language === 'ar' ? 'حفظ التقييم' : 'Save Evaluation')
                }
              </Button>
            </div>
          )}

          {/* Detailed Evaluation */}
          {activeTab === 'detailed' && (
            <div className="space-y-4">
              {skillCategories.map(category => (
                <div key={category.id} className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${category.color} flex items-center justify-center`}>
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d={category.icon} />
                      </svg>
                    </div>
                    <span className="font-medium text-sm text-secondary dark:text-white">{category.name[language]}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {category.skills.map(skill => (
                      <div key={skill.id} className="flex items-center justify-between">
                        <span className="text-xs text-gray-600 dark:text-gray-400">{skill.name[language]}</span>
                        {renderStars(detailedForm[skill.id], (star) => setDetailedForm(prev => ({ ...prev, [skill.id]: star })), 'small')}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <textarea
                value={detailedForm.notes}
                onChange={(e) => setDetailedForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                placeholder={language === 'ar' ? 'ملاحظات إضافية...' : 'Additional notes...'}
              />
              <Button
                onClick={handleDetailedSubmit}
                disabled={submitting}
                className={`w-full ${editingDetailedEval ? 'bg-blue-500 hover:bg-blue-600' : 'bg-emerald-500 hover:bg-emerald-600'} disabled:opacity-50`}
              >
                {submitting 
                  ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') 
                  : editingDetailedEval
                    ? (language === 'ar' ? 'تحديث التقييم التفصيلي' : 'Update Detailed Evaluation')
                    : (language === 'ar' ? 'حفظ التقييم التفصيلي' : 'Save Detailed Evaluation')
                }
              </Button>
            </div>
          )}
        </GlassCard>
      )}
    </div>
  )
}
