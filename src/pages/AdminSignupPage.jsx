import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLanguage } from '../hooks/useLanguage'
import { useAuth } from '../hooks/useAuth'
import { authService } from '../services'
import GlassCard from '../components/ui/GlassCard'
import Button from '../components/ui/Button'
import PhoneInput from '../components/ui/PhoneInput'
import { formatPhoneForApi } from '../utils/phone'
import logoImage from '../assets/images/logo.png'
import Background from '../components/common/Background'

export default function AdminSignupPage() {
  const { language } = useLanguage()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  
  // Form steps
  const [step, setStep] = useState(1) // 1: Setup Key, 2: Account Details, 3: Success
  
  // Form data
  const [formData, setFormData] = useState({
    setupKey: '',
    firstName: '',
    lastName: '',
    nameAr: '',
    email: '',
    phone: '',
    countryCode: '+966',
    password: '',
    confirmPassword: '',
    role: 'super_admin', // or 'owner' for first setup
  })
  
  // State
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [keyVerified, setKeyVerified] = useState(false)
  const [isFirstSetup, setIsFirstSetup] = useState(false)
  const [adminAction, setAdminAction] = useState('register') // register | reset
  const [successAction, setSuccessAction] = useState('register')

  // Redirect if already logged in as admin
  useEffect(() => {
    if (isAuthenticated && (user?.role === 'super_admin' || user?.role === 'owner')) {
      navigate('/super-admin')
    }
  }, [isAuthenticated, user, navigate])

  // Check if this is first setup (no admins exist)
  useEffect(() => {
    const checkFirstSetup = async () => {
      try {
        const response = await authService.checkSetupStatus()
        if (response.success) {
          setIsFirstSetup(response.data?.isFirstSetup || false)
          if (response.data?.isFirstSetup) {
            // Skip key verification for first setup
            setKeyVerified(true)
            setStep(2)
            setFormData(prev => ({ ...prev, role: 'owner' }))
          }
        }
      } catch (err) {
        // If endpoint doesn't exist, assume not first setup
        console.log('Setup check not available')
      }
    }
    checkFirstSetup()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError('')
  }

  // Verify setup key
  const handleVerifyKey = async (e) => {
    e.preventDefault()
    setError('')
    
    if (!formData.setupKey) {
      setError(language === 'ar' ? 'يرجى إدخال مفتاح الإعداد' : 'Please enter the setup key')
      return
    }

    setLoading(true)
    try {
      const response = await authService.verifySetupKey(formData.setupKey)
      if (response.success) {
        setKeyVerified(true)
        setStep(2)
      } else {
        setError(response.message || (language === 'ar' ? 'مفتاح الإعداد غير صحيح' : 'Invalid setup key'))
      }
    } catch (err) {
      setError(err.message || (language === 'ar' ? 'مفتاح الإعداد غير صحيح' : 'Invalid setup key'))
    } finally {
      setLoading(false)
    }
  }

  // Create admin account
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.phone) {
      setError(language === 'ar' ? 'يرجى إدخال رقم الجوال' : 'Please enter your phone number')
      return
    }

    if (!formData.password || formData.password.length < 8) {
      setError(language === 'ar' ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError(language === 'ar' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match')
      return
    }

    if (adminAction === 'register') {
      if (!formData.firstName || !formData.lastName) {
        setError(language === 'ar' ? 'يرجى إدخال الاسم الكامل' : 'Please enter your full name')
        return
      }

      if (!formData.email) {
        setError(language === 'ar' ? 'يرجى إدخال البريد الإلكتروني' : 'Please enter your email')
        return
      }
    }

    setLoading(true)
    try {
      const fullPhone = formatPhoneForApi(formData.phone, formData.countryCode)

      if (adminAction === 'reset') {
        const response = await authService.resetAdminPassword({
          setup_key: formData.setupKey,
          phone: fullPhone,
          password: formData.password
        })

        if (response.success) {
          setSuccessAction('reset')
          setStep(3)
        } else {
          setError(response.message || (language === 'ar' ? 'فشل في إعادة تعيين كلمة المرور' : 'Failed to reset password'))
        }
      } else {
        const response = await authService.registerAdmin({
          first_name: formData.firstName,
          last_name: formData.lastName,
          name_ar: formData.nameAr || `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          phone: fullPhone,
          password: formData.password,
          role: formData.role,
          setup_key: formData.setupKey
        })

        if (response.success) {
          setSuccessAction('register')
          setStep(3)
        } else {
          setError(response.message || (language === 'ar' ? 'فشل في إنشاء الحساب' : 'Failed to create account'))
        }
      }
    } catch (err) {
      setError(
        err.message ||
        (adminAction === 'reset'
          ? (language === 'ar' ? 'فشل في إعادة تعيين كلمة المرور' : 'Failed to reset password')
          : (language === 'ar' ? 'فشل في إنشاء الحساب' : 'Failed to create account'))
      )
    } finally {
      setLoading(false)
    }
  }

  // Render Step 1: Setup Key Verification
  const renderKeyVerification = () => (
    <form onSubmit={handleVerifyKey} className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-secondary dark:text-white mb-2">
          {language === 'ar' ? 'التحقق من الصلاحية' : 'Authorization Required'}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          {language === 'ar' 
            ? 'أدخل مفتاح الإعداد المقدم من مسؤول النظام للمتابعة'
            : 'Enter the setup key provided by the system administrator to continue'}
        </p>
      </div>

      {/* Setup Key Input */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {language === 'ar' ? 'مفتاح الإعداد' : 'Setup Key'}
        </label>
        <input
          type="password"
          name="setupKey"
          value={formData.setupKey}
          onChange={handleChange}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-mono tracking-wider"
          placeholder="XXXX-XXXX-XXXX-XXXX"
          required
        />
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Submit */}
      <Button type="submit" className="w-full bg-gradient-to-r from-purple-500 to-pink-500" disabled={loading}>
        {loading 
          ? (language === 'ar' ? 'جاري التحقق...' : 'Verifying...') 
          : (language === 'ar' ? 'تحقق ومتابعة' : 'Verify & Continue')}
      </Button>

      {/* Help text */}
      <p className="text-center text-xs text-gray-500 dark:text-gray-400">
        {language === 'ar' 
          ? 'لا تملك مفتاح الإعداد؟ تواصل مع مالك النظام.'
          : "Don't have a setup key? Contact the system owner."}
      </p>
    </form>
  )

  // Render Step 2: Account Details
  const renderAccountForm = () => (
    <form onSubmit={handleSubmit} className="space-y-5">
      {!isFirstSetup && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {language === 'ar' ? 'العملية' : 'Action'}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAdminAction('register')}
              className={`p-3 rounded-xl border-2 transition-all ${
                adminAction === 'register'
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-500/10'
                  : 'border-gray-200 dark:border-white/10 hover:border-purple-300'
              }`}
            >
              <div className={`font-semibold text-sm ${adminAction === 'register' ? 'text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-gray-300'}`}>
                {language === 'ar' ? 'إنشاء حساب' : 'Create Account'}
              </div>
            </button>
            <button
              type="button"
              onClick={() => setAdminAction('reset')}
              className={`p-3 rounded-xl border-2 transition-all ${
                adminAction === 'reset'
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10'
                  : 'border-gray-200 dark:border-white/10 hover:border-amber-300'
              }`}
            >
              <div className={`font-semibold text-sm ${adminAction === 'reset' ? 'text-amber-700 dark:text-amber-300' : 'text-gray-700 dark:text-gray-300'}`}>
                {language === 'ar' ? 'إعادة تعيين كلمة المرور' : 'Reset Password'}
              </div>
            </button>
          </div>
        </div>
      )}

      {adminAction === 'reset' && !isFirstSetup && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            {language === 'ar'
              ? 'أدخل جوال حساب المدير العام/المالك الجديد وكلمة المرور الجديدة. يتطلب ذلك مفتاح الإعداد.'
              : 'Enter the Super Admin/Owner phone and a new password. This requires the setup key.'}
          </p>
        </div>
      )}

      {/* First Setup Banner */}
      {isFirstSetup && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border border-amber-200 dark:border-amber-500/20 mb-4">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2L13.09 8.26L20 9.27L15 14.14L16.18 21.02L10 17.77L3.82 21.02L5 14.14L0 9.27L6.91 8.26L10 2Z" />
            </svg>
            <div>
              <p className="font-bold text-amber-800 dark:text-amber-300">
                {language === 'ar' ? 'إعداد حساب المالك' : 'Owner Account Setup'}
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-400">
                {language === 'ar' 
                  ? 'أنت تقوم بإنشاء أول حساب مالك للنظام. هذا الحساب سيكون له صلاحيات كاملة.'
                  : 'You are creating the first owner account. This account will have full system access.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Role Selection (if not first setup and registering) */}
      {!isFirstSetup && adminAction === 'register' && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {language === 'ar' ? 'نوع الحساب' : 'Account Type'}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, role: 'super_admin' }))}
              className={`p-4 rounded-xl border-2 transition-all ${
                formData.role === 'super_admin'
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-500/10'
                  : 'border-gray-200 dark:border-white/10 hover:border-purple-300'
              }`}
            >
              <div className="text-2xl mb-1">👔</div>
              <div className={`font-semibold text-sm ${formData.role === 'super_admin' ? 'text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-gray-300'}`}>
                {language === 'ar' ? 'مدير عام' : 'Super Admin'}
              </div>
            </button>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, role: 'owner' }))}
              className={`p-4 rounded-xl border-2 transition-all ${
                formData.role === 'owner'
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10'
                  : 'border-gray-200 dark:border-white/10 hover:border-amber-300'
              }`}
            >
              <div className="text-2xl mb-1">👑</div>
              <div className={`font-semibold text-sm ${formData.role === 'owner' ? 'text-amber-700 dark:text-amber-300' : 'text-gray-700 dark:text-gray-300'}`}>
                {language === 'ar' ? 'مالك النظام' : 'System Owner'}
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Name Fields */}
      {adminAction === 'register' && (
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {language === 'ar' ? 'الاسم الأول' : 'First Name'} *
          </label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder={language === 'ar' ? 'أحمد' : 'Ahmed'}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {language === 'ar' ? 'اسم العائلة' : 'Last Name'} *
          </label>
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder={language === 'ar' ? 'السعود' : 'Al-Saud'}
            required
          />
        </div>
      </div>
      )}

      {/* Arabic Name (Optional) */}
      {adminAction === 'register' && (
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {language === 'ar' ? 'الاسم بالعربي' : 'Name in Arabic'} 
          <span className="text-gray-400 font-normal ml-1">({language === 'ar' ? 'اختياري' : 'Optional'})</span>
        </label>
        <input
          type="text"
          name="nameAr"
          value={formData.nameAr}
          onChange={handleChange}
          dir="rtl"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="أحمد السعود"
        />
      </div>
      )}

      {/* Email */}
      {adminAction === 'register' && (
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {language === 'ar' ? 'البريد الإلكتروني' : 'Email'} *
        </label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="admin@aspire-academy.com"
          required
        />
      </div>
      )}

      {/* Phone */}
      <PhoneInput
        label={language === 'ar' ? 'رقم الجوال' : 'Phone Number'}
        value={formData.phone}
        onChange={(value) => setFormData({ ...formData, phone: value })}
        countryCode={formData.countryCode}
        onCountryCodeChange={(code) => setFormData({ ...formData, countryCode: code })}
        required
      />

      {/* Password */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {language === 'ar' ? 'كلمة المرور' : 'Password'} *
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 pr-12"
            placeholder="••••••••"
            minLength={8}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            {showPassword ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {language === 'ar' ? '8 أحرف على الأقل' : 'At least 8 characters'}
        </p>
      </div>

      {/* Confirm Password */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {language === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'} *
        </label>
        <input
          type="password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="••••••••"
          required
        />
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Submit */}
      <Button type="submit" className="w-full bg-gradient-to-r from-purple-500 to-pink-500" disabled={loading}>
        {loading 
          ? (adminAction === 'reset'
              ? (language === 'ar' ? 'جاري إعادة التعيين...' : 'Resetting...')
              : (language === 'ar' ? 'جاري إنشاء الحساب...' : 'Creating Account...'))
          : (adminAction === 'reset'
              ? (language === 'ar' ? 'إعادة تعيين كلمة المرور' : 'Reset Password')
              : (language === 'ar' ? 'إنشاء الحساب' : 'Create Account'))}
      </Button>

      {/* Back button */}
      {!isFirstSetup && (
        <button
          type="button"
          onClick={() => { setStep(1); setKeyVerified(false); }}
          className="w-full text-center text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          {language === 'ar' ? '← العودة' : '← Go Back'}
        </button>
      )}
    </form>
  )

  // Render Step 3: Success
  const renderSuccess = () => (
    <div className="text-center py-8">
      <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      
      <h2 className="text-2xl font-bold text-secondary dark:text-white mb-3">
        {successAction === 'reset'
          ? (language === 'ar' ? 'تمت إعادة تعيين كلمة المرور بنجاح!' : 'Password Reset Successfully!')
          : (language === 'ar' ? 'تم إنشاء الحساب بنجاح!' : 'Account Created Successfully!')}
      </h2>
      
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        {successAction === 'reset'
          ? (language === 'ar'
              ? 'يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.'
              : 'You can now log in with your new password.')
          : (language === 'ar'
              ? 'يمكنك الآن تسجيل الدخول باستخدام بيانات الاعتماد الخاصة بك.'
              : 'You can now log in with your credentials.')}
      </p>

      <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 mb-6">
        {successAction === 'register' && (
          <p className="text-sm text-purple-700 dark:text-purple-300">
            <strong>{language === 'ar' ? 'البريد الإلكتروني:' : 'Email:'}</strong> {formData.email}
          </p>
        )}
        <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
          <strong>{language === 'ar' ? 'الجوال:' : 'Phone:'}</strong> {formatPhoneForApi(formData.phone, formData.countryCode)}
        </p>
        {successAction === 'register' && (
          <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
            <strong>{language === 'ar' ? 'الدور:' : 'Role:'}</strong> {formData.role === 'owner' ? (language === 'ar' ? 'مالك النظام' : 'System Owner') : (language === 'ar' ? 'مدير عام' : 'Super Admin')}
          </p>
        )}
      </div>

      <Link to="/login">
        <Button className="bg-gradient-to-r from-purple-500 to-pink-500">
          {language === 'ar' ? 'تسجيل الدخول الآن' : 'Login Now'}
        </Button>
      </Link>
    </div>
  )

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <Background />
      
      <main className="relative z-10 min-h-screen pt-8 pb-12 px-4 flex items-center justify-center">
        <div className="w-full max-w-md">
          <GlassCard className="p-8">
            {/* Logo */}
            <div className="text-center mb-6">
              <Link to="/" className="inline-block mb-4">
                <img 
                  src={logoImage} 
                  alt="ASPIRE ACADEMY Logo" 
                  className="h-14 w-auto mx-auto object-contain"
                />
              </Link>
              <h1 className="text-2xl font-bold text-secondary dark:text-white mb-1">
                {language === 'ar' ? 'تسجيل حساب إداري' : 'Admin Registration'}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {language === 'ar' ? 'إنشاء حساب مدير أو مالك للنظام' : 'Create a Super Admin or Owner account'}
              </p>
              
              {/* Steps indicator */}
              {step < 3 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <div className={`w-8 h-1 rounded-full ${step >= 1 ? 'bg-purple-500' : 'bg-gray-200 dark:bg-white/20'}`}></div>
                  <div className={`w-8 h-1 rounded-full ${step >= 2 ? 'bg-purple-500' : 'bg-gray-200 dark:bg-white/20'}`}></div>
                </div>
              )}
            </div>

            {/* Form Content */}
            {step === 1 && renderKeyVerification()}
            {step === 2 && renderAccountForm()}
            {step === 3 && renderSuccess()}

            {/* Login Link */}
            {step < 3 && (
              <div className="mt-6 text-center">
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {language === 'ar' ? 'لديك حساب بالفعل؟' : 'Already have an account?'}{' '}
                  <Link 
                    to="/login" 
                    className="text-purple-500 hover:text-purple-600 font-semibold transition-colors"
                  >
                    {language === 'ar' ? 'تسجيل الدخول' : 'Login'}
                  </Link>
                </p>
              </div>
            )}
          </GlassCard>
        </div>
      </main>
    </div>
  )
}
