// NHS number helpers (prototype only)
// Validation follows the NHS "Ask for NHS numbers" pattern:
// allow spaces and other characters, then check digits, length and checksum.
// https://service-manual.nhs.uk/design-system/patterns/ask-for-nhs-numbers

function digitsOnly (value) {
  return String(value || '').replace(/[\s-]/g, '')
}

function checkDigit (firstNine) {
  let total = 0
  for (let i = 0; i < 9; i++) {
    total += Number(firstNine[i]) * (10 - i)
  }
  const remainder = 11 - (total % 11)
  if (remainder === 11) return 0
  if (remainder === 10) return null // invalid – no NHS number can end this way
  return remainder
}

function isValidChecksum (tenDigits) {
  const expected = checkDigit(tenDigits.slice(0, 9))
  return expected !== null && expected === Number(tenDigits[9])
}

// Returns { value, error } where error is one of:
// 'empty' | 'letters' | 'tooShort' | 'tooLong' | 'invalid' | null
function validate (raw) {
  const value = digitsOnly(raw)
  if (!value) return { value, error: 'empty' }
  if (/[^0-9]/.test(value)) return { value, error: 'letters' }
  if (value.length < 10) return { value, error: 'tooShort' }
  if (value.length > 10) return { value, error: 'tooLong' }
  if (!isValidChecksum(value)) return { value, error: 'invalid' }
  return { value, error: null }
}

// Make a valid test NHS number in the 999 range from a 6 digit seed
function make (seed) {
  let n = Number(seed)
  for (;;) {
    const firstNine = '999' + String(n).padStart(6, '0')
    const cd = checkDigit(firstNine)
    if (cd !== null) return firstNine + cd
    n++
  }
}

module.exports = { validate, make, digitsOnly, isValidChecksum }
