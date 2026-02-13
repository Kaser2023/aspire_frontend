import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { useAuth } from '../../hooks/useAuth'
import { programsService, playersService } from '../../services'
import GlassCard from '../../components/ui/GlassCard'
import WaitlistModal from '../../components/waitlist/WaitlistModal'

export default function Programs() {
  const { language } = useLanguage()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [programs, setPrograms] = useState([])
  const [players, setPlayers] = useState([])
  const [expandedProgramId, setExpandedProgramId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPrograms, setSelectedPrograms] = useState([])
  const [waitlistProgram, setWaitlistProgram] = useState(null)
  const [showWaitlistModal, setShowWaitlistModal] = useState(false)

  const fetchPrograms = useCallback(async () => {
    try {
      setLoading(true)
      const [programsRes, playersRes] = await Promise.all([
        programsService.getAll({ branch_id: user?.branch_id, limit: 100 }),
        playersService.getAll({ branch_id: user?.branch_id, limit: 500 })
      ])
      if (programsRes.success) {
        setPrograms(programsRes.data || [])
      }
      if (playersRes.success) {
        setPlayers(playersRes.data || [])
      }
    } catch (err) {
      console.error('Error fetching programs:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.branch_id])

  useEffect(() => {
    fetchPrograms()
  }, [fetchPrograms])

  const getProgramPlayers = (programId) => {
    return players.filter(p => p.program_id === programId)
  }

  const filteredPrograms = programs.filter(program => {
    const nameEn = program.name?.toLowerCase() || ''
    const nameAr = program.name_ar || ''
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
            {language === 'ar' ? 'البرامج' : 'Programs'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {language === 'ar' ? 'عرض البرامج المتاحة في هذا الفرع' : 'View programs available in this branch'}
          </p>
        </div>
        {programs.length > 0 && (
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
      {programs.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <p className="text-gray-500 mb-2">{language === 'ar' ? 'لا توجد برامج مضافة لهذا الفرع بعد' : 'No programs added to this branch yet'}</p>
          <p className="text-sm text-gray-400">{language === 'ar' ? 'يتم إضافة البرامج بواسطة المدير العام' : 'Programs are added by the Super Admin'}</p>
        </GlassCard>
      ) : (
        <GlassCard className="overflow-hidden">
          {/* Selection Header */}
          {selectedPrograms.length > 0 && (
            <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 border-b border-indigo-100 dark:border-indigo-500/20 flex items-center justify-between">
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                {language === 'ar' 
                  ? `تم تحديد ${selectedPrograms.length} برنامج`
                  : `${selectedPrograms.length} program(s) selected`}
              </span>
              <button 
                onClick={() => setSelectedPrograms([])}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {language === 'ar' ? 'إلغاء التحديد' : 'Clear selection'}
              </button>
            </div>
          )}

          {/* Table Header */}
          <div className="hidden md:grid md:grid-cols-12 gap-4 p-4 bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10 font-semibold text-sm text-gray-600 dark:text-gray-400">
            <div className="col-span-1 flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedPrograms.length === filteredPrograms.length && filteredPrograms.length > 0}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedPrograms(filteredPrograms.map(p => p.id))
                  } else {
                    setSelectedPrograms([])
                  }
                }}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>#</span>
            </div>
            <div className="col-span-3">{language === 'ar' ? 'البرنامج' : 'Program'}</div>
            <div className="col-span-2">{language === 'ar' ? 'المدرب' : 'Coach'}</div>
            <div className="col-span-2">{language === 'ar' ? 'الفئة العمرية' : 'Age Group'}</div>
            <div className="col-span-2">{language === 'ar' ? 'اللاعبين' : 'Players'}</div>
            <div className="col-span-2">{language === 'ar' ? 'الحالة' : 'Status'}</div>
          </div>

          {/* Programs Rows */}
          <div className="divide-y divide-gray-100 dark:divide-white/5">
            {filteredPrograms.map((program, index) => {
              const programPlayers = getProgramPlayers(program.id)
              const isExpanded = expandedProgramId === program.id
              // API returns 'coaches' array (many-to-many)
              const programCoaches = program.coaches || (program.coach ? [program.coach] : [])
              const getCoachName = (coach) => {
                if (!coach) return ''
                if (language === 'ar' && coach.name_ar) return coach.name_ar
                return `${coach.first_name || ''} ${coach.last_name || ''}`.trim()
              }

              return (
                <div key={program.id}>
                  <div 
                    className={`p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer ${
                      selectedPrograms.includes(program.id) ? 'bg-indigo-50 dark:bg-indigo-500/10' : ''
                    }`}
                    onClick={() => setExpandedProgramId(isExpanded ? null : program.id)}
                  >
                    {/* Desktop View */}
                    <div className="hidden md:grid md:grid-cols-12 gap-4 items-center">
                      <div className="col-span-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedPrograms.includes(program.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPrograms([...selectedPrograms, program.id])
                            } else {
                              setSelectedPrograms(selectedPrograms.filter(id => id !== program.id))
                            }
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm font-medium text-gray-500">{index + 1}</span>
                      </div>
                      <div className="col-span-3 flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold">
                          {(language === 'ar' ? program.name_ar : program.name)?.charAt(0) || 'P'}
                        </div>
                        <div>
                          <p className="font-semibold text-secondary dark:text-white">
                            {language === 'ar' ? (program.name_ar || program.name) : program.name}
                          </p>
                          <p className="text-xs text-gray-500">{program.type || 'training'}</p>
                        </div>
                      </div>
                      <div className="col-span-2">
                        {programCoaches.length > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                              {getCoachName(programCoaches[0]).charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm text-secondary dark:text-white">
                                {programCoaches.map(c => getCoachName(c)).join('، ')}
                              </p>
                              {programCoaches.length > 1 && (
                                <p className="text-xs text-gray-500">{programCoaches.length} {language === 'ar' ? 'مدربين' : 'coaches'}</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </div>
                      <div className="col-span-2">
                        <span className="text-sm text-secondary dark:text-white">
                          {program.age_group_min && program.age_group_max 
                            ? `${program.age_group_min}-${program.age_group_max} ${language === 'ar' ? 'سنة' : 'yrs'}`
                            : '-'}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 rounded-lg text-sm font-semibold">
                          {programPlayers.length} {language === 'ar' ? 'لاعب' : 'players'}
                        </span>
                      </div>
                      <div className="col-span-2 flex items-center justify-between">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-lg ${
                          program.is_active !== false
                            ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-300'
                            : 'bg-gray-100 dark:bg-gray-500/20 text-gray-600 dark:text-gray-300'
                        }`}>
                          {program.is_active !== false
                            ? (language === 'ar' ? 'نشط' : 'Active')
                            : (language === 'ar' ? 'غير نشط' : 'Inactive')}
                        </span>
                        <svg 
                          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    {/* Mobile View */}
                    <div className="md:hidden">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedPrograms.includes(program.id)}
                          onChange={(e) => {
                            e.stopPropagation()
                            if (e.target.checked) {
                              setSelectedPrograms([...selectedPrograms, program.id])
                            } else {
                              setSelectedPrograms(selectedPrograms.filter(id => id !== program.id))
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm font-medium text-gray-500 mt-0.5 w-6">{index + 1}</span>
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                          {(language === 'ar' ? program.name_ar : program.name)?.charAt(0) || 'P'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-bold text-secondary dark:text-white truncate">
                              {language === 'ar' ? (program.name_ar || program.name) : program.name}
                            </p>
                            <svg 
                              className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} 
                              fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 rounded text-xs">
                              {programPlayers.length} {language === 'ar' ? 'لاعب' : 'players'}
                            </span>
                            {programCoaches.length > 0 && (
                              <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 rounded text-xs">
                                {language === 'ar' ? 'المدربين:' : 'Coaches:'} {programCoaches.map(c => getCoachName(c)).join('، ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5">
                      {/* Players List */}
                      <div className="p-4 border-t border-gray-100 dark:border-white/10">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-secondary dark:text-white">
                            {language === 'ar' ? 'اللاعبين المسجلين' : 'Enrolled Players'}
                          </h4>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setWaitlistProgram(program)
                              setShowWaitlistModal(true)
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-500/30 transition-colors text-sm font-medium"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {language === 'ar' ? 'قائمة الانتظار' : 'Waitlist'}
                          </button>
                        </div>
                        {programPlayers.length === 0 ? (
                          <p className="text-sm text-gray-500 text-center py-4">
                            {language === 'ar' ? 'لا يوجد لاعبين مسجلين' : 'No players enrolled'}
                          </p>
                        ) : (
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {programPlayers.map(player => (
                              <div
                                key={player.id}
                                className="flex items-center gap-3 p-2 rounded-lg bg-white dark:bg-white/5"
                              >
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                                  {(player.first_name || 'P').charAt(0)}
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-sm text-secondary dark:text-white">
                                    {language === 'ar'
                                      ? `${player.first_name_ar || player.first_name || ''} ${player.last_name_ar || player.last_name || ''}`.trim()
                                      : `${player.first_name || ''} ${player.last_name || ''}`.trim()}
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
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Footer with count */}
          <div className="p-4 bg-gray-50 dark:bg-white/5 border-t border-gray-100 dark:border-white/10">
            <p className="text-sm text-gray-500">
              {language === 'ar' 
                ? `إجمالي: ${filteredPrograms.length} برنامج`
                : `Total: ${filteredPrograms.length} program(s)`}
              {searchQuery && ` (${language === 'ar' ? 'من' : 'of'} ${programs.length})`}
            </p>
          </div>
        </GlassCard>
      )}

      {/* Waitlist Modal */}
      <WaitlistModal
        program={waitlistProgram}
        isOpen={showWaitlistModal}
        onClose={() => {
          setShowWaitlistModal(false)
          setWaitlistProgram(null)
        }}
        onUpdate={fetchPrograms}
      />
    </div>
  )
}
