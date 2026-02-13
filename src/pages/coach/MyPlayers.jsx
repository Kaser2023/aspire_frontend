import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { useAuth } from '../../hooks/useAuth'
import { playersService, evaluationService, attendanceService } from '../../services'
import GlassCard from '../../components/ui/GlassCard'

export default function MyPlayers() {
  const { language } = useLanguage()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [players, setPlayers] = useState([])
  const [expandedPlayer, setExpandedPlayer] = useState(null)
  const [playerStats, setPlayerStats] = useState({}) // Store stats per player

  const fetchPlayers = useCallback(async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      // Fetch players directly assigned to this coach
      const playersRes = await playersService.getAll({ coach_id: user.id })
      if (playersRes.success && playersRes.data) {
        const formattedPlayers = playersRes.data.map(p => ({
          id: p.id,
          name: { 
            en: `${p.first_name || ''} ${p.last_name || ''}`.trim(), 
            ar: `${p.first_name_ar || p.first_name || ''} ${p.last_name_ar || p.last_name || ''}`.trim()
          },
          age: p.date_of_birth ? Math.floor((Date.now() - new Date(p.date_of_birth)) / 31557600000) : 0,
          position: { en: p.position || 'Player', ar: p.position || 'لاعب' },
          avatar: p.avatar,
          program_id: p.program_id,
          program: language === 'ar' 
            ? (p.program_name_ar || p.program_name || 'بدون برنامج')
            : (p.program_name || 'No Program'),
          status: p.status,
          phone: p.phone,
          email: p.email
        }))
        setPlayers(formattedPlayers)
        
        // Fetch stats for each player
        fetchPlayerStats(formattedPlayers)
      }
    } catch (err) {
      console.error('Error fetching players:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.id, language])

  // Fetch attendance and evaluation stats for all players
  const fetchPlayerStats = async (playersList) => {
    const stats = {}
    
    // Get date range for last 30 days
    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    // Fetch stats for all players in parallel (batch of 5 at a time to avoid overloading)
    const batchSize = 5
    for (let i = 0; i < playersList.length; i += batchSize) {
      const batch = playersList.slice(i, i + batchSize)
      await Promise.all(batch.map(async (player) => {
        try {
          // Fetch evaluation summary and attendance in parallel
          const [evalRes, attendanceRes] = await Promise.all([
            evaluationService.getPlayerSummary(player.id).catch(() => ({ success: false })),
            attendanceService.getByPlayer(player.id, {
              start_date: startDate,
              end_date: endDate
            }).catch(() => ({ success: false }))
          ])
          
          let attendanceRate = 0
          let totalGoals = 0
          let avgRating = 0
          let totalEvaluations = 0
          
          if (evalRes.success && evalRes.data) {
            avgRating = evalRes.data.averageRating || evalRes.data.average_rating || 0
            totalGoals = evalRes.data.totalGoals || evalRes.data.total_goals || 0
            totalEvaluations = evalRes.data.totalEvaluations || evalRes.data.total_evaluations || 0
          }
          
          if (attendanceRes.success && attendanceRes.data) {
            const records = Array.isArray(attendanceRes.data) ? attendanceRes.data : (attendanceRes.data.records || [])
            if (records.length > 0) {
              const present = records.filter(r => r.status === 'present' || r.status === 'late').length
              attendanceRate = Math.round((present / records.length) * 100)
            }
          }
          
          stats[player.id] = {
            attendance: attendanceRate,
            rating: avgRating > 0 ? Number(avgRating).toFixed(1) : '-',
            goals: totalGoals,
            evaluations: totalEvaluations
          }
        } catch (err) {
          console.error(`Error fetching stats for player ${player.id}:`, err)
          stats[player.id] = { attendance: 0, rating: '-', goals: 0, evaluations: 0 }
        }
      }))
    }
    
    setPlayerStats(stats)
  }

  useEffect(() => {
    fetchPlayers()
  }, [fetchPlayers])

  const filteredPlayers = players.filter(player =>
    player.name?.[language]?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Group players by program
  const playersByProgram = filteredPlayers.reduce((acc, player) => {
    const programKey = player.program_id || 'unassigned'
    const programName = player.program || (language === 'ar' ? 'بدون برنامج' : 'No Program')
    
    if (!acc[programKey]) {
      acc[programKey] = {
        name: programName,
        players: []
      }
    }
    acc[programKey].players.push(player)
    return acc
  }, {})

  const getAttendanceColor = (attendance) => {
    if (attendance >= 85) return 'text-emerald-500'
    if (attendance >= 70) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getAttendanceBg = (attendance) => {
    if (attendance >= 85) return 'bg-emerald-100 dark:bg-emerald-500/20'
    if (attendance >= 70) return 'bg-yellow-100 dark:bg-yellow-500/20'
    return 'bg-red-100 dark:bg-red-500/20'
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
            {language === 'ar' ? 'لاعبيني' : 'My Players'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {language === 'ar' ? `${players.length} لاعب في مجموعاتك` : `${players.length} players in your groups`}
          </p>
        </div>
      </div>

      {/* Search */}
      {players.length > 0 && (
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <svg className="absolute left-4 rtl:left-auto rtl:right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={language === 'ar' ? 'البحث عن لاعب...' : 'Search players...'}
              className="w-full pl-12 rtl:pl-4 rtl:pr-12 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-white"
            />
          </div>
        </div>
      )}

      {/* Empty State */}
      {players.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-gray-500 mb-2">{language === 'ar' ? 'لم يتم تعيين لاعبين لك بعد' : 'No players assigned to you yet'}</p>
          <p className="text-sm text-gray-400">{language === 'ar' ? 'سيظهر اللاعبون هنا عند تعيينهم من قبل مدير الفرع' : 'Players will appear here when assigned by the branch admin'}</p>
        </GlassCard>
      ) : (
        <div className="space-y-8">
          {/* Players Grouped by Program */}
          {Object.entries(playersByProgram).map(([programKey, programData]) => (
            <div key={programKey}>
              {/* Program Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-white/20 to-transparent"></div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <h2 className="text-xl font-bold text-secondary dark:text-white">
                    {programData.name}
                  </h2>
                  <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full text-sm font-semibold">
                    {programData.players.length} {language === 'ar' ? 'لاعب' : 'players'}
                  </span>
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-white/20 to-transparent"></div>
              </div>

              {/* Players Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {programData.players.map((player) => {
                  const stats = playerStats[player.id] || { attendance: 0, rating: '-', goals: 0, evaluations: 0 }
                  const isExpanded = expandedPlayer === player.id
                  return (
                    <GlassCard
                      key={player.id}
                      className={`p-5 cursor-pointer hover:shadow-lg transition-all ${isExpanded ? 'ring-2 ring-emerald-500' : ''}`}
                      onClick={() => setExpandedPlayer(isExpanded ? null : player.id)}
                    >
                      <div className="flex items-start gap-4">
                        {player.avatar ? (
                          <img 
                            src={player.avatar.startsWith('http') ? player.avatar : `${(import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '')}${player.avatar}`} 
                            alt={player.name?.[language]}
                            className="w-14 h-14 rounded-2xl object-cover"
                            onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling && (e.target.nextElementSibling.style.display = 'flex') }}
                          />
                        ) : (
                          <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg">
                            {player.name?.en?.split(' ').map(n => n?.[0] || '').join('').substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="font-bold text-secondary dark:text-white">{player.name?.[language]}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {player.age > 0 ? `${player.age} ${language === 'ar' ? 'سنة' : 'yrs'}` : (language === 'ar' ? 'العمر غير محدد' : 'Age not set')}
                          </p>
                          <div className="mt-1">
                            <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-semibold ${
                              player.status === 'active' 
                                ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400'
                            }`}>
                              {player.status === 'active' 
                                ? (language === 'ar' ? 'نشط' : 'Active')
                                : (language === 'ar' ? 'غير نشط' : 'Inactive')
                              }
                            </span>
                          </div>
                        </div>
                        <svg className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                      
                      {/* Stats Grid */}
                      <div className="grid grid-cols-4 gap-2 mt-4">
                        <div className={`px-2 py-2 rounded-lg text-center ${getAttendanceBg(stats.attendance)}`}>
                          <p className={`text-lg font-bold ${getAttendanceColor(stats.attendance)}`}>{stats.attendance}%</p>
                          <p className="text-xs text-gray-500">{language === 'ar' ? 'الحضور' : 'Attend'}</p>
                        </div>
                        <div className="px-2 py-2 rounded-lg bg-yellow-100 dark:bg-yellow-500/20 text-center">
                          <p className="text-lg font-bold text-yellow-500">{stats.rating}</p>
                          <p className="text-xs text-gray-500">{language === 'ar' ? 'التقييم' : 'Rating'}</p>
                        </div>
                        <div className="px-2 py-2 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-center">
                          <p className="text-lg font-bold text-blue-500">{stats.goals}</p>
                          <p className="text-xs text-gray-500">{language === 'ar' ? 'الأهداف' : 'Goals'}</p>
                        </div>
                        <div className="px-2 py-2 rounded-lg bg-purple-100 dark:bg-purple-500/20 text-center">
                          <p className="text-lg font-bold text-purple-500">{stats.evaluations}</p>
                          <p className="text-xs text-gray-500">{language === 'ar' ? 'تقييم' : 'Evals'}</p>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10">
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-gray-500 dark:text-gray-400">{language === 'ar' ? 'البرنامج' : 'Program'}</p>
                              <p className="font-medium text-secondary dark:text-white">{player.program}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 dark:text-gray-400">{language === 'ar' ? 'الحالة' : 'Status'}</p>
                              <p className="font-medium text-secondary dark:text-white">
                                {player.status === 'active' ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'غير نشط' : 'Inactive')}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500 dark:text-gray-400">{language === 'ar' ? 'نسبة الحضور (30 يوم)' : 'Attendance (30 days)'}</p>
                              <p className={`font-medium ${getAttendanceColor(stats.attendance)}`}>{stats.attendance}%</p>
                            </div>
                            <div>
                              <p className="text-gray-500 dark:text-gray-400">{language === 'ar' ? 'عدد التقييمات' : 'Total Evaluations'}</p>
                              <p className="font-medium text-secondary dark:text-white">{stats.evaluations}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </GlassCard>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
