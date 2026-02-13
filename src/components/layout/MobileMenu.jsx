import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '../../hooks/useTheme'
import { useLanguage } from '../../hooks/useLanguage'
import logoImage from '../../assets/images/logo.png'

export default function MobileMenu({ isOpen, onClose }) {
  const { toggleTheme } = useTheme()
  const { t, toggleLanguage, language } = useLanguage()
  const location = useLocation()

  const navLinks = [
    { path: '/', label: t('nav.home') },
    { path: '/store', label: t('nav.store') },
    { path: '/about', label: t('nav.about') },
  ]

  const isActive = (path) => location.pathname === path

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-40">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose}
      />

      {/* Menu Panel */}
      <div className="absolute top-20 left-4 right-4 glass dark:glass-dark rounded-2xl p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-11 h-11 rounded-full bg-white/80 dark:bg-white/10 flex items-center justify-center text-secondary dark:text-white"
              aria-label="Close menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Toggle theme"
            >
              <svg 
                className="w-5 h-5 text-gray-600 dark:text-primary" 
                fill="currentColor" 
                viewBox="0 0 24 24"
              >
                <path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1-8.313-12.454z" />
              </svg>
            </button>

            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Switch language"
            >
              <span className="text-gray-600 dark:text-primary text-sm font-bold">
                {language === 'en' ? 'AR' : 'EN'}
              </span>
            </button>
          </div>

          {/* Logo */}
          <img 
            src={logoImage} 
            alt="ASPIRE ACADEMY Logo" 
            className="h-8 w-auto object-contain"
          />
        </div>

        {/* Navigation Links */}
        <ul className="space-y-4 text-center">
          {navLinks.map((link) => (
            <li key={link.path}>
              <Link
                to={link.path}
                onClick={onClose}
                className={`block py-2 font-semibold transition-colors ${
                  isActive(link.path)
                    ? 'text-primary dark:text-primary font-bold'
                    : 'text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary'
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
          <li className="pt-4 border-t border-white/10">
            <Link
              to="/login"
              onClick={onClose}
              className="block py-2 bg-primary hover:bg-yellow-500 text-white rounded-full font-semibold transition-colors"
            >
              {t('nav.login')}
            </Link>
          </li>
        </ul>
      </div>
    </div>
  )
}

