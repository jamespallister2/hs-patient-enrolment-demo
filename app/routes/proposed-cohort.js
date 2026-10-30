// Proposed V2 cohort journey. Uses session-only illustrative data; never calls enrolment services.
module.exports = function (router) {
  const patients = {
    priya: { key: 'priya', name: 'Priya Patel', dob: '30 January 2001', nhsNumber: '900 000 0068' },
    amara: { key: 'amara', name: 'Amara Okafor', dob: '14 June 1994', nhsNumber: '900 000 0033' },
    wei: { key: 'wei', name: 'Wei Chen', dob: '12 March 1988', nhsNumber: '900 000 0041' }
  }
  function cohort(req) { return req.session.data.proposedCohort }
  function show(view, extra) { return function (req, res) { res.render('proposed/cohort/' + view, Object.assign({cohort: cohort(req)}, typeof extra === 'function' ? extra(req) : {})) } }
  function guard(req, res, next) { if (!cohort(req)) return res.redirect('/proposed/cohort/new'); next() }
  function counts(req) { const patients = cohort(req).patients || []; return { cohortStats: { total: patients.length, ready: patients.filter(p => !p.issue).length, issues: patients.filter(p => p.issue).length } } }
  router.get('/proposed/cohort', show('index'))
  router.get('/proposed/cohort/new', show('new'))
  router.post('/proposed/cohort/create', function (req, res) {
    const name = String(req.body.name || '').trim()
    if (!name || !['copd','asthma'].includes(req.body.condition)) return res.redirect('/proposed/cohort/new')
    req.session.data.proposedCohort = {name, condition:req.body.condition, conditionLabel: req.body.condition === 'copd' ? 'COPD' : 'Asthma', patients:[], status:'Draft'}
    res.redirect('/proposed/cohort/product')
  })
  router.use('/proposed/cohort', function (req,res,next) { if (req.path === '/' || req.path === '/new' || req.path === '/create') return next(); guard(req,res,next) })
  router.get('/proposed/cohort/product', show('product', req => ({products: req.session.data.proposedCohort.condition === 'copd'
    ? [{value:'myCOPD',text:'myCOPD'},{value:'DTx product C',text:'DTx product C'}]
    : [{value:'Asthma DTx product A',text:'Asthma DTx product A'},{value:'Asthma DTx product B',text:'Asthma DTx product B'}]})))
  router.post('/proposed/cohort/save-product', function (req,res) {
    const c=cohort(req)
    const allowed=c.condition==='copd' ? ['myCOPD','DTx product C'] : ['Asthma DTx product A','Asthma DTx product B']
    if (!allowed.includes(req.body.product)) return res.redirect('/proposed/cohort/product')
    c.dtxLabel=req.body.product
    res.redirect('/proposed/cohort/detail')
  })
  router.get('/proposed/cohort/detail', show('detail'))
  router.get('/proposed/cohort/add', show('add'))
  router.get('/proposed/cohort/find', show('find'))
  router.get('/proposed/cohort/select', show('select', req => {
    const q=String(req.query.nhsNumber || '').replace(/\s/g,'')
    const p=Object.values(patients).find(p=>p.nhsNumber.replace(/\s/g,'')===q) ||
      Object.values(patients).find(p=>String(req.query.familyName||'').trim().toLowerCase()===p.name.split(' ').pop().toLowerCase()) ||
      patients.priya
    return {patient:p, duplicate:cohort(req).patients.some(x=>x.key===p.key) || (p.key==='priya' && cohort(req).dtxLabel==='myCOPD')}
  }))
  router.post('/proposed/cohort/add-patient', function(req,res) {
    const c=cohort(req),p=patients[req.body.patient]
    if (p && !c.patients.some(x=>x.key===p.key) && !(p.key==='priya' && c.dtxLabel==='myCOPD')) c.patients.push({...p,issue:null})
    res.redirect('/proposed/cohort/detail')
  })
  router.get('/proposed/cohort/upload', show('upload', req => ({ uploadError: req.query.error === 'missing' })))
  router.post('/proposed/cohort/sample-upload', function(req,res) {
    if (req.query.selected !== 'yes') return res.redirect('/proposed/cohort/upload?error=missing')
    const c=cohort(req)
    for (const p of [patients.amara,patients.wei,patients.priya]) {
      if (!c.patients.some(x=>x.key===p.key)) c.patients.push({...p, issue:p.key==='priya' && c.dtxLabel==='myCOPD' ? 'Potential duplicate enrolment' : null})
    }
    res.redirect('/proposed/cohort/detail')
  })
  router.get('/proposed/cohort/review', show('review', counts))
  router.post('/proposed/cohort/submit', function(req,res) {
    const c=cohort(req)
    if (c.status!=='Draft' || !c.patients.some(p=>!p.issue)) return res.redirect('/proposed/cohort/review')
    c.status='Completed'
    res.redirect('/proposed/cohort/outcome')
  })
  router.get('/proposed/cohort/outcome', show('outcome', counts))
}
