import { useState } from 'react'
import { PHONE_COUNTRY_CODES, getPhonePlaceholder, normalizeLocalPhoneInput } from '../../utils/phone'

export default function PhoneInput({ 
  value, 
  onChange, 
  countryCode, 
  onCountryCodeChange,
  label,
  required = true,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false)
  
  const selectedCountry = PHONE_COUNTRY_CODES.find(c => c.code === countryCode) || PHONE_COUNTRY_CODES[0]

  const handleCountrySelect = (country) => {
    onCountryCodeChange(country.code)
    setIsOpen(false)
  }

  return (
    <div className={`w-full ${className}`.trim()}>
      {label && (
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}
      <div className="relative flex w-full">
        {/* Country Code Selector */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-3 py-3 rounded-l-xl rtl:rounded-l-none rtl:rounded-r-xl border border-r-0 rtl:border-r rtl:border-l-0 border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-all h-full"
          >
            <span className="text-lg">{selectedCountry.flag}</span>
            <span className="text-sm font-semibold">{selectedCountry.code}</span>
            <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown */}
          {isOpen && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setIsOpen(false)}
              />
              <div className="absolute top-full left-0 rtl:left-auto rtl:right-0 mt-1 w-56 max-h-60 overflow-y-auto bg-white/95 dark:bg-secondary/95 backdrop-blur-xl rounded-xl shadow-2xl z-20 border border-gray-200 dark:border-white/20">
                {PHONE_COUNTRY_CODES.map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => handleCountrySelect(country)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left rtl:text-right hover:bg-primary/20 transition-colors ${
                      country.code === countryCode ? 'bg-primary/30 text-primary font-bold' : 'text-gray-800 dark:text-white'
                    }`}
                  >
                    <span className="text-lg">{country.flag}</span>
                    <span className="text-sm font-semibold">{country.code}</span>
                    <span className="text-xs text-gray-600 dark:text-gray-300">{country.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Phone Number Input */}
        <input
          type="tel"
          value={value}
          onChange={(e) => onChange(normalizeLocalPhoneInput(e.target.value, countryCode))}
          required={required}
          maxLength={countryCode === '+966' ? 9 : 15}
          className="flex-1 min-w-0 px-4 py-3 rounded-r-xl rtl:rounded-r-none rtl:rounded-l-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          placeholder={getPhonePlaceholder(countryCode)}
          dir="ltr"
        />
      </div>
    </div>
  )
}

