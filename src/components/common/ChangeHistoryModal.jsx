import { useEffect, useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { auditLogsService } from '../../services';

export default function ChangeHistoryModal({ open, onClose, entityType, entityId, title }) {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !entityType || !entityId) return;

    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await auditLogsService.getEntityHistory(entityType, entityId, { limit: 50 });
        if (response.success) {
          setLogs(response.data || []);
        }
      } catch (err) {
        console.error('Error loading audit history:', err);
        setError(language === 'ar' ? 'تعذر تحميل السجل' : 'Failed to load history');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [open, entityType, entityId, language]);

  if (!open) return null;

  const actionLabel = (action) => {
    const labels = {
      create: { en: 'Created', ar: 'إنشاء' },
      update: { en: 'Updated', ar: 'تحديث' },
      delete: { en: 'Deleted', ar: 'حذف' },
      toggle: { en: 'Toggled', ar: 'تبديل' },
      bulk_update: { en: 'Bulk update', ar: 'تحديث جماعي' }
    };
    return labels[action]?.[language] || action;
  };

  const formatDate = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US');
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-secondary rounded-2xl border border-gray-200 dark:border-white/10 shadow-xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-white/10">
          <div>
            <h3 className="text-lg font-bold text-secondary dark:text-white">
              {language === 'ar' ? 'سجل التغييرات' : 'Change History'}
            </h3>
            {title && <p className="text-xs text-gray-500 mt-1">{title}</p>}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 overflow-y-auto max-h-[60vh] space-y-3">
          {loading && (
            <p className="text-sm text-gray-500">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
          )}
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
          {!loading && !error && logs.length === 0 && (
            <p className="text-sm text-gray-500">{language === 'ar' ? 'لا توجد تغييرات' : 'No changes yet'}</p>
          )}
          {!loading && !error && logs.map((log) => (
            <div key={log.id} className="p-3 rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50/70 dark:bg-white/5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-secondary dark:text-white">{actionLabel(log.action)}</span>
                <span className="text-xs text-gray-500">{formatDate(log.created_at || log.createdAt)}</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                {(log.actor?.first_name || '')} {(log.actor?.last_name || '')} {log.actor?.role ? `(${log.actor.role})` : ''}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
