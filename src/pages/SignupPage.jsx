import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLanguage } from '../hooks/useLanguage'
import { useAuth } from '../hooks/useAuth'
import GlassCard from '../components/ui/GlassCard'
import Button from '../components/ui/Button'
import PhoneInput from '../components/ui/PhoneInput'
import logoImage from '../assets/images/logo.png'
import { authService, branchesService } from '../services'

export default function SignupPage() {
  const { language } = useLanguage()
  const navigate = useNavigate()
  const { loading, error, clearError } = useAuth()
  
  const [isLoading, setIsLoading] = useState(false)
  const [localError, setLocalError] = useState('')
  
  const [branches, setBranches] = useState([])
  
  const [accountType, setAccountType] = useState('parent') // 'parent' or 'self_player'
  const [hasParent, setHasParent] = useState(null) // null = not chosen, true = has parent code, false = no parent

  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    countryCode: '+966',
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
    branchId: '',
    // Self-player fields (NO parent code flow)
    dateOfBirth: '',
    nationality: '',
    address: '',
    healthNotes: '',
    // Self-player fields (WITH parent code flow)
    existingPlayerCode: '',
    // Upload fields
    avatar: null,
    avatarPreview: null,
    idDocument: null,
    idDocumentPreview: null,
  })

  // Fetch branches on mount
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const response = await branchesService.getPublic()
        if (response.success && response.data) {
          setBranches(response.data.map(b => ({
            id: b.id,
            name: { en: b.name, ar: b.name_ar || b.name }
          })))
        }
      } catch (err) {
        console.error('Error fetching branches:', err)
      }
    }
    fetchBranches()
  }, [])

  // Reset player sub-flow when switching account type
  useEffect(() => {
    if (accountType === 'parent') {
      setHasParent(null)
    }
  }, [accountType])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    setLocalError('')
    clearError()
  }

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setLocalError(language === 'ar' ? 'حجم الصورة يجب أن يكون أقل من 5 ميجابايت' : 'Image size must be less than 5MB')
        return
      }
      if (!file.type.startsWith('image/')) {
        setLocalError(language === 'ar' ? 'يجب أن يكون الملف صورة' : 'File must be an image')
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData({
          ...formData,
          avatar: file,
          avatarPreview: reader.result
        })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleIdDocumentChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setLocalError(language === 'ar' ? 'حجم الملف يجب أن يكون أقل من 10 ميجابايت' : 'File size must be less than 10MB')
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData({
          ...formData,
          idDocument: file,
          idDocumentPreview: reader.result
        })
      }
      reader.readAsDataURL(file)
    }
  }

  // Whether branch field should be shown
  const showBranch = accountType === 'parent' || (accountType === 'self_player' && hasParent === false)

  // Direct signup (no OTP)
  const handleSignup = async (e) => {
    e.preventDefault()
    setLocalError('')
    
    if (!formData.email) {
      setLocalError(language === 'ar' ? 'يرجى إدخال البريد الإلكتروني' : 'Please enter email')
      return
    }

    if (!formData.phone) {
      setLocalError(language === 'ar' ? 'يرجى إدخال رقم الجوال' : 'Please enter phone number')
      return
    }

    if (!formData.firstName || !formData.lastName) {
      setLocalError(language === 'ar' ? 'يرجى إدخال الاسم الكامل' : 'Please enter your full name')
      return
    }

    if (!formData.password || formData.password.length < 8) {
      setLocalError(language === 'ar' ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setLocalError(language === 'ar' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match')
      return
    }

    // Branch required for parent and player-without-parent
    if (showBranch && !formData.branchId) {
      setLocalError(language === 'ar' ? 'يرجى اختيار الفرع' : 'Please select a branch')
      return
    }

    // Self-player validation
    if (accountType === 'self_player') {
      if (hasParent === null) {
        setLocalError(language === 'ar' ? 'يرجى تحديد ما إذا كان لديك ولي أمر مسجل' : 'Please indicate if you have a registered parent')
        return
      }
      if (hasParent === true && !formData.existingPlayerCode.trim()) {
        setLocalError(language === 'ar' ? 'يرجى إدخال رمز التسجيل' : 'Please enter registration code')
        return
      }
      if (hasParent === false) {
        if (!formData.dateOfBirth) {
          setLocalError(language === 'ar' ? 'يرجى إدخال تاريخ الميلاد' : 'Please enter date of birth')
          return
        }
        if (!formData.avatar) {
          setLocalError(language === 'ar' ? 'يرجى رفع صورة شخصية' : 'Please upload a personal photo')
          return
        }
        if (!formData.idDocument) {
          setLocalError(language === 'ar' ? 'يرجى رفع صورة الهوية/جواز السفر' : 'Please upload ID document/passport')
          return
        }
      }
    }

    setIsLoading(true)
    try {
      const fullPhone = formData.countryCode + formData.phone
      
      // Use FormData for file uploads
      const formDataToSend = new FormData()
      formDataToSend.append('email', formData.email)
      formDataToSend.append('phone', fullPhone)
      formDataToSend.append('first_name', formData.firstName)
      formDataToSend.append('last_name', formData.lastName)
      formDataToSend.append('password', formData.password)
      formDataToSend.append('account_type', accountType)

      // Branch for parent or player-without-parent
      if (showBranch) {
        formDataToSend.append('branch_id', formData.branchId)
      }

      // Add self-player fields
      if (accountType === 'self_player') {
        if (hasParent === true) {
          // WITH parent code - minimal fields
          formDataToSend.append('existing_player_code', formData.existingPlayerCode.trim())
        } else {
          // WITHOUT parent code - full fields
          formDataToSend.append('date_of_birth', formData.dateOfBirth)
          if (formData.nationality) formDataToSend.append('nationality', formData.nationality)
          if (formData.address) formDataToSend.append('address', formData.address)
          if (formData.healthNotes) formDataToSend.append('health_notes', formData.healthNotes)
          // Add required uploads
          if (formData.avatar) formDataToSend.append('avatar', formData.avatar)
          if (formData.idDocument) formDataToSend.append('id_document', formData.idDocument)
        }
      }

      const response = await authService.signup(formDataToSend)
      
      if (response.success) {
        navigate('/dashboard')
      } else {
        setLocalError(response.message || (language === 'ar' ? 'فشل إنشاء الحساب' : 'Registration failed'))
      }
    } catch (err) {
      setLocalError(err.message || (language === 'ar' ? 'فشل إنشاء الحساب' : 'Registration failed'))
    } finally {
      setIsLoading(false)
    }
  }

  const displayError = localError || error

  const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"

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
              {language === 'ar' ? 'إنشاء حساب جديد' : 'Create Account'}
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              {language === 'ar' ? 'انضم إلى أكاديمية أسباير' : 'Join ASPIRE Academy'}
            </p>
          </div>

          {/* Error Message */}
          {displayError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
              {displayError}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-5">
            {/* Account Type Toggle */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  {language === 'ar' ? 'نوع الحساب' : 'Account Type'}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAccountType('parent')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      accountType === 'parent'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                    }`}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-sm font-medium">
                      {language === 'ar' ? 'ولي أمر' : 'Parent'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountType('self_player')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      accountType === 'self_player'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                    }`}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-sm font-medium">
                      {language === 'ar' ? 'لاعب' : 'Player'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Common Fields: Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'ar' ? 'الاسم الأول' : 'First Name'} *
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    className={inputClass}
                    placeholder={language === 'ar' ? 'محمد' : 'John'}
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'ar' ? 'اسم العائلة' : 'Last Name'} *
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    className={inputClass}
                    placeholder={language === 'ar' ? 'العلي' : 'Doe'}
                  />
                </div>
              </div>

              {/* Common Fields: Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'ar' ? 'البريد الإلكتروني' : 'Email'} *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className={inputClass}
                  placeholder="example@email.com"
                  dir="ltr"
                />
              </div>

              {/* Common Fields: Phone */}
              <PhoneInput
                label={language === 'ar' ? 'رقم الجوال *' : 'Phone Number *'}
                value={formData.phone}
                onChange={(value) => setFormData({ ...formData, phone: value })}
                countryCode={formData.countryCode}
                onCountryCodeChange={(code) => setFormData({ ...formData, countryCode: code })}
                required
              />

              {/* Common Fields: Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'ar' ? 'كلمة المرور' : 'Password'} *
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={8}
                  className={inputClass}
                  placeholder="••••••••"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {language === 'ar' ? '8 أحرف على الأقل' : 'At least 8 characters'}
                </p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'} *
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  minLength={8}
                  className={inputClass}
                  placeholder="••••••••"
                />
              </div>

              {/* ===== PLAYER: "Do you have a parent registered?" ===== */}
              {accountType === 'self_player' && (
                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {language === 'ar' ? 'هل لديك ولي أمر مسجل؟' : 'Do you have a parent registered?'}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setHasParent(true)}
                      className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        hasParent === true
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                          : 'border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                      }`}
                    >
                      {language === 'ar' ? 'نعم' : 'Yes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setHasParent(false)}
                      className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        hasParent === false
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                          : 'border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                      }`}
                    >
                      {language === 'ar' ? 'لا' : 'No'}
                    </button>
                  </div>

                  {/* YES: Show registration code field */}
                  {hasParent === true && (
                    <div className="p-4 rounded-xl bg-green-50/50 dark:bg-green-900/10 border border-green-200/50 dark:border-green-800/30 space-y-3">
                      <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                        {language === 'ar' ? 'هل سجلك ولي أمرك مسبقاً؟' : 'Already registered by your parent?'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {language === 'ar' 
                          ? 'إذا قام ولي أمرك بتسجيلك مسبقاً، أدخل رمز التسجيل لربط حسابك بملفك الحالي' 
                          : 'If your parent already registered you, enter your registration code to link your account to your existing profile'}
                      </p>
                      <input
                        type="text"
                        name="existingPlayerCode"
                        value={formData.existingPlayerCode}
                        onChange={(e) => setFormData({ ...formData, existingPlayerCode: e.target.value.toUpperCase() })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all font-mono tracking-wider"
                        placeholder="PLR-2026-00001"
                        dir="ltr"
                      />
                    </div>
                  )}

                  {/* NO: Show full registration fields */}
                  {hasParent === false && (
                    <div className="space-y-4 p-4 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200/50 dark:border-blue-800/30">
                      <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                        {language === 'ar' ? 'بيانات التسجيل الإضافية' : 'Additional Registration Details'}
                      </p>

                      <div>
                        <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {language === 'ar' ? 'تاريخ الميلاد' : 'Date of Birth'} *
                        </label>
                        <input
                          type="date"
                          id="dateOfBirth"
                          name="dateOfBirth"
                          value={formData.dateOfBirth}
                          onChange={handleChange}
                          required
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label htmlFor="nationality" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {language === 'ar' ? 'الجنسية' : 'Nationality'}
                        </label>
                        <input
                          type="text"
                          id="nationality"
                          name="nationality"
                          value={formData.nationality}
                          onChange={handleChange}
                          className={inputClass}
                          placeholder={language === 'ar' ? 'أدخل الجنسية' : 'Enter nationality'}
                        />
                      </div>

                      <div>
                        <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {language === 'ar' ? 'العنوان' : 'Address'}
                        </label>
                        <input
                          type="text"
                          id="address"
                          name="address"
                          value={formData.address}
                          onChange={handleChange}
                          className={inputClass}
                          placeholder={language === 'ar' ? 'أدخل العنوان' : 'Enter address'}
                        />
                      </div>

                      <div>
                        <label htmlFor="healthNotes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {language === 'ar' ? 'ملاحظات صحية' : 'Health Notes'}
                        </label>
                        <textarea
                          id="healthNotes"
                          name="healthNotes"
                          value={formData.healthNotes}
                          onChange={handleChange}
                          rows={2}
                          className={inputClass}
                          placeholder={language === 'ar' ? 'أي حساسية أو حالات صحية' : 'Any allergies or health conditions'}
                        />
                      </div>

                      {/* Photo Upload */}
                      <div>
                        <label htmlFor="avatar" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {language === 'ar' ? 'الصورة الشخصية *' : 'Personal Photo *'}
                        </label>
                        <div className="relative">
                          <input
                            type="file"
                            id="avatar"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            className="hidden"
                          />
                          <label
                            htmlFor="avatar"
                            className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-white/10 rounded-xl cursor-pointer hover:border-primary transition-colors bg-white/50 dark:bg-white/5"
                          >
                            {formData.avatarPreview ? (
                              <img
                                src={formData.avatarPreview}
                                alt="Avatar preview"
                                className="w-full h-full object-cover rounded-xl"
                              />
                            ) : (
                              <div className="text-center">
                                <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {language === 'ar' ? 'اضغط لرفع الصورة' : 'Click to upload photo'}
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                  JPG, PNG (max 5MB)
                                </p>
                              </div>
                            )}
                          </label>
                        </div>
                      </div>

                      {/* ID Document Upload */}
                      <div>
                        <label htmlFor="idDocument" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {language === 'ar' ? 'صورة الهوية/جواز السفر *' : 'ID Document/Passport *'}
                        </label>
                        <div className="relative">
                          <input
                            type="file"
                            id="idDocument"
                            accept="image/*,.pdf"
                            onChange={handleIdDocumentChange}
                            className="hidden"
                          />
                          <label
                            htmlFor="idDocument"
                            className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-white/10 rounded-xl cursor-pointer hover:border-primary transition-colors bg-white/50 dark:bg-white/5"
                          >
                            {formData.idDocumentPreview ? (
                              <div className="text-center p-2">
                                {formData.idDocument.type === 'application/pdf' ? (
                                  <div className="flex flex-col items-center">
                                    <svg className="w-8 h-8 text-red-500 mb-2" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                                    </svg>
                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                      {formData.idDocument.name}
                                    </p>
                                  </div>
                                ) : (
                                  <img
                                    src={formData.idDocumentPreview}
                                    alt="ID document preview"
                                    className="max-w-full max-h-24 object-contain rounded"
                                  />
                                )}
                              </div>
                            ) : (
                              <div className="text-center">
                                <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {language === 'ar' ? 'اضغط لرفع الوثيقة' : 'Click to upload document'}
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                  JPG, PNG, PDF (max 10MB)
                                </p>
                              </div>
                            )}
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Branch Selection - shown for parent OR player-without-parent */}
              {showBranch && (
                <div>
                  <label htmlFor="branchId" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'ar' ? 'الفرع' : 'Branch'} *
                  </label>
                  <select
                    id="branchId"
                    name="branchId"
                    value={formData.branchId}
                    onChange={handleChange}
                    required
                    className={inputClass}
                  >
                    <option value="">{language === 'ar' ? 'اختر الفرع' : 'Select branch'}</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name[language]}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading || loading}>
                {isLoading 
                  ? (language === 'ar' ? 'جاري إنشاء الحساب...' : 'Creating Account...') 
                  : (language === 'ar' ? 'إنشاء الحساب' : 'Create Account')
                }
              </Button>
          </form>

          {/* Login Link */}
          <div className="mt-8 text-center">
            <p className="text-gray-600 dark:text-gray-300">
              {language === 'ar' ? 'لديك حساب بالفعل؟' : 'Already have an account?'}{' '}
              <Link 
                to="/login" 
                className="text-primary hover:text-yellow-500 font-semibold transition-colors"
              >
                {language === 'ar' ? 'تسجيل الدخول' : 'Login'}
              </Link>
            </p>
          </div>
        </GlassCard>
      </div>
    </main>
  )
}
