import { useState, useEffect, useCallback } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useLanguage } from '../../hooks/useLanguage'
import { useTheme } from '../../hooks/useTheme'
import { useAuth } from '../../hooks/useAuth'
import logoImage from '../../assets/images/logo.png'
import Background from '../common/Background'
import notificationService from '../../services/notification.service'
import { onNotificationCreated, offNotificationCreated } from '../../services/socket.service'

export default function SuperAdminDashboardLayout() {
  const { language, toggleLanguage } = useLanguage()
  const { toggleTheme } = useTheme()
  const { logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await notificationService.getUnreadCount()
      if (response.success) {
        setUnreadCount(response.data?.count || 0)
      }
    } catch (err) {
      console.error('Error fetching unread count:', err)
    }
  }, [])

  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 60000)

    // Listen for real-time notifications
    onNotificationCreated(() => {
      fetchUnreadCount()
    })

    return () => {
      clearInterval(interval)
      offNotificationCreated()
    }
  }, [fetchUnreadCount])

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const menuItems = [
    { path: '/super-admin', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', label: { en: 'Home', ar: 'الرئيسية' } },
    { path: '/super-admin/users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', label: { en: 'Users', ar: 'المستخدمون' } },
    { path: '/super-admin/branches', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', label: { en: 'Branches', ar: 'الفروع' } },
    { path: '/super-admin/programs', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', label: { en: 'Programs', ar: 'البرامج' } },
    { path: '/super-admin/financial', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', label: { en: 'Financial', ar: 'المالية' } },
    { path: '/super-admin/attendance', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', label: { en: 'Coach Attendance', ar: 'حضور المدربين' } },
    { path: '/super-admin/reports', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', label: { en: 'Reports', ar: 'التقارير' } },
    { path: '/super-admin/announcements', icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z', label: { en: 'Announcements', ar: 'الإعلانات' } },
    { path: '/super-admin/discounts', icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z', label: { en: 'Discounts', ar: 'الخصومات' } },
    { path: '/super-admin/products', icon: 'M20 13V7a2 2 0 00-2-2h-3V3H9v2H6a2 2 0 00-2 2v6m16 0v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6m16 0h-4m-8 0H4m6 0v2m0 4h.01', label: { en: 'Products', ar: 'المنتجات' } },
    { path: '/super-admin/subscription-freezes', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', label: { en: 'Freeze Subs', ar: 'تجميد الاشتراكات' } },
    { path: '/super-admin/sms', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z', label: { en: 'SMS', ar: 'الرسائل النصية' } },
    { path: '/super-admin/notifications', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', label: { en: 'Notifications', ar: 'الإشعارات' } },
    { path: '/super-admin/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', label: { en: 'Settings', ar: 'الإعدادات' } },
  ]

  const isActive = (path) => {
    if (path === '/super-admin') {
      return location.pathname === '/super-admin'
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
          <Link to="/super-admin" className="flex items-center gap-2">
            <img src={logoImage} alt="Logo" className="h-8" />
            <span className="text-xs font-bold px-2 py-1 bg-purple-500 text-white rounded-lg">
              {language === 'ar' ? 'رئيس الأكاديمية' : 'SUPER ADMIN'}
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/super-admin/notifications" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 relative">
              <svg className="w-5 h-5 text-gray-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
            <button onClick={toggleLanguage} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10">
              <span className="text-sm font-bold text-purple-500">{language === 'en' ? 'AR' : 'EN'}</span>
            </button>
            <button onClick={toggleTheme} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10">
              <svg className="w-5 h-5 text-gray-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 24 24">
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
        <Link to="/super-admin" className="flex items-center gap-3" onClick={onClose}>
          <img src={logoImage} alt="Logo" className="h-10" />
          <div>
            <span className="font-bold text-secondary dark:text-white block">
              ASPIRE <span className="text-purple-500">ACADEMY</span>
            </span>
            <span className="text-xs font-bold px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded">
              {language === 'ar' ? 'رئيس الأكاديمية' : 'SUPER ADMIN'}
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

      {/* Full Access Indicator */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-white/10 bg-purple-50 dark:bg-purple-500/10">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span className="text-sm font-semibold text-purple-700 dark:text-purple-400">
            {language === 'ar' ? 'صلاحيات كاملة' : 'Full Access'}
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
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30'
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

