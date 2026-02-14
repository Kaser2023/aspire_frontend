import { useState, useEffect, useRef } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { useAuth } from '../../hooks/useAuth'
import { usersService } from '../../services'
import playersService from '../../services/players.service'
import GlassCard from '../../components/ui/GlassCard'
import Button from '../../components/ui/Button'
import PhoneInput from '../../components/ui/PhoneInput'
import DeveloperCreditInline from '../../components/common/DeveloperCreditInline'
import { DEFAULT_COUNTRY_CODE, formatPhoneForApi, parsePhoneToCountryAndLocal } from '../../utils/phone'

const FILE_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '')

export default function Settings() {
  const { language } = useLanguage()
  const { user, refreshUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [passwordError, setPasswordError] = useState('')
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef(null)

  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    name_ar: '',
    countryCode: DEFAULT_COUNTRY_CODE,
    phone: '',
    email: ''
  })

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })

  const normalizeEmail = (email = '') => {
    const trimmed = email.trim()
    if (!trimmed) return ''
    const lower = trimmed.toLowerCase()
    if (
      lower === 'unassigned@system.local' ||
      lower.endsWith('@otp.academy.local') ||
      lower.endsWith('@opacademy.local')
    ) {
      return ''
    }
    return trimmed
  }

  const isSelfPlayer = user?.account_type === 'self_player'

  useEffect(() => {
    if (user) {
      const phoneData = parsePhoneToCountryAndLocal(user.phone || '')
      setProfileForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        name_ar: user.name_ar || '',
        countryCode: phoneData.countryCode,
        phone: phoneData.localNumber,
        email: normalizeEmail(user.email || '')
      })
      // For self-players, check player avatar first, then user avatar
      let avatarUrl = null;
      if (isSelfPlayer && user.player?.avatar) {
        avatarUrl = user.player.avatar;
      } else if (user.avatar) {
        avatarUrl = user.avatar;
      }
      
      if (avatarUrl) {
        setAvatarPreview(`${FILE_BASE_URL}${avatarUrl}`)
      }
    }
  }, [user])

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => setAvatarPreview(reader.result)
    reader.readAsDataURL(file)

    setUploadingAvatar(true)
    try {
      if (isSelfPlayer && user.player?.id) {
        // Use players service for self-players
        await playersService.uploadPhoto(user.player.id, file)
      } else {
        // Use users service for regular users
        await usersService.uploadAvatar(user.id, file)
      }
      setMessage({ type: 'success', text: language === 'ar' ? 'تم تحديث الصورة بنجاح' : 'Avatar updated successfully' })
      if (refreshUser) refreshUser()
    } catch (err) {
      console.error('Error uploading avatar:', err)
      setMessage({ type: 'error', text: language === 'ar' ? 'فشل تحديث الصورة' : 'Failed to upload avatar' })
    } finally {
      setUploadingAvatar(false)
    }
  }

  const initials = user ? `${user.first_name?.charAt(0) || ''}${user.last_name?.charAt(0) || ''}`.toUpperCase() : 'PA'
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
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-secondary dark:text-white">
          {language === 'ar' ? 'الإعدادات' : 'Settings'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {language === 'ar' ? 'إدارة حسابك وتفضيلاتك' : 'Manage your account and preferences'}
        </p>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl ${message.type === 'success' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="p-6">
          <h2 className="text-lg font-bold text-secondary dark:text-white mb-4">
            {language === 'ar' ? 'المعلومات الشخصية' : 'Personal Information'}
          </h2>
          
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
                  {initials || 'PA'}
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
                {fullName || (language === 'ar' ? 'ولي الأمر' : 'Parent')}
              </p>
              <p className="text-sm text-emerald-500">{isSelfPlayer ? (language === 'ar' ? 'لاعب' : 'Player') : (language === 'ar' ? 'ولي أمر' : 'Parent')}</p>
              <p className="text-xs text-gray-400 mt-1">{language === 'ar' ? 'انقر على الصورة للتغيير' : 'Click image to change'}</p>
            </div>
          </div>

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
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg.white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" 
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

        {/* Self-Player: Registration Code & Parent Info */}
        {isSelfPlayer && (
          <GlassCard className="p-6 lg:col-span-2">
            <h2 className="text-lg font-bold text-secondary dark:text-white mb-4">
              {language === 'ar' ? 'معلومات الربط' : 'Account Linking'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Registration Code - show only if NOT linked to a parent */}
              {user?.player_record && !user.player_record.is_linked_to_parent && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {language === 'ar' ? 'رمز التسجيل' : 'Registration Code'}
                  </h3>
                  <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-200/50 dark:border-indigo-800/30 space-y-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {language === 'ar' 
                        ? 'شارك هذا الرمز مع ولي أمرك لربط حسابك بحسابه' 
                        : 'Share this code with your parent to link your account'}
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-4 py-2 bg-white dark:bg-white/10 rounded-lg font-mono text-lg tracking-wider text-indigo-600 dark:text-indigo-400 text-center select-all">
                        {user.player_record.registration_number}
                      </code>
                    </div>
                  </div>
                </div>
              )}

              {/* Linked Parent Info */}
              {user?.player_record?.is_linked_to_parent && user.player_record.parent && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {language === 'ar' ? 'حساب ولي الأمر المرتبط' : 'Linked Parent Account'}
                  </h3>
                  <div className="p-4 rounded-xl bg-green-50/50 dark:bg-green-900/10 border border-green-200/50 dark:border-green-800/30 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">{language === 'ar' ? 'الاسم' : 'Name'}</span>
                      <span className="text-sm font-medium text-gray-800 dark:text-white">
                        {`${user.player_record.parent.first_name || ''} ${user.player_record.parent.last_name || ''}`.trim()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">{language === 'ar' ? 'الجوال' : 'Phone'}</span>
                      <span className="text-sm font-medium text-gray-800 dark:text-white dir-ltr">{user.player_record.parent.phone || '--'}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      <span className="text-xs text-green-600 dark:text-green-400">{language === 'ar' ? 'مرتبط' : 'Connected'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        )}

        {/* Parent: Children Registration Codes */}
        {!isSelfPlayer && user?.children_codes?.length > 0 && (
          <GlassCard className="p-6 lg:col-span-2">
            <h2 className="text-lg font-bold text-secondary dark:text-white mb-4">
              {language === 'ar' ? 'رموز تسجيل الأبناء' : 'Children Registration Codes'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {language === 'ar' 
                ? 'شارك رمز التسجيل مع ابنك ليتمكن من إنشاء حسابه الخاص وربطه بحسابك' 
                : 'Share the registration code with your child so they can create their own account and link it to yours'}
            </p>
            <div className="space-y-3">
              {user.children_codes.map(child => (
                <div key={child.id} className={`flex items-center justify-between p-4 rounded-xl border ${
                  child.is_claimed 
                    ? 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10' 
                    : 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200/50 dark:border-indigo-800/30'
                }`}>
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">{child.name}</p>
                    {child.is_claimed ? (
                      <div className="flex items-center gap-1 mt-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span className="text-xs text-green-600 dark:text-green-400">
                          {language === 'ar' ? 'تم ربط الحساب' : 'Account linked'}
                        </span>
                      </div>
                    ) : (
                      <code className="text-sm font-mono tracking-wider text-indigo-600 dark:text-indigo-400 select-all">
                        {child.registration_number}
                      </code>
                    )}
                  </div>
                  {!child.is_claimed && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(child.registration_number)
                        setMessage({ type: 'success', text: language === 'ar' ? 'تم نسخ الرمز' : 'Code copied!' })
                        setTimeout(() => setMessage({ type: '', text: '' }), 2000)
                      }}
                      className="px-3 py-1.5 text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                    >
                      {language === 'ar' ? 'نسخ' : 'Copy'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </GlassCard>
        )}
      </div>
      <DeveloperCreditInline />
    </div>
  )
}
