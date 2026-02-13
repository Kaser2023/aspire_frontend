import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { statsService, paymentsService } from '../../services'
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
  const [reportType, setReportType] = useState('comprehensive')
  const [reportData, setReportData] = useState(null)
  
  const reportTypes = [
    { id: 'comprehensive', label: { en: 'Comprehensive Report', ar: 'تقرير شامل' }, icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { id: 'financial', label: { en: 'Financial Report', ar: 'تقرير مالي' }, icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'players', label: { en: 'Players Report', ar: 'تقرير اللاعبين' }, icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { id: 'coaches', label: { en: 'Coaches Report', ar: 'تقرير المدربين' }, icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
  ]

  const fetchReportData = useCallback(async () => {
    try {
      setLoading(true)
      const [statsRes, paymentsRes] = await Promise.all([
        statsService.getSuperAdminStats(),
        paymentsService.getStats()
      ])

      if (statsRes.success) {
        const totalBranches = statsRes.data?.total_branches || 0
        const totalPlayers = statsRes.data?.total_players || 0
        const totalCoaches = statsRes.data?.total_coaches || 0
        const totalPrograms = statsRes.data?.total_programs || 0
        const monthlyRevenue = statsRes.data?.revenue_this_month || 0
        const newThisMonth = statsRes.data?.new_registrations_this_week || 0

        const totalRevenue = paymentsRes.success ? (paymentsRes.data?.totalRevenue || 0) : 0
        const pendingPaymentsAmount = paymentsRes.success ? (paymentsRes.data?.pendingAmount || 0) : 0

        const avgPlayers = totalCoaches > 0 ? Math.round(totalPlayers / totalCoaches) : 0

        setReportData({
          branches: { total: totalBranches },
          players: {
            total: totalPlayers,
            active: totalPlayers,
            inactive: 0,
            newThisMonth
          },
          coaches: {
            total: totalCoaches,
            active: totalCoaches,
            avgPlayers
          },
          programs: { total: totalPrograms },
          revenue: {
            total: totalRevenue,
            monthly: monthlyRevenue
          },
          payments: {
            pending: pendingPaymentsAmount,
            completed: totalRevenue
          }
        })
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

  // Get report title
  const getReportTitle = () => {
    const type = reportTypes.find(t => t.id === reportType)
    return type?.label[language] || 'Report'
  }

  // Prepare report data for export
  const getReportTableData = () => {
    if (!reportData) return { headers: [], rows: [] }

    const headers = language === 'ar' 
      ? ['البند', 'القيمة']
      : ['Item', 'Value']

    let rows = []

    if (reportType === 'comprehensive') {
      rows = [
        [language === 'ar' ? 'إجمالي الفروع' : 'Total Branches', reportData.branches?.total || 0],
        [language === 'ar' ? 'إجمالي اللاعبين' : 'Total Players', reportData.players?.total || 0],
        [language === 'ar' ? 'اللاعبين النشطين' : 'Active Players', reportData.players?.active || 0],
        [language === 'ar' ? 'إجمالي المدربين' : 'Total Coaches', reportData.coaches?.total || 0],
        [language === 'ar' ? 'إجمالي البرامج' : 'Total Programs', reportData.programs?.total || 0],
        [language === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue', `${reportData.revenue?.total || 0} SAR`],
        [language === 'ar' ? 'إيرادات الشهر' : 'Monthly Revenue', `${reportData.revenue?.monthly || 0} SAR`],
      ]
    } else if (reportType === 'financial') {
      rows = [
        [language === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue', `${reportData.revenue?.total || 0} SAR`],
        [language === 'ar' ? 'إيرادات الشهر' : 'Monthly Revenue', `${reportData.revenue?.monthly || 0} SAR`],
        [language === 'ar' ? 'المدفوعات المعلقة' : 'Pending Payments', `${reportData.payments?.pending || 0} SAR`],
        [language === 'ar' ? 'المدفوعات المكتملة' : 'Completed Payments', `${reportData.payments?.completed || 0} SAR`],
      ]
    } else if (reportType === 'players') {
      rows = [
        [language === 'ar' ? 'إجمالي اللاعبين' : 'Total Players', reportData.players?.total || 0],
        [language === 'ar' ? 'اللاعبين النشطين' : 'Active Players', reportData.players?.active || 0],
        [language === 'ar' ? 'اللاعبين غير النشطين' : 'Inactive Players', reportData.players?.inactive || 0],
        [language === 'ar' ? 'التسجيلات الجديدة (هذا الشهر)' : 'New Registrations (This Month)', reportData.players?.newThisMonth || 0],
      ]
    } else if (reportType === 'coaches') {
      rows = [
        [language === 'ar' ? 'إجمالي المدربين' : 'Total Coaches', reportData.coaches?.total || 0],
        [language === 'ar' ? 'المدربين النشطين' : 'Active Coaches', reportData.coaches?.active || 0],
        [language === 'ar' ? 'متوسط اللاعبين لكل مدرب' : 'Avg Players per Coach', reportData.coaches?.avgPlayers || 0],
      ]
    }

    return { headers, rows }
  }

  // Export to PDF - uses HTML to PDF for Arabic support
  const exportToPDF = () => {
    setExporting(true)
    try {
      const { headers, rows } = getReportTableData()
      const title = getReportTitle()
      const date = new Date().toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')
      const isRTL = language === 'ar'

      // Create HTML content for PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html dir="${isRTL ? 'rtl' : 'ltr'}">
        <head>
          <meta charset="UTF-8">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap');
            * { font-family: 'IBM Plex Sans Arabic', Arial, sans-serif; }
            body { padding: 40px; direction: ${isRTL ? 'rtl' : 'ltr'}; }
            h1 { color: #7c3aed; margin-bottom: 10px; font-size: 24px; }
            .date { color: #666; margin-bottom: 30px; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: ${isRTL ? 'right' : 'left'}; }
            th { background-color: #7c3aed; color: white; font-weight: bold; }
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

      // Open in new window and trigger print as PDF
      const printWindow = window.open('', '_blank')
      printWindow.document.write(htmlContent)
      printWindow.document.close()
      
      // Wait for fonts to load then print
      setTimeout(() => {
        printWindow.print()
      }, 500)
    } catch (err) {
      console.error('Error exporting PDF:', err)
    } finally {
      setExporting(false)
    }
  }

  // Export to Excel
  const exportToExcel = () => {
    setExporting(true)
    try {
      const { headers, rows } = getReportTableData()
      const title = getReportTitle()

      // Create worksheet data
      const wsData = [headers, ...rows]
      const ws = XLSX.utils.aoa_to_sheet(wsData)
      
      // Create workbook
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, title)

      // Generate buffer
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      
      saveAs(data, `${reportType}-report-${Date.now()}.xlsx`)
    } catch (err) {
      console.error('Error exporting Excel:', err)
    } finally {
      setExporting(false)
    }
  }

  // Print report
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
          h1 { color: #7c3aed; margin-bottom: 10px; }
          .date { color: #666; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: ${language === 'ar' ? 'right' : 'left'}; }
          th { background-color: #7c3aed; color: white; }
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
          <svg className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" fill="none" viewBox="0 0 24 24">
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
          {language === 'ar' ? 'التقارير' : 'Reports'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {language === 'ar' ? 'إنشاء وتصدير تقارير مفصلة' : 'Generate and export detailed reports'}
        </p>
      </div>

      {/* Report Types */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {reportTypes.map((type) => (
          <GlassCard
            key={type.id}
            onClick={() => setReportType(type.id)}
            className={`p-4 cursor-pointer transition-all ${
              reportType === type.id
                ? 'border-2 border-purple-500 shadow-lg shadow-purple-500/20'
                : 'hover:border-2 hover:border-purple-200 dark:hover:border-purple-500/30'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                reportType === type.id
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                  : 'bg-gray-100 dark:bg-white/10'
              }`}>
                <svg className={`w-5 h-5 ${reportType === type.id ? 'text-white' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={type.icon} />
                </svg>
              </div>
              <span className={`font-semibold text-sm ${reportType === type.id ? 'text-purple-600 dark:text-purple-400' : 'text-gray-600 dark:text-gray-300'}`}>
                {type.label[language]}
              </span>
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
                    <th key={idx} className="py-3 px-4 text-left rtl:text-right font-semibold text-gray-700 dark:text-gray-300 bg-purple-50 dark:bg-purple-500/10">
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
