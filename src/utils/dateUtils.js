/**
 * Date utility functions for Saudi Arabia timezone (UTC+3)
 * These functions ensure consistent date handling without timezone conversion issues
 */

/**
 * Format a Date object to YYYY-MM-DD string without timezone conversion
 * @param {Date} date - The date object to format
 * @returns {string} Date string in YYYY-MM-DD format
 */
export const formatDateString = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Parse a YYYY-MM-DD string to a Date object in local time (no UTC conversion)
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {Date} Date object in local time
 */
export const parseLocalDate = (dateString) => {
  if (!dateString) return new Date()
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Get today's date as YYYY-MM-DD string
 * @returns {string} Today's date in YYYY-MM-DD format
 */
export const getTodayString = () => {
  return formatDateString(new Date())
}

/**
 * Get the day name from a date string
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @param {string} language - Language code ('ar' or 'en')
 * @returns {string} Day name (e.g., 'Wednesday' or 'الأربعاء')
 */
export const getDayName = (dateString, language = 'en') => {
  const date = parseLocalDate(dateString)
  return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'long' })
}

/**
 * Get formatted date display
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @param {string} language - Language code ('ar' or 'en')
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export const formatDateDisplay = (dateString, language = 'en', options = {}) => {
  const date = parseLocalDate(dateString)
  const defaultOptions = { day: 'numeric', month: 'short', year: 'numeric' }
  return date.toLocaleDateString(
    language === 'ar' ? 'ar-SA' : 'en-US',
    { ...defaultOptions, ...options }
  )
}

/**
 * Compare two date strings
 * @param {string} dateA - First date string (YYYY-MM-DD)
 * @param {string} dateB - Second date string (YYYY-MM-DD)
 * @returns {number} -1 if dateA < dateB, 0 if equal, 1 if dateA > dateB
 */
export const compareDates = (dateA, dateB) => {
  if (dateA < dateB) return -1
  if (dateA > dateB) return 1
  return 0
}

/**
 * Check if a date string is today
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {boolean} True if the date is today
 */
export const isToday = (dateString) => {
  return dateString === getTodayString()
}

/**
 * Check if a date string is in the past
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {boolean} True if the date is before today
 */
export const isPast = (dateString) => {
  return dateString < getTodayString()
}

/**
 * Check if a date string is in the future or today
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {boolean} True if the date is today or in the future
 */
export const isFutureOrToday = (dateString) => {
  return dateString >= getTodayString()
}

export default {
  formatDateString,
  parseLocalDate,
  getTodayString,
  getDayName,
  formatDateDisplay,
  compareDates,
  isToday,
  isPast,
  isFutureOrToday
}
