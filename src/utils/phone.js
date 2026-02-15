export const PHONE_COUNTRY_CODES = [
  { code: '+966', country: 'SA', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: '+971', country: 'AE', flag: '🇦🇪', name: 'UAE' },
  { code: '+973', country: 'BH', flag: '🇧🇭', name: 'Bahrain' },
  { code: '+974', country: 'QA', flag: '🇶🇦', name: 'Qatar' },
  { code: '+968', country: 'OM', flag: '🇴🇲', name: 'Oman' },
  { code: '+965', country: 'KW', flag: '🇰🇼', name: 'Kuwait' },
  { code: '+962', country: 'JO', flag: '🇯🇴', name: 'Jordan' },
  { code: '+90', country: 'TR', flag: '🇹🇷', name: 'Turkey' },
  { code: '+20', country: 'EG', flag: '🇪🇬', name: 'Egypt' },
  { code: '+212', country: 'MA', flag: '🇲🇦', name: 'Morocco' },
  { code: '+963', country: 'SY', flag: '🇸🇾', name: 'Syria' },
  { code: '+964', country: 'IQ', flag: '🇮🇶', name: 'Iraq' },
  { code: '+967', country: 'YE', flag: '🇾🇪', name: 'Yemen' },
  { code: '+961', country: 'LB', flag: '🇱🇧', name: 'Lebanon' },
  { code: '+970', country: 'PS', flag: '🇵🇸', name: 'Palestine' },
  { code: '+1', country: 'US', flag: '🇺🇸', name: 'USA' },
  { code: '+44', country: 'GB', flag: '🇬🇧', name: 'UK' },
]

export const DEFAULT_COUNTRY_CODE = '+966'

/**
 * Convert Eastern Arabic (٠١٢٣٤٥٦٧٨٩) and Extended Arabic-Indic (۰۱۲۳۴۵۶۷۸۹)
 * numerals to Western Arabic numerals (0123456789).
 */
export const normalizeArabicNumerals = (value = '') => {
  return String(value || '')
    .replace(/[٠-٩]/g, (d) => d.charCodeAt(0) - 0x0660)   // Eastern Arabic
    .replace(/[۰-۹]/g, (d) => d.charCodeAt(0) - 0x06F0)   // Extended Arabic-Indic
}

const getDigits = (value = '') => normalizeArabicNumerals(value).replace(/\D/g, '')

const getCodeDigits = (countryCode = DEFAULT_COUNTRY_CODE) => getDigits(countryCode)

const countryCodesByLongestPrefix = [...PHONE_COUNTRY_CODES].sort(
  (a, b) => getCodeDigits(b.code).length - getCodeDigits(a.code).length
)

export const getPhonePlaceholder = (countryCode = DEFAULT_COUNTRY_CODE) =>
  countryCode === '+966' ? '5XXXXXXXX' : 'XXXXXXXXXX'

export const normalizeLocalPhoneInput = (value = '', countryCode = DEFAULT_COUNTRY_CODE) => {
  const digits = getDigits(value)
  if (!digits) return ''

  if (countryCode === '+966') {
    return digits.replace(/^0+/, '').slice(0, 10)
  }

  return digits.slice(0, 15)
}

export const formatPhoneForApi = (localNumber = '', countryCode = DEFAULT_COUNTRY_CODE) => {
  const normalizedLocal = normalizeLocalPhoneInput(localNumber, countryCode).replace(/^0+/, '')
  if (!normalizedLocal) return ''
  return `${countryCode}${normalizedLocal}`
}

export const parsePhoneToCountryAndLocal = (phone = '') => {
  let digits = getDigits(phone)
  if (!digits) {
    return { countryCode: DEFAULT_COUNTRY_CODE, localNumber: '' }
  }

  if (digits.startsWith('00')) {
    digits = digits.slice(2)
  }

  const matchedCountry = countryCodesByLongestPrefix.find((item) =>
    digits.startsWith(getCodeDigits(item.code))
  )

  if (!matchedCountry) {
    return {
      countryCode: DEFAULT_COUNTRY_CODE,
      localNumber: normalizeLocalPhoneInput(digits, DEFAULT_COUNTRY_CODE),
    }
  }

  const codeDigits = getCodeDigits(matchedCountry.code)
  const localDigits = digits.slice(codeDigits.length)

  return {
    countryCode: matchedCountry.code,
    localNumber: normalizeLocalPhoneInput(localDigits, matchedCountry.code),
  }
}

