import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { branchesService, usersService } from '../../services'
import GlassCard from '../../components/ui/GlassCard'

export default function Staff() {
  const { language } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [branches, setBranches] = useState([])
  const [staffByBranch, setStaffByBranch] = useState({})
  const [expandedBranches, setExpandedBranches] = useState({})
  const [searchQuery, setSearchQuery] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch all branches (with high limit to get all)
      const branchesRes = await branchesService.getAll({ limit: 100 })
      let branchesData = []
      if (Array.isArray(branchesRes)) {
        branchesData = branchesRes
      } else if (branchesRes?.data && Array.isArray(branchesRes.data)) {
        branchesData = branchesRes.data
      } else if (branchesRes?.branches && Array.isArray(branchesRes.branches)) {
        branchesData = branchesRes.branches
      }
      console.log('Branches loaded:', branchesData.length, branchesData)
      setBranches(branchesData)

      // Fetch branch admins and coaches with high limit to get all
      const [adminsRes, coachesRes] = await Promise.all([
        usersService.getByRole('branch_admin', { limit: 100 }).catch(err => {
          console.error('Error fetching admins:', err)
          return { users: [] }
        }),
        usersService.getByRole('coach', { limit: 500 }).catch(err => {
          console.error('Error fetching coaches:', err)
          return { users: [] }
        })
      ])

      let admins = []
      if (Array.isArray(adminsRes)) {
        admins = adminsRes
      } else if (adminsRes?.data && Array.isArray(adminsRes.data)) {
        admins = adminsRes.data
      } else if (adminsRes?.users && Array.isArray(adminsRes.users)) {
        admins = adminsRes.users
      }
      console.log('Admins loaded:', admins.length, admins)

      let coaches = []
      if (Array.isArray(coachesRes)) {
        coaches = coachesRes
      } else if (coachesRes?.data && Array.isArray(coachesRes.data)) {
        coaches = coachesRes.data
      } else if (coachesRes?.users && Array.isArray(coachesRes.users)) {
        coaches = coachesRes.users
      }
      console.log('Coaches loaded:', coaches.length, coaches)

      // Organize staff by branch
      const staffMap = {}
      
      branchesData.forEach(branch => {
        staffMap[branch.id] = {
          admins: admins.filter(a => a.branch_id === branch.id),
          coaches: coaches.filter(c => c.branch_id === branch.id)
        }
      })

      // Add unassigned staff (no branch)
      const unassignedAdmins = admins.filter(a => !a.branch_id)
      const unassignedCoaches = coaches.filter(c => !c.branch_id)
      if (unassignedAdmins.length > 0 || unassignedCoaches.length > 0) {
        staffMap['unassigned'] = {
          admins: unassignedAdmins,
          coaches: unassignedCoaches
        }
      }

      setStaffByBranch(staffMap)

      // Expand all branches by default
      const expanded = {}
      branchesData.forEach(b => { expanded[b.id] = true })
      if (unassignedAdmins.length > 0 || unassignedCoaches.length > 0) {
        expanded['unassigned'] = true
      }
      setExpandedBranches(expanded)

    } catch (err) {
      console.error('Error fetching staff data:', err)
      setError(err.message || (language === 'ar' ? 'حدث خطأ في تحميل البيانات' : 'Error loading data'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const toggleBranch = (branchId) => {
    setExpandedBranches(prev => ({
      ...prev,
      [branchId]: !prev[branchId]
    }))
  }

  const getDisplayName = (user) => {
    if (language === 'ar' && user.name_ar) {
      return user.name_ar
    }
    return `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || '-'
  }

  const getBranchName = (branch) => {
    if (!branch) return language === 'ar' ? 'غير محدد' : 'Unassigned'
    return branch.name?.[language] || branch.name?.en || branch.name?.ar || branch.name || '-'
  }

  const getAvatarUrl = (avatar) => {
    if (!avatar) return null
    if (avatar.startsWith('http')) return avatar
    return `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${avatar}`
  }

  const filterStaff = (staffList) => {
    if (!searchQuery.trim()) return staffList
    const query = searchQuery.toLowerCase()
    return staffList.filter(user => 
      getDisplayName(user).toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.phone?.includes(query)
    )
  }

  const getTotalCounts = () => {
    let totalAdmins = 0
    let totalCoaches = 0
    Object.values(staffByBranch).forEach(staff => {
      totalAdmins += staff.admins?.length || 0
      totalCoaches += staff.coaches?.length || 0
    })
    return { totalAdmins, totalCoaches }
  }

  const { totalAdmins, totalCoaches } = getTotalCounts()

  const generatePDFReport = () => {
    const isRTL = language === 'ar'
    
    // Build staff rows for each branch
    let staffTableRows = ''
    
    branches.forEach(branch => {
      const staff = staffByBranch[branch.id] || { admins: [], coaches: [] }
      const branchName = getBranchName(branch)
      
      // Add branch header row
      staffTableRows += `
        <tr class="branch-header">
          <td colspan="5" style="background: #0d9488; color: white; font-weight: bold; padding: 12px;">
            ${branchName}
          </td>
        </tr>
      `
      
      // Add admins
      if (staff.admins.length > 0) {
        staffTableRows += `
          <tr class="role-header">
            <td colspan="5" style="background: #f3e8ff; color: #7c3aed; font-weight: 600; padding: 8px;">
              ${language === 'ar' ? 'مديري الفرع' : 'Branch Admins'} (${staff.admins.length})
            </td>
          </tr>
        `
        staff.admins.forEach(admin => {
          staffTableRows += `
            <tr>
              <td>${getDisplayName(admin)}</td>
              <td>${language === 'ar' ? 'مدير فرع' : 'Branch Admin'}</td>
              <td dir="ltr">${admin.phone || '-'}</td>
              <td>${admin.email || '-'}</td>
              <td>${admin.is_active !== false ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'غير نشط' : 'Inactive')}</td>
            </tr>
          `
        })
      }
      
      // Add coaches
      if (staff.coaches.length > 0) {
        staffTableRows += `
          <tr class="role-header">
            <td colspan="5" style="background: #ccfbf1; color: #0d9488; font-weight: 600; padding: 8px;">
              ${language === 'ar' ? 'المدربين' : 'Coaches'} (${staff.coaches.length})
            </td>
          </tr>
        `
        staff.coaches.forEach(coach => {
          staffTableRows += `
            <tr>
              <td>${getDisplayName(coach)}</td>
              <td>${language === 'ar' ? 'مدرب' : 'Coach'}</td>
              <td dir="ltr">${coach.phone || '-'}</td>
              <td>${coach.email || '-'}</td>
              <td>${coach.is_active !== false ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'غير نشط' : 'Inactive')}</td>
            </tr>
          `
        })
      }
      
      // Add empty row between branches
      if (staff.admins.length === 0 && staff.coaches.length === 0) {
        staffTableRows += `
          <tr>
            <td colspan="5" style="text-align: center; color: #9ca3af; padding: 10px;">
              ${language === 'ar' ? 'لا يوجد موظفين' : 'No staff'}
            </td>
          </tr>
        `
      }
    })

    // Handle unassigned staff
    if (staffByBranch['unassigned']) {
      const unassigned = staffByBranch['unassigned']
      staffTableRows += `
        <tr class="branch-header">
          <td colspan="5" style="background: #6b7280; color: white; font-weight: bold; padding: 12px;">
            ${language === 'ar' ? 'غير محدد الفرع' : 'Unassigned Branch'}
          </td>
        </tr>
      `
      
      if (unassigned.admins.length > 0) {
        staffTableRows += `
          <tr class="role-header">
            <td colspan="5" style="background: #f3e8ff; color: #7c3aed; font-weight: 600; padding: 8px;">
              ${language === 'ar' ? 'مديري الفرع' : 'Branch Admins'} (${unassigned.admins.length})
            </td>
          </tr>
        `
        unassigned.admins.forEach(admin => {
          staffTableRows += `
            <tr>
              <td>${getDisplayName(admin)}</td>
              <td>${language === 'ar' ? 'مدير فرع' : 'Branch Admin'}</td>
              <td dir="ltr">${admin.phone || '-'}</td>
              <td>${admin.email || '-'}</td>
              <td>${admin.is_active !== false ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'غير نشط' : 'Inactive')}</td>
            </tr>
          `
        })
      }
      
      if (unassigned.coaches.length > 0) {
        staffTableRows += `
          <tr class="role-header">
            <td colspan="5" style="background: #ccfbf1; color: #0d9488; font-weight: 600; padding: 8px;">
              ${language === 'ar' ? 'المدربين' : 'Coaches'} (${unassigned.coaches.length})
            </td>
          </tr>
        `
        unassigned.coaches.forEach(coach => {
          staffTableRows += `
            <tr>
              <td>${getDisplayName(coach)}</td>
              <td>${language === 'ar' ? 'مدرب' : 'Coach'}</td>
              <td dir="ltr">${coach.phone || '-'}</td>
              <td>${coach.email || '-'}</td>
              <td>${coach.is_active !== false ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'غير نشط' : 'Inactive')}</td>
            </tr>
          `
        })
      }
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="${isRTL ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="UTF-8">
        <title>${language === 'ar' ? 'تقرير الموظفين' : 'Staff Report'}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; direction: ${isRTL ? 'rtl' : 'ltr'}; }
          h1 { color: #0d9488; margin-bottom: 10px; }
          .info { margin-bottom: 20px; color: #666; }
          .info p { margin: 5px 0; }
          .summary { background: #f0fdfa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .summary h3 { margin: 0 0 10px 0; color: #0d9488; }
          .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
          .summary-item { background: white; padding: 10px; border-radius: 4px; text-align: center; }
          .summary-label { font-size: 12px; color: #666; }
          .summary-value { font-size: 20px; font-weight: bold; color: #0d9488; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #374151; color: white; padding: 10px; text-align: ${isRTL ? 'right' : 'left'}; }
          td { padding: 10px; border-bottom: 1px solid #ddd; }
          tr:nth-child(even):not(.branch-header):not(.role-header) { background: #f9fafb; }
          @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <h1>${language === 'ar' ? 'تقرير الموظفين' : 'Staff Report'}</h1>
        <div class="info">
          <p><strong>${language === 'ar' ? 'تاريخ التقرير:' : 'Report Date:'}</strong> ${new Date().toLocaleDateString()}</p>
        </div>

        <div class="summary">
          <h3>${language === 'ar' ? 'ملخص' : 'Summary'}</h3>
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-label">${language === 'ar' ? 'الفروع' : 'Branches'}</div>
              <div class="summary-value">${branches.length}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">${language === 'ar' ? 'مديري الفروع' : 'Branch Admins'}</div>
              <div class="summary-value" style="color: #7c3aed;">${totalAdmins}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">${language === 'ar' ? 'المدربين' : 'Coaches'}</div>
              <div class="summary-value">${totalCoaches}</div>
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>${language === 'ar' ? 'الاسم' : 'Name'}</th>
              <th>${language === 'ar' ? 'الدور' : 'Role'}</th>
              <th>${language === 'ar' ? 'الهاتف' : 'Phone'}</th>
              <th>${language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</th>
              <th>${language === 'ar' ? 'الحالة' : 'Status'}</th>
            </tr>
          </thead>
          <tbody>
            ${staffTableRows}
          </tbody>
        </table>
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

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600"
          >
            {language === 'ar' ? 'إعادة المحاولة' : 'Try Again'}
          </button>
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
            {language === 'ar' ? 'الموظفين' : 'Staff'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {language === 'ar' ? 'عرض مديري الفروع والمدربين' : 'View branch admins and coaches'}
          </p>
        </div>
        <button
          onClick={generatePDFReport}
          disabled={totalAdmins + totalCoaches === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {language === 'ar' ? 'تصدير PDF' : 'Export PDF'}
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="p-4 text-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-500/20 mx-auto mb-2">
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-secondary dark:text-white">{branches.length}</p>
          <p className="text-sm text-gray-500">{language === 'ar' ? 'فروع' : 'Branches'}</p>
        </GlassCard>

        <GlassCard className="p-4 text-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-500/20 mx-auto mb-2">
            <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-secondary dark:text-white">{totalAdmins}</p>
          <p className="text-sm text-gray-500">{language === 'ar' ? 'مديري الفروع' : 'Branch Admins'}</p>
        </GlassCard>

        <GlassCard className="p-4 text-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-500/20 mx-auto mb-2">
            <svg className="w-6 h-6 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-secondary dark:text-white">{totalCoaches}</p>
          <p className="text-sm text-gray-500">{language === 'ar' ? 'المدربين' : 'Coaches'}</p>
        </GlassCard>

        <GlassCard className="p-4 text-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-500/20 mx-auto mb-2">
            <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-secondary dark:text-white">{totalAdmins + totalCoaches}</p>
          <p className="text-sm text-gray-500">{language === 'ar' ? 'إجمالي الموظفين' : 'Total Staff'}</p>
        </GlassCard>
      </div>

      {/* Search */}
      <GlassCard className="p-4">
        <div className="relative">
          <svg className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'ar' ? 'بحث عن موظف...' : 'Search staff...'}
            className="w-full pl-10 rtl:pl-4 rtl:pr-10 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </GlassCard>

      {/* Staff by Branch */}
      <div className="space-y-4">
        {branches.length === 0 && !staffByBranch['unassigned'] && (
          <GlassCard className="p-8 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">
              {language === 'ar' ? 'لا يوجد موظفين' : 'No Staff Found'}
            </h3>
            <p className="text-gray-500">
              {language === 'ar' ? 'لم يتم العثور على أي مديري فروع أو مدربين' : 'No branch admins or coaches were found'}
            </p>
          </GlassCard>
        )}
        
        {branches.map(branch => {
          const staff = staffByBranch[branch.id] || { admins: [], coaches: [] }
          const filteredAdmins = filterStaff(staff.admins)
          const filteredCoaches = filterStaff(staff.coaches)
          const hasStaff = filteredAdmins.length > 0 || filteredCoaches.length > 0
          const isExpanded = expandedBranches[branch.id]

          if (!hasStaff && searchQuery) return null

          return (
            <GlassCard key={branch.id} className="overflow-hidden">
              {/* Branch Header */}
              <button
                onClick={() => toggleBranch(branch.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold">
                    {getBranchName(branch).charAt(0)}
                  </div>
                  <div className="text-start">
                    <h3 className="font-bold text-secondary dark:text-white">{getBranchName(branch)}</h3>
                    <p className="text-sm text-gray-500">
                      {staff.admins.length} {language === 'ar' ? 'مدير' : 'admins'} • {staff.coaches.length} {language === 'ar' ? 'مدرب' : 'coaches'}
                    </p>
                  </div>
                </div>
                <svg 
                  className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Staff List */}
              {isExpanded && (
                <div className="border-t border-gray-100 dark:border-white/10">
                  {/* Branch Admins */}
                  {filteredAdmins.length > 0 && (
                    <div className="p-4 border-b border-gray-100 dark:border-white/10">
                      <h4 className="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        {language === 'ar' ? 'مديري الفرع' : 'Branch Admins'}
                      </h4>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredAdmins.map(admin => (
                          <StaffCard key={admin.id} user={admin} role="admin" language={language} getDisplayName={getDisplayName} getAvatarUrl={getAvatarUrl} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Coaches */}
                  {filteredCoaches.length > 0 && (
                    <div className="p-4">
                      <h4 className="text-sm font-semibold text-teal-600 dark:text-teal-400 mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        {language === 'ar' ? 'المدربين' : 'Coaches'}
                      </h4>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredCoaches.map(coach => (
                          <StaffCard key={coach.id} user={coach} role="coach" language={language} getDisplayName={getDisplayName} getAvatarUrl={getAvatarUrl} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No Staff */}
                  {filteredAdmins.length === 0 && filteredCoaches.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                      <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      {searchQuery 
                        ? (language === 'ar' ? 'لا توجد نتائج' : 'No results found')
                        : (language === 'ar' ? 'لا يوجد موظفين في هذا الفرع' : 'No staff in this branch')
                      }
                    </div>
                  )}
                </div>
              )}
            </GlassCard>
          )
        })}

        {/* Unassigned Staff */}
        {staffByBranch['unassigned'] && (
          <GlassCard className="overflow-hidden border-2 border-dashed border-gray-300 dark:border-white/20">
            <button
              onClick={() => toggleBranch('unassigned')}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-white/10 flex items-center justify-center text-gray-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-start">
                  <h3 className="font-bold text-gray-600 dark:text-gray-300">
                    {language === 'ar' ? 'غير محدد الفرع' : 'Unassigned Branch'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {staffByBranch['unassigned'].admins.length} {language === 'ar' ? 'مدير' : 'admins'} • {staffByBranch['unassigned'].coaches.length} {language === 'ar' ? 'مدرب' : 'coaches'}
                  </p>
                </div>
              </div>
              <svg 
                className={`w-5 h-5 text-gray-400 transition-transform ${expandedBranches['unassigned'] ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {expandedBranches['unassigned'] && (
              <div className="border-t border-gray-200 dark:border-white/10">
                {filterStaff(staffByBranch['unassigned'].admins).length > 0 && (
                  <div className="p-4 border-b border-gray-100 dark:border-white/10">
                    <h4 className="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-3">
                      {language === 'ar' ? 'مديري الفرع' : 'Branch Admins'}
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {filterStaff(staffByBranch['unassigned'].admins).map(admin => (
                        <StaffCard key={admin.id} user={admin} role="admin" language={language} getDisplayName={getDisplayName} getAvatarUrl={getAvatarUrl} />
                      ))}
                    </div>
                  </div>
                )}
                {filterStaff(staffByBranch['unassigned'].coaches).length > 0 && (
                  <div className="p-4">
                    <h4 className="text-sm font-semibold text-teal-600 dark:text-teal-400 mb-3">
                      {language === 'ar' ? 'المدربين' : 'Coaches'}
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {filterStaff(staffByBranch['unassigned'].coaches).map(coach => (
                        <StaffCard key={coach.id} user={coach} role="coach" language={language} getDisplayName={getDisplayName} getAvatarUrl={getAvatarUrl} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </GlassCard>
        )}
      </div>
    </div>
  )
}

function StaffCard({ user, role, language, getDisplayName, getAvatarUrl }) {
  const avatarUrl = getAvatarUrl(user.avatar)
  const isActive = user.is_active !== false

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border ${
      isActive 
        ? 'bg-white dark:bg-white/5 border-gray-100 dark:border-white/10' 
        : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/5 opacity-60'
    }`}>
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {avatarUrl ? (
          <img 
            src={avatarUrl} 
            alt={getDisplayName(user)}
            className="w-14 h-14 rounded-xl object-cover"
            onError={(e) => {
              e.target.style.display = 'none'
              e.target.nextSibling.style.display = 'flex'
            }}
          />
        ) : null}
        <div 
          className={`w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg ${
            role === 'admin' 
              ? 'bg-gradient-to-br from-purple-400 to-purple-600' 
              : 'bg-gradient-to-br from-teal-400 to-teal-600'
          }`}
          style={{ display: avatarUrl ? 'none' : 'flex' }}
        >
          {getDisplayName(user).charAt(0).toUpperCase()}
        </div>
        {!isActive && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white dark:border-gray-800" title={language === 'ar' ? 'غير نشط' : 'Inactive'} />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h5 className="font-semibold text-secondary dark:text-white truncate">
            {getDisplayName(user)}
          </h5>
          <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full ${
            role === 'admin' 
              ? 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400'
              : 'bg-teal-100 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400'
          }`}>
            {role === 'admin' 
              ? (language === 'ar' ? 'مدير' : 'Admin')
              : (language === 'ar' ? 'مدرب' : 'Coach')
            }
          </span>
        </div>

        {/* Contact Info */}
        <div className="mt-1 space-y-1">
          {user.phone && (
            <a 
              href={`tel:${user.phone}`}
              className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-teal-500"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span className="truncate" dir="ltr">{user.phone}</span>
            </a>
          )}
          {user.email && (
            <a 
              href={`mailto:${user.email}`}
              className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-teal-500"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="truncate">{user.email}</span>
            </a>
          )}
        </div>

        {/* Programs for Coaches */}
        {role === 'coach' && user.Programs && user.Programs.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {user.Programs.slice(0, 2).map(program => (
              <span 
                key={program.id} 
                className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400"
              >
                {program.name?.[language] || program.name?.en || program.name}
              </span>
            ))}
            {user.Programs.length > 2 && (
              <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400">
                +{user.Programs.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
