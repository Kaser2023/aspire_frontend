import { useState, useEffect, useCallback, useRef } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { branchesService } from '../../services'
import expensesService from '../../services/expenses.service'
import GlassCard from '../../components/ui/GlassCard'
import Button from '../../components/ui/Button'
import ChangeHistoryModal from '../../components/common/ChangeHistoryModal'

export default function Expenses() {
  const { language } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [expenses, setExpenses] = useState([])
  const [stats, setStats] = useState({ totalExpenses: 0, totalAmount: 0, byCategory: {}, byPaymentMethod: {} })
  const [branches, setBranches] = useState([])
  const [selectedBranchId, setSelectedBranchId] = useState('')
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [editingExpenseId, setEditingExpenseId] = useState(null)
  const [selectedExpenseIds, setSelectedExpenseIds] = useState([])
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [historyTarget, setHistoryTarget] = useState(null)
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' })
  const [categoryFilter, setCategoryFilter] = useState('')
  const receiptFileRef = useRef(null)
  const [receiptPreview, setReceiptPreview] = useState(null)

  const categories = [
    { value: 'utilities', label: { en: 'Utilities', ar: 'خدمات' } },
    { value: 'rent', label: { en: 'Rent', ar: 'إيجار' } },
    { value: 'salaries', label: { en: 'Salaries', ar: 'رواتب' } },
    { value: 'equipment', label: { en: 'Equipment', ar: 'معدات' } },
    { value: 'maintenance', label: { en: 'Maintenance', ar: 'صيانة' } },
    { value: 'supplies', label: { en: 'Supplies', ar: 'مستلزمات' } },
    { value: 'marketing', label: { en: 'Marketing', ar: 'تسويق' } },
    { value: 'transportation', label: { en: 'Transportation', ar: 'نقل' } },
    { value: 'other', label: { en: 'Other', ar: 'أخرى' } }
  ]

  const paymentMethods = [
    { value: 'cash', label: { en: 'Cash', ar: 'نقداً' } },
    { value: 'bank_transfer', label: { en: 'Bank Transfer', ar: 'تحويل بنكي' } },
    { value: 'credit_card', label: { en: 'Credit Card', ar: 'بطاقة ائتمان' } },
    { value: 'cheque', label: { en: 'Cheque', ar: 'شيك' } }
  ]

  const [expenseForm, setExpenseForm] = useState({
    title: '',
    description: '',
    amount: '',
    category: 'other',
    expense_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    receipt_number: '',
    vendor_name: '',
    notes: '',
    is_recurring: false,
    recurring_frequency: '',
    receiptFile: null,
    existing_receipt_url: null
  })

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true)
      const params = { limit: 100 }
      if (selectedBranchId) params.branch_id = selectedBranchId
      if (categoryFilter) params.category = categoryFilter
      if (dateFilter.start) params.start_date = dateFilter.start
      if (dateFilter.end) params.end_date = dateFilter.end

      const [expensesRes, statsRes, branchesRes] = await Promise.all([
        expensesService.getAll(params),
        expensesService.getStats(params),
        branchesService.getAll({ limit: 200 })
      ])

      if (expensesRes.success) {
        setExpenses(expensesRes.data || [])
      }
      if (statsRes.success) {
        setStats(statsRes.data || { totalExpenses: 0, totalAmount: 0, byCategory: {}, byPaymentMethod: {} })
      }
      if (branchesRes.success) {
        const transformedBranches = (branchesRes.data || []).map((b) => ({
          id: b.id,
          name: { en: b.name, ar: b.name_ar || b.name }
        }))
        setBranches(transformedBranches)
      }
    } catch (err) {
      console.error('Error fetching expenses:', err)
      setError(language === 'ar' ? 'فشل في تحميل المصروفات' : 'Failed to load expenses')
    } finally {
      setLoading(false)
    }
  }, [selectedBranchId, categoryFilter, dateFilter, language])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  const formatCurrency = (amount) => `SAR ${(parseFloat(amount) || 0).toLocaleString()}`
  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')
  const formatDateTime = (dateStr) => new Date(dateStr).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US')
  const getLastEditorName = (expense) => {
    const editor = expense.last_updated_by
    if (!editor) return language === 'ar' ? 'غير معروف' : 'Unknown'
    const fullName = `${editor.first_name || ''} ${editor.last_name || ''}`.trim()
    return fullName || (language === 'ar' ? 'غير معروف' : 'Unknown')
  }

  const getCategoryLabel = (categoryValue) => {
    const category = categories.find(c => c.value === categoryValue)
    return category ? category.label[language] : categoryValue
  }

  const getPaymentMethodLabel = (methodValue) => {
    const method = paymentMethods.find(m => m.value === methodValue)
    return method ? method.label[language] : methodValue
  }

  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
  const fileBaseUrl = apiBaseUrl.replace(/\/api\/?$/, '')
  const getReceiptUrl = (receiptUrl) => {
    if (!receiptUrl) return ''
    if (receiptUrl.startsWith('http')) return receiptUrl
    return `${fileBaseUrl}${receiptUrl.startsWith('/') ? '' : '/'}${receiptUrl}`
  }

  const handleExpenseSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)
    
    if (!selectedBranchId) {
      setError(language === 'ar' ? 'اختر فرعاً أولاً' : 'Please select a branch')
      return
    }
    
    if (!expenseForm.title || !expenseForm.amount) {
      setError(language === 'ar' ? 'العنوان والمبلغ مطلوبان' : 'Title and amount are required')
      return
    }

    setSubmitting(true)
    try {
      let response
      const payload = {
        branch_id: selectedBranchId,
        title: expenseForm.title,
        description: expenseForm.description || undefined,
        amount: parseFloat(expenseForm.amount).toFixed(2),
        category: expenseForm.category,
        expense_date: expenseForm.expense_date,
        payment_method: expenseForm.payment_method,
        receipt_number: expenseForm.receipt_number || undefined,
        vendor_name: expenseForm.vendor_name || undefined,
        notes: expenseForm.notes || undefined,
        is_recurring: expenseForm.is_recurring,
        recurring_frequency: expenseForm.is_recurring ? expenseForm.recurring_frequency : undefined
      }

      if (expenseForm.receiptFile) {
        const formData = new FormData()
        formData.append('receipt', expenseForm.receiptFile)
        Object.keys(payload).forEach(key => {
          if (payload[key] !== undefined) {
            formData.append(key, payload[key])
          }
        })
        response = editingExpenseId
          ? await expensesService.updateWithReceipt(editingExpenseId, formData)
          : await expensesService.createWithReceipt(formData)
      } else {
        response = editingExpenseId
          ? await expensesService.update(editingExpenseId, payload)
          : await expensesService.create(payload)
      }

      if (response.success) {
        setSuccessMessage(
          editingExpenseId 
            ? (language === 'ar' ? 'تم تحديث المصروف بنجاح' : 'Expense updated successfully')
            : (language === 'ar' ? 'تم تسجيل المصروف بنجاح' : 'Expense recorded successfully')
        )
        resetForm()
        fetchExpenses()
      }
    } catch (err) {
      console.error('Error saving expense:', err)
      setError(err.response?.data?.message || (language === 'ar' ? 'فشل في حفظ المصروف' : 'Failed to save expense'))
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setExpenseForm({
      title: '',
      description: '',
      amount: '',
      category: 'other',
      expense_date: new Date().toISOString().split('T')[0],
      payment_method: 'cash',
      receipt_number: '',
      vendor_name: '',
      notes: '',
      is_recurring: false,
      recurring_frequency: '',
      receiptFile: null,
      existing_receipt_url: null
    })
    setReceiptPreview(null)
    if (receiptFileRef.current) receiptFileRef.current.value = ''
    setEditingExpenseId(null)
    setShowExpenseForm(false)
  }

  const handleEditExpense = (expense) => {
    setEditingExpenseId(expense.id)
    setSelectedBranchId(expense.branch_id)
    setExpenseForm({
      title: expense.title || '',
      description: expense.description || '',
      amount: expense.amount || '',
      category: expense.category || 'other',
      expense_date: expense.expense_date || new Date().toISOString().split('T')[0],
      payment_method: expense.payment_method || 'cash',
      receipt_number: expense.receipt_number || '',
      vendor_name: expense.vendor_name || '',
      notes: expense.notes || '',
      is_recurring: expense.is_recurring || false,
      recurring_frequency: expense.recurring_frequency || '',
      receiptFile: null,
      existing_receipt_url: expense.receipt_url || null
    })
    setReceiptPreview(null)
    setShowExpenseForm(true)
  }

  const handleDeleteExpense = async (expense) => {
    setSubmitting(true)
    try {
      await expensesService.delete(expense.id)
      setExpenses((prev) => prev.filter((item) => item.id !== expense.id))
      setSuccessMessage(language === 'ar' ? 'تم حذف المصروف' : 'Expense deleted')
      setConfirmDeleteId(null)
      fetchExpenses()
    } catch (err) {
      setError(err.response?.data?.message || (language === 'ar' ? 'فشل في حذف المصروف' : 'Failed to delete expense'))
    } finally {
      setSubmitting(false)
    }
  }

  const toggleSelectExpense = (expenseId) => {
    setSelectedExpenseIds((prev) =>
      prev.includes(expenseId) ? prev.filter((id) => id !== expenseId) : [...prev, expenseId]
    )
  }

  const toggleSelectAllExpenses = () => {
    if (selectedExpenseIds.length === expenses.length) {
      setSelectedExpenseIds([])
      return
    }
    setSelectedExpenseIds(expenses.map((expense) => expense.id))
  }

  const generatePDFReport = () => {
    const isRTL = language === 'ar'
    const branchName = selectedBranchId 
      ? branches.find(b => b.id === selectedBranchId)?.name?.[language] || branches.find(b => b.id === selectedBranchId)?.name || (language === 'ar' ? 'جميع الفروع' : 'All Branches')
      : (language === 'ar' ? 'جميع الفروع' : 'All Branches')
    
    const dateRange = (dateFilter.start || dateFilter.end) 
      ? `${dateFilter.start || (language === 'ar' ? 'البداية' : 'Start')} - ${dateFilter.end || (language === 'ar' ? 'الحالي' : 'Present')}`
      : (language === 'ar' ? 'جميع الفترات' : 'All Periods')

    const headers = [
      language === 'ar' ? 'التاريخ' : 'Date',
      language === 'ar' ? 'العنوان' : 'Title',
      language === 'ar' ? 'الفئة' : 'Category',
      language === 'ar' ? 'الفرع' : 'Branch',
      language === 'ar' ? 'طريقة الدفع' : 'Payment',
      language === 'ar' ? 'المبلغ' : 'Amount'
    ]

    const rows = expenses.map(expense => [
      formatDate(expense.expense_date),
      expense.title,
      getCategoryLabel(expense.category),
      expense.branch?.name || '-',
      getPaymentMethodLabel(expense.payment_method),
      `SAR ${parseFloat(expense.amount).toLocaleString()}`
    ])

    const categoryBreakdown = Object.entries(stats.byCategory || {}).map(([category, amount]) => 
      `<tr><td>${getCategoryLabel(category)}</td><td>SAR ${amount.toLocaleString()}</td></tr>`
    ).join('')

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="${isRTL ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="UTF-8">
        <title>${language === 'ar' ? 'تقرير المصروفات' : 'Expenses Report'}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; direction: ${isRTL ? 'rtl' : 'ltr'}; }
          h1 { color: #0d9488; margin-bottom: 10px; }
          .info { margin-bottom: 20px; color: #666; }
          .info p { margin: 5px 0; }
          .summary { background: #f0fdfa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .summary h3 { margin: 0 0 10px 0; color: #0d9488; }
          .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
          .summary-item { background: white; padding: 10px; border-radius: 4px; }
          .summary-label { font-size: 12px; color: #666; }
          .summary-value { font-size: 18px; font-weight: bold; color: #0d9488; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #0d9488; color: white; padding: 10px; text-align: ${isRTL ? 'right' : 'left'}; }
          td { padding: 10px; border-bottom: 1px solid #ddd; }
          tr:nth-child(even) { background: #f9fafb; }
          .amount { color: #dc2626; font-weight: bold; }
          .category-table { width: auto; margin-top: 20px; }
          .category-table th { background: #6366f1; }
          h3 { color: #4f46e5; margin-top: 30px; }
          @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <h1>${language === 'ar' ? 'تقرير المصروفات' : 'Expenses Report'}</h1>
        <div class="info">
          <p><strong>${language === 'ar' ? 'الفرع:' : 'Branch:'}</strong> ${branchName}</p>
          <p><strong>${language === 'ar' ? 'الفترة:' : 'Period:'}</strong> ${dateRange}</p>
          <p><strong>${language === 'ar' ? 'تاريخ التقرير:' : 'Report Date:'}</strong> ${new Date().toLocaleDateString()}</p>
        </div>

        <div class="summary">
          <h3>${language === 'ar' ? 'ملخص' : 'Summary'}</h3>
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-label">${language === 'ar' ? 'إجمالي المصروفات' : 'Total Expenses'}</div>
              <div class="summary-value">SAR ${stats.totalAmount?.toLocaleString() || 0}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">${language === 'ar' ? 'عدد المصروفات' : 'Number of Expenses'}</div>
              <div class="summary-value">${stats.totalExpenses || 0}</div>
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${rows.map(row => `<tr>${row.map((cell, i) => `<td${i === 5 ? ' class="amount"' : ''}>${cell}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>

        ${categoryBreakdown ? `
          <h3>${language === 'ar' ? 'توزيع حسب الفئة' : 'Breakdown by Category'}</h3>
          <table class="category-table">
            <thead>
              <tr>
                <th>${language === 'ar' ? 'الفئة' : 'Category'}</th>
                <th>${language === 'ar' ? 'المبلغ' : 'Amount'}</th>
              </tr>
            </thead>
            <tbody>${categoryBreakdown}</tbody>
          </table>
        ` : ''}
      </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 500)
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-secondary dark:text-white">
            {language === 'ar' ? 'المصروفات' : 'Expenses'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {language === 'ar' ? 'إدارة وتتبع مصروفات الفروع' : 'Manage and track branch expenses'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={generatePDFReport}
            className="bg-blue-500 hover:bg-blue-600"
            disabled={expenses.length === 0}
          >
            <svg className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {language === 'ar' ? 'تقرير PDF' : 'Report PDF'}
          </Button>
          <Button
            onClick={() => {
              setShowExpenseForm(true)
              setEditingExpenseId(null)
              setExpenseForm({
                title: '',
                description: '',
                amount: '',
                category: 'other',
                expense_date: new Date().toISOString().split('T')[0],
                payment_method: 'cash',
                receipt_number: '',
                vendor_name: '',
                notes: '',
                is_recurring: false,
                recurring_frequency: '',
                receiptFile: null
              })
            }}
            className="bg-teal-500 hover:bg-teal-600"
          >
            <svg className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {language === 'ar' ? 'تسجيل مصروف' : 'Record Expense'}
          </Button>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Filters */}
      <GlassCard className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {language === 'ar' ? 'الفرع' : 'Branch'}
            </label>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">{language === 'ar' ? 'جميع الفروع' : 'All Branches'}</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name[language]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {language === 'ar' ? 'الفئة' : 'Category'}
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">{language === 'ar' ? 'جميع الفئات' : 'All Categories'}</option>
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label[language]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {language === 'ar' ? 'من تاريخ' : 'From Date'}
            </label>
            <input
              type="date"
              value={dateFilter.start}
              onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {language === 'ar' ? 'إلى تاريخ' : 'To Date'}
            </label>
            <input
              type="date"
              value={dateFilter.end}
              onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
      </GlassCard>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-500/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-500">{formatCurrency(stats.totalAmount || 0)}</p>
              <p className="text-sm text-gray-500">{language === 'ar' ? 'إجمالي المصروفات' : 'Total Expenses'}</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-500">{stats.totalExpenses || 0}</p>
              <p className="text-sm text-gray-500">{language === 'ar' ? 'عدد المصروفات' : 'Total Records'}</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-500/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-500">{Object.keys(stats.byCategory || {}).length}</p>
              <p className="text-sm text-gray-500">{language === 'ar' ? 'فئات نشطة' : 'Active Categories'}</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-teal-100 dark:bg-teal-500/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-teal-500">{branches.length}</p>
              <p className="text-sm text-gray-500">{language === 'ar' ? 'الفروع' : 'Branches'}</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Expense Form Modal */}
      {showExpenseForm && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-secondary dark:text-white">
              {editingExpenseId 
                ? (language === 'ar' ? 'تعديل مصروف' : 'Edit Expense')
                : (language === 'ar' ? 'تسجيل مصروف جديد' : 'Record New Expense')
              }
            </h3>
            <button onClick={resetForm} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form onSubmit={handleExpenseSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'ar' ? 'الفرع' : 'Branch'} *
                </label>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                >
                  <option value="">{language === 'ar' ? 'اختر الفرع' : 'Select Branch'}</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name[language]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'ar' ? 'الفئة' : 'Category'} *
                </label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label[language]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {language === 'ar' ? 'العنوان' : 'Title'} *
              </label>
              <input
                type="text"
                value={expenseForm.title}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder={language === 'ar' ? 'مثال: فاتورة الكهرباء' : 'e.g., Electricity Bill'}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'ar' ? 'المبلغ' : 'Amount'} *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'ar' ? 'تاريخ المصروف' : 'Expense Date'} *
                </label>
                <input
                  type="date"
                  value={expenseForm.expense_date}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, expense_date: e.target.value }))}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
                </label>
                <select
                  value={expenseForm.payment_method}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, payment_method: e.target.value }))}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {paymentMethods.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label[language]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'ar' ? 'اسم المورد' : 'Vendor Name'}
                </label>
                <input
                  type="text"
                  value={expenseForm.vendor_name}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, vendor_name: e.target.value }))}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder={language === 'ar' ? 'اختياري' : 'Optional'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'ar' ? 'رقم الإيصال' : 'Receipt Number'}
                </label>
                <input
                  type="text"
                  value={expenseForm.receipt_number}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, receipt_number: e.target.value }))}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder={language === 'ar' ? 'اختياري' : 'Optional'}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {language === 'ar' ? 'الوصف' : 'Description'}
              </label>
              <textarea
                rows={2}
                value={expenseForm.description}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder={language === 'ar' ? 'وصف المصروف' : 'Expense description'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {language === 'ar' ? 'صورة الإيصال' : 'Receipt Image'}
              </label>
              
              {/* Show existing receipt when editing */}
              {expenseForm.existing_receipt_url && !receiptPreview && (
                <div className="mb-3 p-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {language === 'ar' ? 'الإيصال الحالي:' : 'Current Receipt:'}
                  </p>
                  <div className="flex items-center gap-3">
                    <img 
                      src={getReceiptUrl(expenseForm.existing_receipt_url)} 
                      alt="Current receipt" 
                      className="max-w-[120px] max-h-[80px] rounded-lg border border-gray-200 dark:border-white/10 object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none'
                        e.target.nextSibling.style.display = 'flex'
                      }}
                    />
                    <div className="hidden items-center justify-center w-[120px] h-[80px] rounded-lg border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/10">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex flex-col gap-2">
                      <a
                        href={getReceiptUrl(expenseForm.existing_receipt_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        {language === 'ar' ? 'عرض' : 'View'}
                      </a>
                      <a
                        href={getReceiptUrl(expenseForm.existing_receipt_url)}
                        download
                        className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-700"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        {language === 'ar' ? 'تحميل' : 'Download'}
                      </a>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {language === 'ar' ? 'اختر ملفًا جديدًا أدناه لاستبدال الإيصال الحالي' : 'Choose a new file below to replace the current receipt'}
                  </p>
                </div>
              )}

              <input
                ref={receiptFileRef}
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  setExpenseForm(prev => ({ ...prev, receiptFile: file || null }))
                  if (file && file.type.startsWith('image/')) {
                    const reader = new FileReader()
                    reader.onload = (ev) => setReceiptPreview(ev.target?.result)
                    reader.readAsDataURL(file)
                  } else {
                    setReceiptPreview(null)
                  }
                }}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
              />
              {receiptPreview && (
                <div className="mt-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {language === 'ar' ? 'الإيصال الجديد:' : 'New Receipt:'}
                  </p>
                  <img src={receiptPreview} alt="Receipt preview" className="max-w-xs max-h-40 rounded-lg border border-gray-200 dark:border-white/10" />
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={expenseForm.is_recurring}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, is_recurring: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {language === 'ar' ? 'مصروف متكرر' : 'Recurring Expense'}
                </span>
              </label>
              {expenseForm.is_recurring && (
                <select
                  value={expenseForm.recurring_frequency}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, recurring_frequency: e.target.value }))}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">{language === 'ar' ? 'اختر التكرار' : 'Select Frequency'}</option>
                  <option value="daily">{language === 'ar' ? 'يومي' : 'Daily'}</option>
                  <option value="weekly">{language === 'ar' ? 'أسبوعي' : 'Weekly'}</option>
                  <option value="monthly">{language === 'ar' ? 'شهري' : 'Monthly'}</option>
                  <option value="yearly">{language === 'ar' ? 'سنوي' : 'Yearly'}</option>
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {language === 'ar' ? 'ملاحظات' : 'Notes'}
              </label>
              <textarea
                rows={2}
                value={expenseForm.notes}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder={language === 'ar' ? 'ملاحظات إضافية' : 'Additional notes'}
              />
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit" className="bg-teal-500 hover:bg-teal-600" disabled={submitting}>
                {submitting
                  ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                  : editingExpenseId
                    ? (language === 'ar' ? 'تحديث المصروف' : 'Update Expense')
                    : (language === 'ar' ? 'تسجيل المصروف' : 'Record Expense')}
              </Button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </form>
        </GlassCard>
      )}

      {/* Expenses List */}
      {expenses.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-500 mb-2">{language === 'ar' ? 'لا توجد مصروفات بعد' : 'No expenses yet'}</p>
          <p className="text-sm text-gray-400">{language === 'ar' ? 'ستظهر المصروفات هنا عند تسجيلها' : 'Expenses will appear here when recorded'}</p>
        </GlassCard>
      ) : (
        <GlassCard className="p-4 lg:p-6">
          {/* Header with selection info */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-secondary dark:text-white">
                {language === 'ar' ? 'سجل المصروفات' : 'Expenses Log'}
              </h2>
              <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-white/10 rounded-full text-gray-500">
                {expenses.length} {language === 'ar' ? 'سجل' : 'records'}
              </span>
            </div>
            {selectedExpenseIds.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-teal-600 dark:text-teal-400 font-medium">
                  {selectedExpenseIds.length} {language === 'ar' ? 'محدد' : 'selected'}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedExpenseIds([])}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  {language === 'ar' ? 'إلغاء التحديد' : 'Clear'}
                </button>
              </div>
            )}
          </div>

          {/* Mobile & Tablet Cards View */}
          <div className="lg:hidden space-y-3">
            {expenses.map((expense) => (
              <div
                key={expense.id}
                className={`p-4 rounded-xl border transition-all ${
                  selectedExpenseIds.includes(expense.id)
                    ? 'bg-teal-50 dark:bg-teal-500/10 border-teal-200 dark:border-teal-500/30'
                    : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10'
                }`}
              >
                {/* Card Header */}
                <div className="flex items-start gap-3 mb-3">
                  <input
                    type="checkbox"
                    checked={selectedExpenseIds.includes(expense.id)}
                    onChange={() => toggleSelectExpense(expense.id)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-secondary dark:text-white truncate">{expense.title}</p>
                        <p className="text-xs text-gray-500 truncate">{expense.branch?.name || '-'}</p>
                      </div>
                      <span className="text-lg font-bold text-red-500 whitespace-nowrap">{formatCurrency(expense.amount)}</span>
                    </div>
                  </div>
                </div>

                {/* Card Details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-3">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">{language === 'ar' ? 'الفئة' : 'Category'}</p>
                    <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
                      {getCategoryLabel(expense.category)}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">{language === 'ar' ? 'التاريخ' : 'Date'}</p>
                    <p className="text-gray-700 dark:text-gray-300">{formatDate(expense.expense_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">{language === 'ar' ? 'طريقة الدفع' : 'Payment'}</p>
                    <p className="text-gray-700 dark:text-gray-300">{getPaymentMethodLabel(expense.payment_method)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">{language === 'ar' ? 'الإيصال' : 'Receipt'}</p>
                    {expense.receipt_url ? (
                      <div className="flex items-center gap-2">
                        <a
                          href={getReceiptUrl(expense.receipt_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700"
                          title={language === 'ar' ? 'عرض' : 'View'}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </a>
                        <a
                          href={getReceiptUrl(expense.receipt_url)}
                          download
                          className="inline-flex items-center gap-1 text-green-600 hover:text-green-700"
                          title={language === 'ar' ? 'تحميل' : 'Download'}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </a>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  {language === 'ar' ? 'آخر تحديث بواسطة:' : 'Last updated by:'} {getLastEditorName(expense)}
                  {' • '}
                  {expense.last_updated_at ? formatDateTime(expense.last_updated_at) : '-'}
                </p>

                {/* Card Actions */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-white/10">
                  {confirmDeleteId === expense.id ? (
                    <>
                      <span className="text-sm text-gray-500 mr-2">
                        {language === 'ar' ? 'تأكيد الحذف؟' : 'Delete?'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteExpense(expense)}
                        disabled={submitting}
                        className="px-3 py-1.5 text-sm rounded-lg text-white bg-red-500 hover:bg-red-600 disabled:opacity-50"
                      >
                        {language === 'ar' ? 'نعم' : 'Yes'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-3 py-1.5 text-sm rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
                      >
                        {language === 'ar' ? 'لا' : 'No'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleEditExpense(expense)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-500/10"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span className="hidden sm:inline">{language === 'ar' ? 'تعديل' : 'Edit'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setHistoryTarget({ entityType: 'expense', entityId: expense.id, title: expense.title })}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="hidden sm:inline">{language === 'ar' ? 'السجل' : 'History'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(expense.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span className="hidden sm:inline">{language === 'ar' ? 'حذف' : 'Delete'}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block">
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-white/5">
                  <tr>
                    <th className="w-12 py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={expenses.length > 0 && selectedExpenseIds.length === expenses.length}
                        onChange={toggleSelectAllExpenses}
                        className="h-4 w-4 rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                      />
                    </th>
                    <th className="py-3 px-4 text-start font-semibold text-gray-600 dark:text-gray-300">
                      {language === 'ar' ? 'العنوان' : 'Title'}
                    </th>
                    <th className="py-3 px-4 text-start font-semibold text-gray-600 dark:text-gray-300">
                      {language === 'ar' ? 'الفئة' : 'Category'}
                    </th>
                    <th className="py-3 px-4 text-start font-semibold text-gray-600 dark:text-gray-300">
                      {language === 'ar' ? 'الفرع' : 'Branch'}
                    </th>
                    <th className="py-3 px-4 text-start font-semibold text-gray-600 dark:text-gray-300">
                      {language === 'ar' ? 'المورد' : 'Vendor'}
                    </th>
                    <th className="py-3 px-4 text-start font-semibold text-gray-600 dark:text-gray-300">
                      {language === 'ar' ? 'الدفع' : 'Payment'}
                    </th>
                    <th className="py-3 px-4 text-start font-semibold text-gray-600 dark:text-gray-300">
                      {language === 'ar' ? 'المبلغ' : 'Amount'}
                    </th>
                    <th className="py-3 px-4 text-start font-semibold text-gray-600 dark:text-gray-300">
                      {language === 'ar' ? 'التاريخ' : 'Date'}
                    </th>
                    <th className="py-3 px-4 text-center font-semibold text-gray-600 dark:text-gray-300">
                      {language === 'ar' ? 'الإيصال' : 'Receipt'}
                    </th>
                    <th className="w-28 py-3 px-4 text-center font-semibold text-gray-600 dark:text-gray-300">
                      {language === 'ar' ? 'إجراءات' : 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {expenses.map((expense) => (
                    <tr
                      key={expense.id}
                      className={`transition-colors ${
                        selectedExpenseIds.includes(expense.id)
                          ? 'bg-teal-50 dark:bg-teal-500/10'
                          : 'hover:bg-gray-50 dark:hover:bg-white/5'
                      }`}
                    >
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedExpenseIds.includes(expense.id)}
                          onChange={() => toggleSelectExpense(expense.id)}
                          className="h-4 w-4 rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-secondary dark:text-white">{expense.title}</p>
                        {expense.description && (
                          <p className="text-xs text-gray-400 truncate max-w-[200px]">{expense.description}</p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block text-xs font-medium px-2.5 py-1 rounded-full bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
                          {getCategoryLabel(expense.category)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                        {expense.branch?.name || '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                        {expense.vendor_name || '-'}
                        <p className="text-[11px] text-gray-400 truncate">{getLastEditorName(expense)}</p>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                        {getPaymentMethodLabel(expense.payment_method)}
                      </td>
                      <td className="py-3 px-4 font-bold text-red-500">
                        {formatCurrency(expense.amount)}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                        {formatDate(expense.expense_date)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {expense.receipt_url ? (
                          <div className="flex items-center justify-center gap-2">
                            <a
                              href={getReceiptUrl(expense.receipt_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                              title={language === 'ar' ? 'عرض' : 'View'}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </a>
                            <a
                              href={getReceiptUrl(expense.receipt_url)}
                              download
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10"
                              title={language === 'ar' ? 'تحميل' : 'Download'}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            </a>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {confirmDeleteId === expense.id ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDeleteExpense(expense)}
                              disabled={submitting}
                              className="px-2 py-1 text-xs rounded-md text-white bg-red-500 hover:bg-red-600 disabled:opacity-50"
                            >
                              {language === 'ar' ? 'تأكيد' : 'Confirm'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 text-xs rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
                            >
                              {language === 'ar' ? 'إلغاء' : 'Cancel'}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleEditExpense(expense)}
                              className="p-2 rounded-lg text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-500/10"
                              title={language === 'ar' ? 'تعديل' : 'Edit'}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => setHistoryTarget({ entityType: 'expense', entityId: expense.id, title: expense.title })}
                              className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
                              title={language === 'ar' ? 'السجل' : 'History'}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(expense.id)}
                              className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                              title={language === 'ar' ? 'حذف' : 'Delete'}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </GlassCard>
      )}

      <ChangeHistoryModal
        open={Boolean(historyTarget)}
        onClose={() => setHistoryTarget(null)}
        entityType={historyTarget?.entityType}
        entityId={historyTarget?.entityId}
        title={historyTarget?.title}
      />
    </div>
  )
}
