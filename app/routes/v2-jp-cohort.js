// V2 JP cohort journey: copy of the proposed cohort journey with JP's content changes.
// Same behaviour as routes/proposed-cohort.js, but renders views/v2-jp-cohort-text-changes/cohort
// and keeps its own session data, so it does not affect the original /proposed/cohort journey.
// Uses session-only illustrative data; never calls enrolment services.
const BASE = '/v2-jp/cohort'
const VIEWS = 'v2-jp-cohort-text-changes/cohort/'
module.exports = function (router) {
  // Lets the templates build links to this journey
  router.use(BASE, function (req, res, next) { res.locals.basePath = BASE; next() })
  const patients = {
    priya: { key: 'priya', name: 'Priya Patel', dob: '30 January 2001', nhsNumber: '900 000 0068' },
    amara: { key: 'amara', name: 'Amara Okafor', dob: '14 June 1994', nhsNumber: '900 000 0033' },
    wei: { key: 'wei', name: 'Wei Chen', dob: '12 March 1988', nhsNumber: '900 000 0041' }
  }
  function cohort(req) { return req.session.data.v2jpCohort }
  function show(view, extra) { return function (req, res) { res.render(VIEWS + view, Object.assign({cohort: cohort(req)}, typeof extra === 'function' ? extra(req) : {})) } }
  function guard(req, res, next) { if (!cohort(req)) return res.redirect(BASE + '/new'); next() }
  function counts(req) { const patients = cohort(req).patients || []; return { cohortStats: { total: patients.length, ready: patients.filter(p => !p.issue).length, issues: patients.filter(p => p.issue).length } } }
  router.get(BASE, show('index'))
  router.get(BASE + '/new', show('new'))
  router.post(BASE + '/create', function (req, res) {
    const name = String(req.body.name || '').trim()
    if (!name || !['copd','asthma'].includes(req.body.condition)) return res.redirect(BASE + '/new')
    req.session.data.v2jpCohort = {name, condition:req.body.condition, conditionLabel: req.body.condition === 'copd' ? 'COPD' : 'Asthma', patients:[], status:'Draft'}
    res.redirect(BASE + '/product')
  })
  router.use(BASE, function (req,res,next) { if (req.path === '/' || req.path === '/new' || req.path === '/create') return next(); guard(req,res,next) })
  router.get(BASE + '/product', show('product', req => ({products: req.session.data.v2jpCohort.condition === 'copd'
    ? [{value:'myCOPD',text:'myCOPD'},{value:'DTx product C',text:'DTx product C'}]
    : [{value:'Asthma DTx product A',text:'Asthma DTx product A'},{value:'Asthma DTx product B',text:'Asthma DTx product B'}]})))
  router.post(BASE + '/save-product', function (req,res) {
    const c=cohort(req)
    const allowed=c.condition==='copd' ? ['myCOPD','DTx product C'] : ['Asthma DTx product A','Asthma DTx product B']
    if (!allowed.includes(req.body.product)) return res.redirect(BASE + '/product')
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
    delete req.session.data.v2jpCohort
    res.redirect(BASE + '?deleted=1')
  })
  router.get(BASE + '/add', show('add'))
  router.get(BASE + '/find', show('find'))
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
    uploadError: req.query.error === 'missing' ? 'Select a CSV file' : req.query.error === 'invalid' ? 'Choose a valid CSV file using the template' : null
  })))
  router.post(BASE + '/sample-upload', function(req,res) {
    const c = cohort(req)
    if (c.status !== 'Draft') return res.redirect(BASE + '/detail')
    let rows
    try { rows = JSON.parse(req.body.csvRows || 'null') } catch (e) {}
    if (!Array.isArray(rows) || rows.length < 1 || rows.length > 100 || rows.some(r => !r || typeof r !== 'object' || csvColumns.some(col => typeof r[col] !== 'string'))) {
      return res.redirect(BASE + '/upload?error=invalid')
    }
    for (const row of rows) {
      const number = row.nhsNumber.replace(/\s/g,'')
      const existing = c.patients.some(p => p.nhsNumber.replace(/\s/g,'') === number)
      const matched = Object.values(patients).find(p => p.nhsNumber.replace(/\s/g,'') === number)
      const issue = existing ? 'Already in this cohort' :
        !/^\d{10}$/.test(number) || !row.patientGivenName.trim() || !row.patientFamilyName.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(row.patientDateOfBirth)
          ? 'Check required patient details' :
        (number === '9000000068' && c.dtxLabel === 'myCOPD') ? 'Potential duplicate enrolment' : null
      if (!existing) c.patients.push({
        key: 'csv-' + number, name: (row.patientGivenName + ' ' + row.patientFamilyName).trim(),
        nhsNumber: number.replace(/^(\d{3})(\d{3})(\d{4})$/, '$1 $2 $3'),
        dob: row.patientDateOfBirth, issue
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
