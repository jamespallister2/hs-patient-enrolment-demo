/**
 * Custom Nunjucks filters for this prototype
 *
 * @param {Environment} env
 */
module.exports = function (env) {
  const filters = {}

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December']

  // '2026-10-20' or ISO date-time → '20 October 2026'
  filters.appDate = function (value) {
    if (!value) return ''
    const d = new Date(value)
    if (isNaN(d)) return value
    return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`
  }

  // ISO date-time → '20 October 2026 at 2:05pm' (UK time)
  filters.appDateTime = function (value) {
    if (!value) return ''
    const d = new Date(value)
    if (isNaN(d)) return value
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).formatToParts(d)
    const get = (type) => (parts.find(p => p.type === type) || {}).value
    const period = (get('dayPeriod') || '').toLowerCase().replace(/\s/g, '')
    return `${get('day')} ${get('month')} ${get('year')} at ${get('hour')}:${get('minute')}${period}`
  }

  // Date input object { day, month, year } → ISO date or ''
  filters.dateInputToIso = function (value) {
    if (!value || !value.day || !value.month || !value.year) return ''
    return `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`
  }

  // Tag colours for statuses (NHS tag component colours)
  const statusColours = {
    Active: 'green',
    Live: 'green',
    Enrolled: 'green',
    Valid: 'green',
    Complete: 'green',
    Pending: 'yellow',
    Processing: 'blue',
    'Partially failed': 'orange',
    Cancelled: 'grey',
    Withdrawn: 'grey',
    Failed: 'red',
    Error: 'red',
    Duplicate: 'orange',
    'No PDS match': 'purple'
  }
  filters.statusColour = function (status) {
    return statusColours[status] || 'grey'
  }

  // Pick a list of keys from an array of objects
  filters.pluck = function (array, key) {
    return (array || []).map(item => item[key])
  }

  return filters
}

/**
 * @import { Environment } from 'nunjucks'
 */
