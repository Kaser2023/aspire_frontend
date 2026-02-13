import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useLanguage } from '../../hooks/useLanguage'
import { useTheme } from '../../hooks/useTheme'
import { useAuth } from '../../hooks/useAuth'
import logoImage from '../../assets/images/logo.png'
import Background from '../common/Background'

export default function AccountantDashboardLayout() {
  const { language, toggleLanguage } = useLanguage()
  const { toggleTheme } = useTheme()
  const { logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const menuItems = [
    { path: '/accountant', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', label: { en: 'Home', ar: 'الرئيسية' } },
    { path: '/accountant/subscriptions', icon: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z', label: { en: 'Subscriptions', ar: 'الاشتراكات' } },
    { path: '/accountant/payments', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z', label: { en: 'Payments', ar: 'المدفوعات' } },
    { path: '/accountant/expenses', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', label: { en: 'Expenses', ar: 'المصروفات' } },
    { path: '/accountant/discounts', icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z', label: { en: 'Discounts', ar: 'الخصومات' } },
    { path: '/accountant/reports', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', label: { en: 'Reports', ar: 'التقارير' } },
    { path: '/accountant/attendance', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', label: { en: 'Attendance Records', ar: 'سجل الحضور' } },
    { path: '/accountant/branches', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', label: { en: 'Branches', ar: 'الفروع' } },
    { path: '/accountant/staff', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', label: { en: 'Staff', ar: 'الموظفين' } },
    { path: '/accountant/notifications', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', label: { en: 'Notifications', ar: 'الإشعارات' } },
    { path: '/accountant/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', label: { en: 'Settings', ar: 'الإعدادات' } },
  ]

  const isActive = (path) => {
    if (path === '/accountant') {
      return location.pathname === '/accountant'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      {/* Pattern Background */}
      <Background />

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-secondary/90 backdrop-blur-xl border-b border-gray-200 dark:border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10"
          >
            <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link to="/accountant" className="flex items-center gap-2">
            <img src={logoImage} alt="Logo" className="h-8" />
            <span className="text-xs font-bold px-2 py-1 bg-teal-500 text-white rounded-lg">
              {language === 'ar' ? 'محاسب' : 'ACCOUNTANT'}
            </span>
          </Link>
          <div className="flex items-center gap-2">
          <Link to="/accountant/notifications" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10">
            <svg className="w-5 h-5 text-gray-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </Link>
            <button onClick={toggleLanguage} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10">
              <span className="text-sm font-bold text-teal-500">{language === 'en' ? 'AR' : 'EN'}</span>
            </button>
            <button onClick={toggleTheme} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10">
              <svg className="w-5 h-5 text-gray-600 dark:text-teal-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1-8.313-12.454z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 rtl:left-auto rtl:right-0 top-0 bottom-0 w-72 bg-white/95 dark:bg-secondary/95 backdrop-blur-xl overflow-y-auto">
            <SidebarContent 
              menuItems={menuItems} 
              isActive={isActive} 
              language={language}
              onClose={() => setSidebarOpen(false)}
              toggleLanguage={toggleLanguage}
              toggleTheme={toggleTheme}
              handleLogout={handleLogout}
            />
          </aside>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 rtl:lg:left-auto rtl:lg:right-0 lg:w-72 lg:flex lg:flex-col bg-white/95 dark:bg-secondary/95 backdrop-blur-xl border-r rtl:border-r-0 rtl:border-l border-gray-200 dark:border-white/10 overflow-y-auto z-40">
        <SidebarContent 
          menuItems={menuItems} 
          isActive={isActive} 
          language={language}
          toggleLanguage={toggleLanguage}
          toggleTheme={toggleTheme}
          handleLogout={handleLogout}
        />
      </aside>

      {/* Main Content */}
      <main className="relative z-10 lg:mr-0 lg:ml-72 rtl:lg:ml-0 rtl:lg:mr-72 pt-16 lg:pt-0 min-h-screen">
        <div className="p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

function SidebarContent({ menuItems, isActive, language, onClose, toggleLanguage, toggleTheme, handleLogout }) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/10">
        <Link to="/accountant" className="flex items-center gap-3" onClick={onClose}>
          <img src={logoImage} alt="Logo" className="h-10" />
          <div>
            <span className="font-bold text-secondary dark:text-white block">
              ASPIRE <span className="text-teal-500">ACADEMY</span>
            </span>
            <span className="text-xs font-bold px-2 py-0.5 bg-teal-500 text-white rounded">
              {language === 'ar' ? 'لوحة المحاسب' : 'ACCOUNTANT'}
            </span>
          </div>
        </Link>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* All Branches Indicator */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-white/10 bg-teal-50 dark:bg-teal-500/10">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-semibold text-teal-700 dark:text-teal-400">
            {language === 'ar' ? 'جميع الفروع' : 'All Branches'}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={onClose}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
              isActive(item.path)
                ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
            </svg>
            <span className="font-semibold">{item.label[language]}</span>
          </Link>
        ))}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-gray-200 dark:border-white/10 space-y-2">
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleLanguage}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
          >
            <span className="text-sm font-bold">{language === 'en' ? '🇸🇦 AR' : '🇬🇧 EN'}</span>
          </button>
          <button 
            onClick={toggleTheme}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1-8.313-12.454z" />
            </svg>
          </button>
        </div>
        <button
          onClick={() => { onClose?.(); handleLogout(); }}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors w-full"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="font-semibold">{language === 'ar' ? 'تسجيل الخروج' : 'Logout'}</span>
        </button>
      </div>
    </div>
  )
}

