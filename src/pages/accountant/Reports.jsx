import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { statsService, paymentsService, programsService } from '../../services'
import GlassCard from '../../components/ui/GlassCard'
import Button from '../../components/ui/Button'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

export default function Reports() {
  const { language } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [reportType, setReportType] = useState('monthly')
  const [reportData, setReportData] = useState(null)
  const [payments, setPayments] = useState([])
  const [programNameById, setProgramNameById] = useState({})
  const [programs, setPrograms] = useState([])

  const reportTypes = [
    { id: 'monthly', label: { en: 'Monthly Branch Report', ar: 'التقرير الشهري للفرع' }, icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', description: { en: 'Comprehensive monthly financial report', ar: 'تقرير مالي شامل شهري' } },
    { id: 'revenue', label: { en: 'Revenue Report', ar: 'تقرير الإيرادات' }, icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', description: { en: 'Revenue breakdown by branch/program', ar: 'تفصيل الإيرادات حسب الفرع/البرنامج' } },
    { id: 'payments', label: { en: 'Payments Report', ar: 'تقرير المدفوعات' }, icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', description: { en: 'All payments history', ar: 'سجل جميع المدفوعات' } },
    { id: 'subscription', label: { en: 'Subscription Report', ar: 'تقرير الاشتراكات' }, icon: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z', description: { en: 'Subscription status and trends', ar: 'حالة الاشتراكات والاتجاهات' } },
  ]

  const fetchReportData = useCallback(async () => {
    try {
      setLoading(true)
      const [financialRes, paymentsRes, programsRes] = await Promise.all([
        statsService.getFinancialStats(),
        paymentsService.getAll({ limit: 200 }),
        programsService.getAll({ limit: 200 })
      ])
      if (financialRes.success) {
        setReportData(financialRes.data)
      }
      if (paymentsRes.success) {
        setPayments(paymentsRes.data || [])
      }
      if (programsRes.success) {
        const map = {}
        const list = []
        ;(programsRes.data || []).forEach((program) => {
          map[program.id] = program.name_ar ? { ar: program.name_ar, en: program.name } : { ar: program.name, en: program.name }
          list.push({ id: program.id, name: map[program.id] })
        })
        setProgramNameById(map)
        setPrograms(list)
      }
    } catch (err) {
      console.error('Error fetching report data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReportData()
  }, [fetchReportData])

  const getReportTitle = () => {
    const type = reportTypes.find(t => t.id === reportType)
    return type?.label[language] || 'Report'
  }

  const getReportTableData = () => {
    if (!reportData) return { headers: [], rows: [] }

    if (reportType === 'monthly') {
      const headers = language === 'ar'
        ? ['الفرع', 'الإيرادات', 'عدد المعاملات']
        : ['Branch', 'Revenue', 'Transactions']
      const rows = (reportData.revenue_by_branch || []).map(r => ([
        r.branch_name || '-',
        `${(parseFloat(r.total) || 0).toLocaleString()} SAR`,
        r.count || 0
      ]))
      return { headers, rows }
    }

    if (reportType === 'revenue') {
      const headers = language === 'ar'
        ? ['البرنامج', 'الإيرادات', 'عدد المعاملات']
        : ['Program', 'Revenue', 'Transactions']
      const revenueByProgram = reportData.revenue_by_program || []
      const rows = programs.map(program => {
        const match = revenueByProgram.find(r => r.program_id === program.id)
        return [
          program.name[language],
          `${(parseFloat(match?.total) || 0).toLocaleString()} SAR`,
          match?.count || 0
        ]
      })
      const noProgramRow = revenueByProgram.find(r => !r.program_id)
      if (noProgramRow) {
        rows.push([
          language === 'ar' ? 'بدون برنامج' : 'No program',
          `${(parseFloat(noProgramRow.total) || 0).toLocaleString()} SAR`,
          noProgramRow.count || 0
        ])
      }
      return { headers, rows }
    }

    if (reportType === 'payments') {
      const headers = language === 'ar'
        ? ['رقم الفاتورة', 'اللاعب', 'الفرع', 'المبلغ', 'الحالة', 'التاريخ']
        : ['Invoice #', 'Player', 'Branch', 'Amount', 'Status', 'Date']
      const rows = payments.map(p => ([
        p.invoice_number || p.id,
        p.player ? `${p.player.first_name || ''} ${p.player.last_name || ''}`.trim() : '-',
        p.branch?.name || '-',
        `${(parseFloat(p.total_amount || p.amount) || 0).toLocaleString()} SAR`,
        p.status || '-',
        (p.created_at || p.createdAt || p.paid_at || p.paidAt) ? new Date(p.created_at || p.createdAt || p.paid_at || p.paidAt).toLocaleDateString() : '-'
      ]))
      return { headers, rows }
    }

    const headers = language === 'ar'
      ? ['البند', 'القيمة']
      : ['Item', 'Value']
    const rows = [
      [language === 'ar' ? 'إجمالي الإيرادات' : 'Total Income', `${(reportData.total_income || 0).toLocaleString()} SAR`],
      [language === 'ar' ? 'إجمالي المرتجعات' : 'Total Refunds', `${(reportData.total_refunds || 0).toLocaleString()} SAR`],
      [language === 'ar' ? 'صافي الإيرادات' : 'Net Revenue', `${(reportData.net_revenue || 0).toLocaleString()} SAR`],
      [language === 'ar' ? 'عدد المعاملات' : 'Payment Count', reportData.payment_count || 0]
    ]
    return { headers, rows }
  }

  const exportToPDF = () => {
    setExporting(true)
    try {
      const { headers, rows } = getReportTableData()
      const title = getReportTitle()
      const date = new Date().toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')
      const isRTL = language === 'ar'

      const htmlContent = `
        <!DOCTYPE html>
        <html dir="${isRTL ? 'rtl' : 'ltr'}">
        <head>
          <meta charset="UTF-8">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap');
            * { font-family: 'IBM Plex Sans Arabic', Arial, sans-serif; }
            body { padding: 40px; direction: ${isRTL ? 'rtl' : 'ltr'}; }
            h1 { color: #0d9488; margin-bottom: 10px; font-size: 24px; }
            .date { color: #666; margin-bottom: 30px; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: ${isRTL ? 'right' : 'left'}; }
            th { background-color: #0d9488; color: white; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <p class="date">${isRTL ? 'التاريخ:' : 'Date:'} ${date}</p>
          <table>
            <thead>
              <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
            </tbody>
          </table>
        </body>
        </html>
      `

      const printWindow = window.open('', '_blank')
      printWindow.document.write(htmlContent)
      printWindow.document.close()
      setTimeout(() => {
        printWindow.print()
      }, 500)
    } catch (err) {
      console.error('Error exporting PDF:', err)
    } finally {
      setExporting(false)
    }
  }

  const exportToExcel = () => {
    setExporting(true)
    try {
      const { headers, rows } = getReportTableData()
      const title = getReportTitle()
      const wsData = [headers, ...rows]
      const ws = XLSX.utils.aoa_to_sheet(wsData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, title)
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      saveAs(data, `${reportType}-report-${Date.now()}.xlsx`)
    } catch (err) {
      console.error('Error exporting Excel:', err)
    } finally {
      setExporting(false)
    }
  }

  const handlePrint = () => {
    const { headers, rows } = getReportTableData()
    const title = getReportTitle()
    const date = new Date().toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')

    const printContent = `
      <!DOCTYPE html>
      <html dir="${language === 'ar' ? 'rtl' : 'ltr'}">
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #0d9488; margin-bottom: 10px; }
          .date { color: #666; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: ${language === 'ar' ? 'right' : 'left'}; }
          th { background-color: #0d9488; color: white; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p class="date">${language === 'ar' ? 'التاريخ:' : 'Date:'} ${date}</p>
        <table>
          <thead>
            <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    printWindow.document.write(printContent)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <svg className="w-12 h-12 text-teal-500 animate-spin mx-auto mb-4" fill="none" viewBox="0 0 24 24">
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
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-secondary dark:text-white">
          {language === 'ar' ? 'التقارير المالية' : 'Financial Reports'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {language === 'ar' ? 'إنشاء وتصدير التقارير المالية' : 'Generate and export financial reports'}
        </p>
      </div>

      {/* Report Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {reportTypes.map((report) => (
          <GlassCard
            key={report.id}
            onClick={() => setReportType(report.id)}
            className={`p-4 cursor-pointer hover:shadow-lg transition-shadow border-2 ${
              reportType === report.id ? 'border-teal-500 shadow-lg shadow-teal-500/20' : 'border-transparent hover:border-teal-500'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={report.icon} />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-secondary dark:text-white">{report.label[language]}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{report.description[language]}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Export Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={exportToPDF}
          disabled={exporting || !reportData}
          className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
        >
          <svg className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          {language === 'ar' ? 'تصدير PDF' : 'Export PDF'}
        </Button>
        <Button
          onClick={exportToExcel}
          disabled={exporting || !reportData}
          className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
        >
          <svg className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {language === 'ar' ? 'تصدير Excel' : 'Export Excel'}
        </Button>
        <Button
          onClick={handlePrint}
          disabled={exporting || !reportData}
          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
        >
          <svg className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          {language === 'ar' ? 'طباعة' : 'Print'}
        </Button>
      </div>

      {/* Report Preview */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-secondary dark:text-white">{getReportTitle()}</h2>
          <span className="text-sm text-gray-500">
            {new Date().toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
          </span>
        </div>

        {reportData ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10">
                  {getReportTableData().headers.map((header, idx) => (
                    <th key={idx} className="py-3 px-4 text-left rtl:text-right font-semibold text-gray-700 dark:text-gray-300 bg-teal-50 dark:bg-teal-500/10">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {getReportTableData().rows.map((row, rowIdx) => (
                  <tr key={rowIdx} className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5">
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx} className="py-3 px-4 text-gray-600 dark:text-gray-300">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-500">{language === 'ar' ? 'لا توجد بيانات' : 'No data available'}</p>
          </div>
        )}
      </GlassCard>
    </div>
  )
}
