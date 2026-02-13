import { useState, useEffect } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { scheduleService } from '../../services'
import {
  onWaitlistAdded,
  onWaitlistRemoved,
  onWaitlistStatusUpdated,
  offWaitlistEvents
} from '../../services/socket.service'
import GlassCard from '../ui/GlassCard'
import Button from '../ui/Button'

export default function WaitlistModal({ program, isOpen, onClose, onUpdate }) {
  const { language } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [waitlist, setWaitlist] = useState([])
  const [selectedStatus, setSelectedStatus] = useState('waiting')

  useEffect(() => {
    if (isOpen && program?.id) {
      fetchWaitlist()
    }
  }, [isOpen, program?.id, selectedStatus])

  // Socket.IO real-time updates
  useEffect(() => {
    if (!isOpen || !program?.id) return

    const handleWaitlistUpdate = (payload) => {
      console.log('📡 Real-time waitlist update received:', payload)
      // Refresh waitlist if it's for the current program
      if (payload.data?.program_id === program.id) {
        fetchWaitlist()
      }
    }

    // Subscribe to all waitlist events
    onWaitlistAdded(handleWaitlistUpdate)
    onWaitlistRemoved(handleWaitlistUpdate)
    onWaitlistStatusUpdated(handleWaitlistUpdate)

    // Cleanup listeners on unmount or when modal closes
    return () => {
      offWaitlistEvents()
    }
  }, [isOpen, program?.id])

  const fetchWaitlist = async () => {
    try {
      setLoading(true)
      const response = await scheduleService.getProgramWaitlist(program.id, { status: selectedStatus })
      if (response.success) {
        setWaitlist(response.data || [])
      }
    } catch (err) {
      console.error('Error fetching waitlist:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (waitlistId) => {
    if (!window.confirm(language === 'ar' ? 'هل تريد إزالة هذا اللاعب من قائمة الانتظار?' : 'Remove this player from the waitlist?')) {
      return
    }

    try {
      const response = await scheduleService.removeFromWaitlist(waitlistId)
      if (response.success) {
        fetchWaitlist()
        if (onUpdate) onUpdate()
      }
    } catch (err) {
      console.error('Error removing from waitlist:', err)
      alert(err.message || (language === 'ar' ? 'حدث خطأ' : 'An error occurred'))
    }
  }

  const handleUpdateStatus = async (waitlistId, newStatus) => {
    try {
      const response = await scheduleService.updateWaitlistStatus(waitlistId, { status: newStatus })
      if (response.success) {
        fetchWaitlist()
        if (onUpdate) onUpdate()
      }
    } catch (err) {
      console.error('Error updating waitlist status:', err)
      alert(err.message || (language === 'ar' ? 'حدث خطأ' : 'An error occurred'))
    }
  }

  const formatDate = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status) => {
    const statusColors = {
      waiting: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
      notified: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400',
      enrolled: 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400',
      expired: 'bg-gray-100 dark:bg-gray-500/20 text-gray-600 dark:text-gray-400',
      cancelled: 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
    }

    const statusLabels = {
      waiting: language === 'ar' ? 'في الانتظار' : 'Waiting',
      notified: language === 'ar' ? 'تم الإشعار' : 'Notified',
      enrolled: language === 'ar' ? 'تم التسجيل' : 'Enrolled',
      expired: language === 'ar' ? 'منتهي' : 'Expired',
      cancelled: language === 'ar' ? 'ملغي' : 'Cancelled'
    }

    return (
      <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${statusColors[status] || statusColors.waiting}`}>
        {statusLabels[status] || status}
      </span>
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-white/10 p-6 z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-secondary dark:text-white">
                {language === 'ar' ? 'قائمة الانتظار' : 'Waitlist'}
              </h2>
              <p className="text-sm text-gray-500">
                {language === 'ar' ? program?.name_ar : program?.name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex gap-2 overflow-x-auto">
            {['waiting', 'notified', 'enrolled', 'expired', 'cancelled'].map(status => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedStatus === status
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/20'
                }`}
              >
                {status === 'waiting' && (language === 'ar' ? 'في الانتظار' : 'Waiting')}
                {status === 'notified' && (language === 'ar' ? 'تم الإشعار' : 'Notified')}
                {status === 'enrolled' && (language === 'ar' ? 'تم التسجيل' : 'Enrolled')}
                {status === 'expired' && (language === 'ar' ? 'منتهي' : 'Expired')}
                {status === 'cancelled' && (language === 'ar' ? 'ملغي' : 'Cancelled')}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="w-8 h-8 text-indigo-500 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : waitlist.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-gray-500">
                {language === 'ar' ? 'لا توجد مدخلات في قائمة الانتظار' : 'No waitlist entries'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {waitlist.map((entry, index) => (
                <GlassCard key={entry.id} className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Position Badge */}
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
                      #{entry.position}
                    </div>

                    {/* Player Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-secondary dark:text-white">
                            {language === 'ar' ? entry.player?.name_ar : entry.player?.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {language === 'ar' ? 'ولي الأمر:' : 'Parent:'} {language === 'ar' ? entry.parent?.name_ar : `${entry.parent?.first_name} ${entry.parent?.last_name}`}
                          </p>
                          {entry.parent?.phone && (
                            <p className="text-sm text-gray-500">{entry.parent.phone}</p>
                          )}
                        </div>
                        {getStatusBadge(entry.status)}
                      </div>

                      {/* Dates */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-500 mb-3">
                        <div>
                          <span className="font-medium">{language === 'ar' ? 'تاريخ الإضافة:' : 'Added:'}</span> {formatDate(entry.created_at)}
                        </div>
                        {entry.notified_at && (
                          <div>
                            <span className="font-medium">{language === 'ar' ? 'تم الإشعار:' : 'Notified:'}</span> {formatDate(entry.notified_at)}
                          </div>
                        )}
                        {entry.expires_at && (
                          <div className={new Date(entry.expires_at) < new Date() ? 'text-red-500' : ''}>
                            <span className="font-medium">{language === 'ar' ? 'ينتهي في:' : 'Expires:'}</span> {formatDate(entry.expires_at)}
                          </div>
                        )}
                        {entry.enrolled_at && (
                          <div>
                            <span className="font-medium">{language === 'ar' ? 'تم التسجيل:' : 'Enrolled:'}</span> {formatDate(entry.enrolled_at)}
                          </div>
                        )}
                      </div>

                      {/* Notes */}
                      {entry.notes && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 p-2 bg-gray-50 dark:bg-white/5 rounded-lg">
                          {entry.notes}
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 flex-wrap">
                        {entry.status === 'waiting' && (
                          <Button
                            onClick={() => handleUpdateStatus(entry.id, 'notified')}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs py-1 px-3"
                          >
                            {language === 'ar' ? 'إشعار' : 'Notify'}
                          </Button>
                        )}
                        {entry.status === 'notified' && (
                          <>
                            <Button
                              onClick={() => handleUpdateStatus(entry.id, 'enrolled')}
                              className="bg-green-600 hover:bg-green-700 text-white text-xs py-1 px-3"
                            >
                              {language === 'ar' ? 'تسجيل' : 'Enroll'}
                            </Button>
                            <Button
                              onClick={() => handleUpdateStatus(entry.id, 'expired')}
                              className="bg-gray-600 hover:bg-gray-700 text-white text-xs py-1 px-3"
                            >
                              {language === 'ar' ? 'انتهت الصلاحية' : 'Mark Expired'}
                            </Button>
                          </>
                        )}
                        {(entry.status === 'waiting' || entry.status === 'notified') && (
                          <Button
                            onClick={() => handleRemove(entry.id)}
                            className="bg-red-600 hover:bg-red-700 text-white text-xs py-1 px-3"
                          >
                            {language === 'ar' ? 'إزالة' : 'Remove'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-white/10 p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {language === 'ar' ? `الإجمالي: ${waitlist.length}` : `Total: ${waitlist.length}`}
            </p>
            <Button onClick={onClose} className="bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-white/20">
              {language === 'ar' ? 'إغلاق' : 'Close'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
