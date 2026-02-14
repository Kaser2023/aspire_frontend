import { useState, useEffect, useRef } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { useAuth } from '../../hooks/useAuth'
import { usersService } from '../../services'
import GlassCard from '../../components/ui/GlassCard'
import Button from '../../components/ui/Button'
import PhoneInput from '../../components/ui/PhoneInput'
import { DEFAULT_COUNTRY_CODE, formatPhoneForApi, parsePhoneToCountryAndLocal } from '../../utils/phone'

const FILE_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '')

export default function CoachSettings() {
  const { language } = useLanguage()
  const { user, refreshUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [passwordError, setPasswordError] = useState('')
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef(null)

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    name_ar: '',
    countryCode: DEFAULT_COUNTRY_CODE,
    phone: '',
    email: ''
  })

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })

  useEffect(() => {
    if (user) {
      const phoneData = parsePhoneToCountryAndLocal(user.phone || '')
      setProfileForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        name_ar: user.name_ar || '',
        countryCode: phoneData.countryCode,
        phone: phoneData.localNumber,
        email: user.email || ''
      })
      if (user.avatar) {
        setAvatarPreview(`${FILE_BASE_URL}${user.avatar}`)
      }
    }
  }, [user])

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Preview
    const reader = new FileReader()
    reader.onloadend = () => setAvatarPreview(reader.result)
    reader.readAsDataURL(file)

    // Upload
    setUploadingAvatar(true)
    try {
      await usersService.uploadAvatar(user.id, file)
      setMessage({ type: 'success', text: language === 'ar' ? 'تم تحديث الصورة بنجاح' : 'Avatar updated successfully' })
      if (refreshUser) refreshUser()
    } catch (err) {
      console.error('Error uploading avatar:', err)
      setMessage({ type: 'error', text: language === 'ar' ? 'فشل تحديث الصورة' : 'Failed to upload avatar' })
    } finally {
      setUploadingAvatar(false)
    }
  }

  const initials = user ? `${user.first_name?.charAt(0) || ''}${user.last_name?.charAt(0) || ''}`.toUpperCase() : 'CO'
  const fullName = user ? (language === 'ar' && user.name_ar ? user.name_ar : `${user.first_name || ''} ${user.last_name || ''}`.trim()) : ''

  const handleUpdateProfile = async () => {
    setLoading(true)
    setMessage({ type: '', text: '' })
    try {
      const response = await usersService.updateProfile({
        ...profileForm,
        phone: formatPhoneForApi(profileForm.phone, profileForm.countryCode)
      })
      if (response.success) {
        setMessage({ type: 'success', text: language === 'ar' ? 'تم تحديث الملف الشخصي بنجاح' : 'Profile updated successfully' })
        if (refreshUser) refreshUser()
      }
    } catch (err) {
      console.error('Error updating profile:', err)
      setMessage({ type: 'error', text: language === 'ar' ? 'فشل تحديث الملف الشخصي' : 'Failed to update profile' })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePassword = async () => {
    setPasswordError('')
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError(language === 'ar' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match')
      return
    }
    if (passwordForm.new_password.length < 8) {
      setPasswordError(language === 'ar' ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters')
      return
    }
    setLoading(true)
    try {
      const response = await usersService.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      })
      if (response.success) {
        setMessage({ type: 'success', text: language === 'ar' ? 'تم تغيير كلمة المرور بنجاح' : 'Password changed successfully' })
        setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
      }
    } catch (err) {
      console.error('Error changing password:', err)
      setPasswordError(err.response?.data?.message || (language === 'ar' ? 'فشل تغيير كلمة المرور' : 'Failed to change password'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-secondary dark:text-white">
          {language === 'ar' ? 'الإعدادات' : 'Settings'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {language === 'ar' ? 'إدارة حسابك وتفضيلاتك' : 'Manage your account and preferences'}
        </p>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`p-4 rounded-xl ${message.type === 'success' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
          {message.text}
        </div>
      )}

      {/* Profile and Password - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information Card */}
        <GlassCard className="p-6">
          <h2 className="text-lg font-bold text-secondary dark:text-white mb-4">
            {language === 'ar' ? 'المعلومات الشخصية' : 'Personal Information'}
          </h2>
          
          {/* Avatar Section */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative group">
              {avatarPreview ? (
                <img 
                  src={avatarPreview} 
                  alt="Avatar" 
                  className="w-20 h-20 rounded-2xl object-cover"
                />
              ) : (
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
                  {initials || 'CO'}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                {uploadingAvatar ? (
                  <svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <div>
              <p className="font-bold text-secondary dark:text-white">
                {fullName || (language === 'ar' ? 'المدرب' : 'Coach')}
              </p>
              <p className="text-sm text-emerald-500">{language === 'ar' ? 'مدرب' : 'Coach'}</p>
              <p className="text-xs text-gray-400 mt-1">{language === 'ar' ? 'انقر على الصورة للتغيير' : 'Click image to change'}</p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'ar' ? 'الاسم الأول' : 'First Name'}
                </label>
                <input 
                  type="text" 
                  value={profileForm.first_name}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, first_name: e.target.value }))}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'ar' ? 'الاسم الأخير' : 'Last Name'}
                </label>
                <input 
                  type="text" 
                  value={profileForm.last_name}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, last_name: e.target.value }))}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                />
              </div>
            </div>
            <div>
              <PhoneInput
                label={language === 'ar' ? 'رقم الجوال' : 'Phone'}
                value={profileForm.phone}
                onChange={(value) => setProfileForm(prev => ({ ...prev, phone: value }))}
                countryCode={profileForm.countryCode}
                onCountryCodeChange={(code) => setProfileForm(prev => ({ ...prev, countryCode: code }))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
              </label>
              <input 
                type="email" 
                value={profileForm.email}
                onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" 
              />
            </div>
            <Button 
              onClick={handleUpdateProfile}
              disabled={loading}
              className="w-full mt-4 bg-emerald-500 hover:bg-emerald-600"
            >
              {loading ? (language === 'ar' ? 'جاري التحديث...' : 'Updating...') : (language === 'ar' ? 'تحديث الملف الشخصي' : 'Update Profile')}
            </Button>
          </div>
        </GlassCard>

        {/* Change Password Card */}
        <GlassCard className="p-6">
          <h2 className="text-lg font-bold text-secondary dark:text-white mb-4">
            {language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
          </h2>
          {passwordError && (
            <div className="mb-4 p-3 rounded-xl bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-sm">
              {passwordError}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {language === 'ar' ? 'كلمة المرور الحالية' : 'Current Password'}
              </label>
              <input 
                type="password" 
                value={passwordForm.current_password}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, current_password: e.target.value }))}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                placeholder="••••••••" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {language === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}
              </label>
              <input 
                type="password" 
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, new_password: e.target.value }))}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                placeholder="••••••••" 
              />
              {passwordForm.new_password && passwordForm.new_password.length < 8 && (
                <p className="mt-1 text-xs text-red-500">
                  {language === 'ar' ? '8 أحرف على الأقل' : 'At least 8 characters required'}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {language === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}
              </label>
              <input 
                type="password" 
                value={passwordForm.confirm_password}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm_password: e.target.value }))}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                placeholder="••••••••" 
              />
            </div>
            <Button 
              onClick={handleUpdatePassword}
              disabled={loading}
              className="w-full mt-4 bg-emerald-500 hover:bg-emerald-600"
            >
              {loading ? (language === 'ar' ? 'جاري التحديث...' : 'Updating...') : (language === 'ar' ? 'تحديث كلمة المرور' : 'Update Password')}
            </Button>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
