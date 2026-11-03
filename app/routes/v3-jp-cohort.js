// V3 JP cohort journey: second round of JP's content changes (voice, tone and style guide fixes).
// Same behaviour as routes/proposed-cohort.js, but renders views/v3-jp-cohort-text-changes/cohort
// and keeps its own session data, so it does not affect the /proposed/cohort or /v2-jp/cohort journeys.
// Uses session-only illustrative data; never calls enrolment services.
const BASE = '/v3-jp/cohort'
const VIEWS = 'v3-jp-cohort-text-changes/cohort/'
const { Errors } = require('../lib/errors')

// Dates of birth in the CSV are day-month-year, like 30-01-2001 or 30/01/2001.
// Returns the date written for display (30 January 2001), or null if it is not a real past date.
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
function csvDateOfBirth (value) {
  const m = String(value || '').trim().match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
  if (!m) return null
  const day = Number(m[1]), month = Number(m[2]), year = Number(m[3])
  const d = new Date(year, month - 1, day)
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day || d > new Date()) return null
  return day + ' ' + MONTHS[month - 1] + ' ' + year
}

// File upload error messages, following the GOV.UK file upload component.
// The upload page's script reads the file in the browser and sends one of these codes.
const UPLOAD_ERRORS = {
  missing: 'Select a CSV file',
  type: 'The selected file must be a CSV',
  empty: 'The selected file is empty',
  template: 'The selected file must use the template',
  rows: 'The selected file must have 100 patients or fewer',
  failed: 'The selected file could not be uploaded – try again'
}
module.exports = function (router) {
  // Lets the templates build links to this journey
  router.use(BASE, function (req, res, next) { res.locals.basePath = BASE; next() })
  const patients = {
    priya: { key: 'priya', name: 'Priya Patel', dob: '30 January 2001', nhsNumber: '900 000 0068' },
    amara: { key: 'amara', name: 'Amara Okafor', dob: '14 June 1994', nhsNumber: '900 000 0033' },
    wei: { key: 'wei', name: 'Wei Chen', dob: '12 March 1988', nhsNumber: '900 000 0041' }
  }
  function cohort(req) { return req.session.data.v3jpCohort }
  function show(view, extra) { return function (req, res) { res.render(VIEWS + view, Object.assign({cohort: cohort(req)}, typeof extra === 'function' ? extra(req) : {})) } }
  function guard(req, res, next) { if (!cohort(req)) return res.redirect(BASE + '/new'); next() }
  function counts(req) { const patients = cohort(req).patients || []; return { cohortStats: { total: patients.length, ready: patients.filter(p => !p.issue).length, issues: patients.filter(p => p.issue).length } } }
  router.get(BASE, show('index'))
  router.get(BASE + '/new', show('new'))
  router.post(BASE + '/create', function (req, res) {
    const name = String(req.body.name || '').trim()
    const errors = new Errors()
    if (!name) errors.add('name', 'Enter a name for the cohort', '#cohort-name')
    if (!['copd','asthma'].includes(req.body.condition)) errors.add('condition', 'Select if this cohort is for COPD or asthma', '#condition')
    if (errors.any) { errors.save(req); return res.redirect(BASE + '/new') }
    req.session.data.v3jpCohort = {name, condition:req.body.condition, conditionLabel: req.body.condition === 'copd' ? 'COPD' : 'Asthma', patients:[], status:'Draft'}
    res.redirect(BASE + '/product')
  })
  router.use(BASE, function (req,res,next) { if (req.path === '/' || req.path === '/new' || req.path === '/create') return next(); guard(req,res,next) })
  router.get(BASE + '/product', show('product', req => ({products: req.session.data.v3jpCohort.condition === 'copd'
    ? [{value:'myCOPD',text:'myCOPD'},{value:'DTx product C',text:'DTx product C'}]
    : [{value:'Asthma DTx product A',text:'Asthma DTx product A'},{value:'Asthma DTx product B',text:'Asthma DTx product B'}]})))
  router.post(BASE + '/save-product', function (req,res) {
    const c=cohort(req)
    const allowed=c.condition==='copd' ? ['myCOPD','DTx product C'] : ['Asthma DTx product A','Asthma DTx product B']
    if (!allowed.includes(req.body.product)) {
      new Errors().add('product', 'Select if this cohort is for ' + allowed[0] + ' or ' + allowed[1], '#product').save(req)
      return res.redirect(BASE + '/product')
    }
    c.dtxLabel=req.body.product
    res.redirect(BASE + '/detail')
  })
  router.get(BASE + '/detail', show('detail'))
  router.get(BASE + '/delete', function (req, res) {
    if (cohort(req).status !== 'Draft') return res.redirect(BASE + '/detail')
    res.render(VIEWS + 'delete', { cohort: cohort(req) })
  })
  router.post(BASE + '/delete', function (req, res) {
    if (cohort(req).status !== 'Draft') return res.redirect(BASE + '/detail')
    delete req.session.data.v3jpCohort
    res.redirect(BASE + '?deleted=1')
  })
  router.get(BASE + '/add', show('add'))
  router.get(BASE + '/find', show('find'))
  // Check the search before looking for a patient, so an empty or incomplete search shows an error
  router.get(BASE + '/select', function (req, res, next) {
    const errors = new Errors()
    const nhs = String(req.query.nhsNumber || '').replace(/[\s-]/g, '')
    const familyName = String(req.query.familyName || '').trim()
    const dob = req.query.dob || {}
    const dobParts = ['day', 'month', 'year'].map(k => String(dob[k] || '').trim())
    const dobEntered = dobParts.some(Boolean)
    if (nhs) {
      if (/\D/.test(nhs)) errors.add('nhsNumber', 'NHS number must only include numbers', '#nhs-number')
      else if (nhs.length !== 10) errors.add('nhsNumber', 'NHS number must be 10 digits', '#nhs-number')
    } else if (!familyName && !dobEntered) {
      errors.add('nhsNumber', "Enter the patient's NHS number, or their family name and date of birth", '#nhs-number')
    } else {
      if (!familyName) errors.add('familyName', "Enter the patient's family name", '#family-name')
      if (!dobEntered) errors.add('dob', "Enter the patient's date of birth", '#date-of-birth-day')
      else if (dobParts.some(x => !x)) errors.add('dob', 'Date of birth must include a day, month and year', '#date-of-birth-day')
      else {
        const [day, month, year] = dobParts.map(Number)
        const d = new Date(year, month - 1, day)
        if (!(d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day)) errors.add('dob', 'Date of birth must be a real date', '#date-of-birth-day')
        else if (d > new Date()) errors.add('dob', 'Date of birth must be in the past', '#date-of-birth-day')
      }
    }
    if (errors.any) { errors.save(req); return res.redirect(BASE + '/find') }
    next()
  })
  router.get(BASE + '/select', show('select', req => {
    const q=String(req.query.nhsNumber || '').replace(/\s/g,'')
    const p=Object.values(patients).find(p=>p.nhsNumber.replace(/\s/g,'')===q) ||
      Object.values(patients).find(p=>String(req.query.familyName||'').trim().toLowerCase()===p.name.split(' ').pop().toLowerCase()) ||
      patients.priya
    return {patient:p, duplicate:cohort(req).patients.some(x=>x.key===p.key) || (p.key==='priya' && cohort(req).dtxLabel==='myCOPD')}
  }))
  router.post(BASE + '/add-patient', function(req,res) {
    const c=cohort(req),p=patients[req.body.patient]
    if (p && !c.patients.some(x=>x.key===p.key) && !(p.key==='priya' && c.dtxLabel==='myCOPD')) c.patients.push({...p,issue:null})
    res.redirect(BASE + '/detail')
  })
  const csvColumns = ['nhsNumber','patientGivenName','patientFamilyName','patientDateOfBirth','patientSex','contactEmail','contactPhone','practitionerIdValue','organisationOds','commissionerOds','coverageSiteOds']
  router.get(BASE + '/template.csv', function(req,res) {
    res.type('text/csv').attachment('cohort-patients-template.csv')
    res.send(csvColumns.join(',') + '\n')
  })
  router.get(BASE + '/upload', show('upload', req => ({
    uploadError: UPLOAD_ERRORS[req.query.error] || null
  })))
  router.post(BASE + '/sample-upload', function(req,res) {
    const c = cohort(req)
    if (c.status !== 'Draft') return res.redirect(BASE + '/detail')
    let rows
    try { rows = JSON.parse(req.body.csvRows || 'null') } catch (e) {}
    if (!Array.isArray(rows) || rows.length < 1 || rows.length > 100 || rows.some(r => !r || typeof r !== 'object' || csvColumns.some(col => typeof r[col] !== 'string'))) {
      return res.redirect(BASE + '/upload?error=failed')
    }
    for (const row of rows) {
      const number = row.nhsNumber.replace(/\s/g,'')
      const dobDisplay = csvDateOfBirth(row.patientDateOfBirth)
      const existing = c.patients.some(p => p.nhsNumber.replace(/\s/g,'') === number)
      const matched = Object.values(patients).find(p => p.nhsNumber.replace(/\s/g,'') === number)
      const issue = existing ? 'Already in this cohort' :
        !/^\d{10}$/.test(number) || !row.patientGivenName.trim() || !row.patientFamilyName.trim() || !dobDisplay
          ? 'Check required patient details' :
        (number === '9000000068' && c.dtxLabel === 'myCOPD') ? 'Potential duplicate enrolment' : null
      if (!existing) c.patients.push({
        key: 'csv-' + number, name: (row.patientGivenName + ' ' + row.patientFamilyName).trim(),
        nhsNumber: number.replace(/^(\d{3})(\d{3})(\d{4})$/, '$1 $2 $3'),
        dob: dobDisplay || row.patientDateOfBirth, issue
      })
    }
    res.redirect(BASE + '/detail')
  })
  router.get(BASE + '/review', show('review', counts))
  router.post(BASE + '/submit', function(req,res) {
    const c=cohort(req)
    if (c.status!=='Draft' || !c.patients.some(p=>!p.issue)) return res.redirect(BASE + '/review')
    c.status='Completed'
    res.redirect(BASE + '/outcome')
  })
  router.get(BASE + '/outcome', show('outcome', counts))
}
