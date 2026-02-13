import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { useAuth } from '../../hooks/useAuth'
import { usersService, playersService } from '../../services'
import GlassCard from '../../components/ui/GlassCard'

export default function Coaches() {
  const { language } = useLanguage()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [coaches, setCoaches] = useState([])
  const [players, setPlayers] = useState([])
  const [expandedCoach, setExpandedCoach] = useState(null)

  const fetchCoaches = useCallback(async () => {
    try {
      setLoading(true)
      const [coachesRes, playersRes] = await Promise.all([
        usersService.getByRole('coach', { branch_id: user?.branch_id, limit: 100 }),
        playersService.getAll({ branch_id: user?.branch_id, limit: 500 })
      ])
      if (coachesRes.success) {
        setCoaches(coachesRes.data || [])
      }
      if (playersRes.success) {
        setPlayers(playersRes.data || [])
      }
    } catch (err) {
      console.error('Error fetching coaches:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.branch_id])

  useEffect(() => {
    fetchCoaches()
  }, [fetchCoaches])

  const getCoachPlayers = (coachId) => {
    return players.filter(p => p.coach_id === coachId || p.coach?.id === coachId)
  }

  const getCoachPrograms = (coach) => {
    return coach.programs || []
  }

  const filteredCoaches = coaches.filter(coach => {
    const nameEn = `${coach.first_name || ''} ${coach.last_name || ''}`.toLowerCase()
    const nameAr = coach.name_ar || ''
    return nameEn.includes(searchQuery.toLowerCase()) || nameAr.includes(searchQuery)
  })

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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-secondary dark:text-white">
            {language === 'ar' ? 'المدربون' : 'Coaches'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {language === 'ar' ? 'عرض المدربين المعينين لهذا الفرع' : 'View coaches assigned to this branch'}
          </p>
        </div>
        {coaches.length > 0 && (
          <div className="relative">
            <svg className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder={language === 'ar' ? 'بحث...' : 'Search...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rtl:pl-4 rtl:pr-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-64"
            />
          </div>
        )}
      </div>

      {/* Empty State */}
      {coaches.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-gray-500 mb-2">{language === 'ar' ? 'لا يوجد مدربون معينون لهذا الفرع بعد' : 'No coaches assigned to this branch yet'}</p>
          <p className="text-sm text-gray-400">{language === 'ar' ? 'يتم تعيين المدربين بواسطة المدير العام' : 'Coaches are assigned by the Super Admin'}</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCoaches.map(coach => {
            const coachPlayers = getCoachPlayers(coach.id)
            const coachPrograms = getCoachPrograms(coach)
            const isExpanded = expandedCoach === coach.id

            return (
              <GlassCard key={coach.id} className="overflow-hidden">
                {/* Coach Header */}
                <div 
                  className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  onClick={() => setExpandedCoach(isExpanded ? null : coach.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                      {(language === 'ar' ? coach.name_ar : coach.first_name)?.charAt(0) || 'C'}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-lg text-secondary dark:text-white">
                        {language === 'ar' 
                          ? (coach.name_ar || `${coach.first_name || ''} ${coach.last_name || ''}`.trim())
                          : `${coach.first_name || ''} ${coach.last_name || ''}`.trim()}
                      </p>
                      <p className="text-sm text-gray-500">{coach.phone || coach.email || ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-lg text-sm font-semibold bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                        {coachPlayers.length} {language === 'ar' ? 'لاعب' : 'players'}
                      </span>
                      <svg 
                        className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Programs Badges */}
                  {coachPrograms.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {coachPrograms.map(program => (
                        <span 
                          key={program.id} 
                          className="px-2 py-1 rounded-lg text-xs font-medium bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400"
                        >
                          {language === 'ar' ? (program.name_ar || program.name) : program.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-gray-100 dark:border-white/10">
                    {/* Stats Row */}
                    <div className="grid grid-cols-3 divide-x rtl:divide-x-reverse divide-gray-100 dark:divide-white/10 bg-gray-50 dark:bg-white/5">
                      <div className="p-3 text-center">
                        <p className="text-lg font-bold text-indigo-600">{coachPrograms.length}</p>
                        <p className="text-xs text-gray-500">{language === 'ar' ? 'البرامج' : 'Programs'}</p>
                      </div>
                      <div className="p-3 text-center">
                        <p className="text-lg font-bold text-emerald-600">{coachPlayers.length}</p>
                        <p className="text-xs text-gray-500">{language === 'ar' ? 'اللاعبين' : 'Players'}</p>
                      </div>
                      <div className="p-3 text-center">
                        <p className="text-lg font-bold text-purple-600">{coach.is_active !== false ? '✓' : '✗'}</p>
                        <p className="text-xs text-gray-500">{language === 'ar' ? 'الحالة' : 'Status'}</p>
                      </div>
                    </div>

                    {/* Players List */}
                    <div className="p-4">
                      <h4 className="font-semibold text-secondary dark:text-white mb-3">
                        {language === 'ar' ? 'اللاعبين المسجلين' : 'Enrolled Players'}
                      </h4>
                      {coachPlayers.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">
                          {language === 'ar' ? 'لا يوجد لاعبين مسجلين' : 'No players enrolled'}
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {coachPlayers.map(player => (
                            <div 
                              key={player.id} 
                              className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-white/5"
                            >
                              <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                                {(player.first_name || 'P').charAt(0)}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-sm text-secondary dark:text-white">
                                  {language === 'ar' 
                                    ? `${player.first_name_ar || player.first_name || ''} ${player.last_name_ar || player.last_name || ''}`.trim()
                                    : `${player.first_name || ''} ${player.last_name || ''}`.trim()}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {player.program ? (language === 'ar' ? player.program.name_ar || player.program.name : player.program.name) : '-'}
                                </p>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                player.status === 'active' 
                                  ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-gray-100 dark:bg-gray-500/20 text-gray-600 dark:text-gray-400'
                              }`}>
                                {player.status === 'active' 
                                  ? (language === 'ar' ? 'نشط' : 'Active')
                                  : (language === 'ar' ? 'غير نشط' : 'Inactive')}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Contact Info */}
                    <div className="p-4 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5">
                      <h4 className="font-semibold text-secondary dark:text-white mb-2 text-sm">
                        {language === 'ar' ? 'معلومات الاتصال' : 'Contact Info'}
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">{language === 'ar' ? 'الهاتف:' : 'Phone:'}</span>
                          <span className="font-medium text-secondary dark:text-white mr-1 rtl:ml-1 rtl:mr-0"> {coach.phone || '-'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">{language === 'ar' ? 'البريد:' : 'Email:'}</span>
                          <span className="font-medium text-secondary dark:text-white mr-1 rtl:ml-1 rtl:mr-0"> {coach.email || '-'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </GlassCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
