import { normalizeArabicNumerals } from '../../utils/phone'

/**
 * Drop-in replacement for <input type="number"> that accepts
 * Eastern Arabic numerals (٠١٢٣٤٥٦٧٨٩) and Extended Arabic-Indic (۰۱۲۳۴۵۶۷۸۹).
 *
 * It uses type="text" + inputMode="decimal" so mobile keyboards show a number pad
 * while still allowing Arabic numeral entry. Values are normalized to Western digits
 * automatically.
 *
 * Props are the same as a regular <input>, plus:
 *   - integer: if true, only allow integer values (no decimal point)
 */
export default function NumericInput({ onChange, integer = false, ...props }) {
  const handleChange = (e) => {
    const raw = normalizeArabicNumerals(e.target.value)
    // Allow only digits, optional decimal point (unless integer mode), and optional leading minus
    const pattern = integer ? /[^0-9-]/g : /[^0-9.\-]/g
    const cleaned = raw.replace(pattern, '')
    // Create a synthetic-like event so parent handlers work unchanged
    const syntheticEvent = {
      ...e,
      target: { ...e.target, value: cleaned, name: e.target.name },
    }
    onChange?.(syntheticEvent)
  }

  // Remove type="number" specific props that don't apply to text inputs
  const { type, ...rest } = props

  return (
    <input
      {...rest}
      type="text"
      inputMode={integer ? 'numeric' : 'decimal'}
      onChange={handleChange}
    />
  )
}
