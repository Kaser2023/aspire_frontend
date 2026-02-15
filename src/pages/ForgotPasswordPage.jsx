import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../hooks/useLanguage'
import GlassCard from '../components/ui/GlassCard'
import Button from '../components/ui/Button'
import PhoneInput from '../components/ui/PhoneInput'
import { formatPhoneForApi, normalizeArabicNumerals } from '../utils/phone'
import logoImage from '../assets/images/logo.png'

export default function ForgotPasswordPage() {
  const { language } = useLanguage()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    phone: '',
    countryCode: '+966',
    otp: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [success, setSuccess] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: name === 'otp' ? normalizeArabicNumerals(value).replace(/\D/g, '') : value,
    })
  }

  const handleSendOTP = (e) => {
    e.preventDefault()
    // Handle sending OTP logic here
    console.log('Sending OTP to:', formatPhoneForApi(formData.phone, formData.countryCode))
    setStep(2)
  }

  const handleVerifyOTP = (e) => {
    e.preventDefault()
    // Handle OTP verification logic here
    console.log('Verifying OTP:', formData.otp)
    setStep(3)
  }

  const handleResetPassword = (e) => {
    e.preventDefault()
    // Handle password reset logic here
    console.log('Reset password:', formData)
    setSuccess(true)
  }

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
              {language === 'ar' ? 'استعادة كلمة المرور' : 'Reset Password'}
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              {language === 'ar' ? 'أدخل رقم جوالك لاستعادة كلمة المرور' : 'Enter your phone number to reset password'}
            </p>
          </div>

          {/* Success Message */}
          {success ? (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-secondary dark:text-white mb-2">
                  {language === 'ar' ? 'تم تغيير كلمة المرور بنجاح!' : 'Password Changed Successfully!'}
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  {language === 'ar' ? 'يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة' : 'You can now login with your new password'}
                </p>
              </div>
              <Button to="/login" className="w-full">
                {language === 'ar' ? 'تسجيل الدخول' : 'Login'}
              </Button>
            </div>
          ) : (
            <>
              {/* Progress Steps */}
              <div className="flex items-center justify-center gap-2 mb-8">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      step >= s 
                        ? 'bg-primary text-white' 
                        : 'bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400'
                    }`}>
                      {step > s ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                      ) : s}
                    </div>
                    {s < 3 && (
                      <div className={`w-8 h-1 mx-1 ${
                        step > s ? 'bg-primary' : 'bg-gray-200 dark:bg-white/10'
                      }`} />
                    )}
                  </div>
                ))}
              </div>

              {/* Step 1: Phone Number */}
              {step === 1 && (
                <form onSubmit={handleSendOTP} className="space-y-6">
                  <PhoneInput
                    label={language === 'ar' ? 'رقم الجوال' : 'Phone Number'}
                    value={formData.phone}
                    onChange={(value) => setFormData({ ...formData, phone: value })}
                    countryCode={formData.countryCode}
                    onCountryCodeChange={(code) => setFormData({ ...formData, countryCode: code })}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 -mt-4">
                    {language === 'ar' ? 'سيتم إرسال رمز التحقق إلى هذا الرقم' : 'A verification code will be sent to this number'}
                  </p>

                  <Button type="submit" className="w-full">
                    {language === 'ar' ? 'إرسال رمز التحقق' : 'Send Verification Code'}
                  </Button>
                </form>
              )}

              {/* Step 2: OTP Verification */}
              {step === 2 && (
                <form onSubmit={handleVerifyOTP} className="space-y-6">
                  <div>
                    <label 
                      htmlFor="otp" 
                      className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                    >
                      {language === 'ar' ? 'رمز التحقق' : 'Verification Code'}
                    </label>
                    <input
                      type="text"
                      id="otp"
                      name="otp"
                      value={formData.otp}
                      onChange={handleChange}
                      required
                      maxLength={6}
                      pattern="[0-9٠-٩۰-۹]{6}"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-center text-2xl tracking-[0.5em] font-bold"
                      placeholder="••••••"
                      dir="ltr"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                      {language === 'ar' ? 'تم إرسال الرمز إلى' : 'Code sent to'} {formatPhoneForApi(formData.phone, formData.countryCode)}
                    </p>
                  </div>

                  <Button type="submit" className="w-full">
                    {language === 'ar' ? 'تحقق' : 'Verify'}
                  </Button>

                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-full text-sm text-primary hover:text-yellow-500 transition-colors"
                  >
                    {language === 'ar' ? 'تغيير رقم الجوال' : 'Change phone number'}
                  </button>
                </form>
              )}

              {/* Step 3: New Password */}
              {step === 3 && (
                <form onSubmit={handleResetPassword} className="space-y-6">
                  <div>
                    <label 
                      htmlFor="newPassword" 
                      className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                    >
                      {language === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}
                    </label>
                    <input
                      type="password"
                      id="newPassword"
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleChange}
                      required
                      minLength={6}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      placeholder="••••••••"
                    />
                  </div>

                  <div>
                    <label 
                      htmlFor="confirmPassword" 
                      className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                    >
                      {language === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      minLength={6}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      placeholder="••••••••"
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    {language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
                  </Button>
                </form>
              )}

              {/* Back to Login Link */}
              <div className="mt-8 text-center">
                <Link 
                  to="/login" 
                  className="text-primary hover:text-yellow-500 font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <svg className={`w-4 h-4 ${language === 'ar' ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                  {language === 'ar' ? 'العودة لتسجيل الدخول' : 'Back to Login'}
                </Link>
              </div>
            </>
          )}
        </GlassCard>
      </div>
    </main>
  )
}
