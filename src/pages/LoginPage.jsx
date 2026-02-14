import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLanguage } from '../hooks/useLanguage'
import { useAuth } from '../hooks/useAuth'
import GlassCard from '../components/ui/GlassCard'
import Button from '../components/ui/Button'
import PhoneInput from '../components/ui/PhoneInput'
import { formatPhoneForApi } from '../utils/phone'
import logoImage from '../assets/images/logo.png'

export default function LoginPage() {
  const { t, language } = useLanguage()
  const navigate = useNavigate()
  const { login, loading, error, clearError } = useAuth()
  
  // Form data
  const [formData, setFormData] = useState({
    phone: '',
    countryCode: '+966',
    password: '',
  })
  
  // Local error state for validation
  const [localError, setLocalError] = useState('')

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    setLocalError('')
    clearError()
  }

  // Role to dashboard path mapping
  const ROLE_DASHBOARDS = {
    parent: '/dashboard',
    coach: '/coach',
    branch_admin: '/branch-admin',
    accountant: '/accountant',
    super_admin: '/super-admin',
    owner: '/super-admin',
  }

  // Handle Login (Phone + Password)
  const handleLogin = async (e) => {
    e.preventDefault()
    setLocalError('')
    
    if (!formData.phone || !formData.password) {
      setLocalError(language === 'ar' ? 'يرجى إدخال رقم الجوال وكلمة المرور' : 'Please enter phone number and password')
      return
    }

    const fullPhone = formatPhoneForApi(formData.phone, formData.countryCode)
    const result = await login(fullPhone, formData.password)
    if (result.success && result.user) {
      // Navigate to role-specific dashboard using the returned user
      const dashboardPath = ROLE_DASHBOARDS[result.user.role] || '/'
      navigate(dashboardPath)
    }
  }

  const displayError = localError || error

  return (
    <main className="relative z-10 min-h-screen pt-28 md:pt-32 pb-12 px-4 md:px-6 lg:px-12 flex items-center justify-center">
      <div className="w-full max-w-md">
        <GlassCard className="p-8 md:p-10">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-block mb-4">
              <img 
                src={logoImage} 
                alt="ASPIRE ACADEMY Logo" 
                className="h-16 w-auto mx-auto object-contain"
              />
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-secondary dark:text-white mb-2">
              {t('login.title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              {t('login.subtitle')}
            </p>
          </div>

          {/* Error Message */}
          {displayError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
              {displayError}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Phone Number */}
            <PhoneInput
              label={language === 'ar' ? 'رقم الجوال' : 'Phone Number'}
              value={formData.phone}
              onChange={(value) => setFormData({ ...formData, phone: value })}
              countryCode={formData.countryCode}
              onCountryCodeChange={(code) => setFormData({ ...formData, countryCode: code })}
            />

            {/* Password */}
            <div>
              <label 
                htmlFor="password" 
                className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
              >
                {t('login.password')}
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="••••••••"
              />
            </div>

            {/* Forgot Password */}
            <div className="text-right rtl:text-left">
              <Link 
                to="/forgot-password" 
                className="text-sm text-primary hover:text-yellow-500 transition-colors"
              >
                {t('login.forgotPassword')}
              </Link>
            </div>

            {/* Submit Button */}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading 
                ? (language === 'ar' ? 'جاري تسجيل الدخول...' : 'Signing in...') 
                : t('login.signIn')
              }
            </Button>
          </form>

          {/* Register Link */}
          <div className="mt-8 text-center">
            <p className="text-gray-600 dark:text-gray-300">
              {t('login.noAccount')}{' '}
              <Link 
                to="/signup" 
                className="text-primary hover:text-yellow-500 font-semibold transition-colors"
              >
                {t('login.register')}
              </Link>
            </p>
          </div>
        </GlassCard>
      </div>
    </main>
  )
}
