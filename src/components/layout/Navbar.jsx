import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '../../hooks/useTheme'
import { useLanguage } from '../../hooks/useLanguage'
import MobileMenu from './MobileMenu'
import logoImage from '../../assets/images/logo.png'

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { toggleTheme } = useTheme()
  const { t, toggleLanguage, language } = useLanguage()
  const location = useLocation()

  const navLinks = [
    { path: '/', label: t('nav.home') },
    { path: '/store', label: t('nav.store') },
    { path: '/about', label: t('nav.about') },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <>
      <nav className="fixed top-4 md:top-6 left-1/2 transform -translate-x-1/2 z-50 w-[95%] md:w-[90%] max-w-4xl">
        <div className="glass dark:glass-dark rounded-full px-4 md:px-6 py-3 md:py-4 flex justify-between items-center shadow-2xl shadow-primary/10 transition-all duration-700 hover:shadow-primary/20">
          {/* Logo */}
          <div className="flex items-center gap-2 md:gap-3">
            <Link to="/">
              <img 
                src={logoImage} 
                alt="ASPIRE ACADEMY Logo" 
                className="h-8 md:h-10 w-auto object-contain"
              />
            </Link>
            <Link 
              to="/" 
              className="font-bold text-base md:text-lg tracking-tight text-secondary dark:text-white hidden sm:block"
            >
              ASPIRE <span className="text-primary">ACADEMY</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <ul className="hidden md:flex items-center gap-6 text-sm font-semibold tracking-wide">
            {navLinks.map((link) => (
              <li key={link.path}>
                <Link
                  to={link.path}
                  className={`transition-colors ${
                    isActive(link.path)
                      ? 'text-primary dark:text-primary font-bold'
                      : 'text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary'
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
              title="Switch Language"
            >
              <span className="text-gray-600 dark:text-primary text-sm font-bold">
                {language === 'en' ? 'AR' : 'EN'}
              </span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
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

            {/* Login Button - Desktop */}
            <Link
              to="/login"
              className="bg-primary hover:bg-yellow-500 text-white px-4 md:px-6 py-2 md:py-2.5 rounded-full font-semibold shadow-lg shadow-primary/30 transform hover:-translate-y-1 transition-all duration-500 items-center gap-2 group hidden sm:flex"
            >
              <span>{t('nav.login')}</span>
              <svg 
                className={`w-4 h-4 group-hover:rotate-45 transition-transform ${language === 'ar' ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
              aria-label="Open menu"
            >
              <svg 
                className="w-6 h-6 text-gray-600 dark:text-primary" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      <MobileMenu 
        isOpen={mobileMenuOpen} 
        onClose={() => setMobileMenuOpen(false)} 
      />
    </>
  )
}

