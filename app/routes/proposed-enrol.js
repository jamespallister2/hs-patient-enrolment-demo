// Interaction design proposals: isolated preview URLs, original routes unchanged.
module.exports = function (router) {
  router.get('/proposed/enrol/nhs-number', function (req, res) {
    res.render('proposed/enrol/nhs-number')
  })
  router.get('/proposed/enrol/no-match', function (req, res) {
    const enrol = (req.session && req.session.data && req.session.data.enrol) || {}
    res.locals.enrol = Object.assign({ nhsNumber: '9000000009' }, enrol)
    res.render('proposed/enrol/no-match')
  })
  router.get('/proposed/enrol/details-rejected', function (req, res) {
    res.render('proposed/enrol/details-rejected')
  })
  // Mock outcomes only: neither route submits or modifies enrolments.
  function showStatusComparison (req, res, isConfirmation) {
    const outcome = req.query.outcome === 'rejected' ? 'rejected' : 'accepted'
    res.render('proposed/enrol/status-comparison', {
      outcome,
      isConfirmation,
      patientName: outcome === 'accepted' ? 'Priya Patel' : 'Amara Okafor',
      nhsNumber: outcome === 'accepted' ? '900 000 0068' : '900 000 0033'
    })
  }
  router.get('/proposed/enrol/submission-result', function (req, res) {
    showStatusComparison(req, res, true)
  })
  router.get('/proposed/enrol/view-details', function (req, res) {
    showStatusComparison(req, res, false)
  })
  router.get('/proposed/enrol/patient', function (req, res) {
    const patients = {
      priya: { name: 'Priya Patel', number: '900 000 0068' },
      amara: { name: 'Amara Okafor', number: '900 000 0033' },
      wei: { name: 'Wei Chen', number: '900 000 0041' }
    }
    const patientKey = ['amara', 'wei'].includes(req.query.patient) ? req.query.patient : 'priya'
    res.render('proposed/enrol/patient', { patientName: patients[patientKey].name, nhsNumber: patients[patientKey].number, patientKey })
  })
  router.get('/proposed/enrol/patient-dtx/:id', function (req, res, next) {
    const records = {
      mycopd: { name: 'myCOPD', condition: 'COPD', processing: 'Completed', outcome: 'Accepted', submitted: '30 October 2026, 08:20', updated: '30 October 2026, 08:21', clinician: 'Dr Tom Hughes', reference: 'DEMO-001', historyEvent: 'Enrolment accepted' },
      'product-b': { name: 'DTx product B', condition: 'Example condition', processing: 'Completed', outcome: 'Rejected', reason: 'An enrolment with this originating system reference already exists.', submitted: '29 October 2026, 09:10', updated: '29 October 2026, 09:11', clinician: 'Dr Tom Hughes', reference: 'DEMO-002', historyEvent: 'Enrolment rejected' },
      'product-c': { name: 'DTx product C', condition: 'Example condition', processing: 'Processing', outcome: 'Awaiting outcome', submitted: '30 October 2026, 08:30', updated: '30 October 2026, 08:30', clinician: 'Dr Tom Hughes', reference: 'DEMO-003', historyEvent: 'Awaiting supplier outcome' }
    }
    const dtx = records[req.params.id]
    if (!dtx) return next()
    res.render('proposed/enrol/patient-dtx', { dtx })
  })
  router.get('/proposed/enrol/flow', function (req, res) {
    res.render('proposed/enrol/flow-home')
  })
  router.get('/proposed/enrol/flow/find', function (req, res) {
    res.render('proposed/enrol/flow-find', { method: req.query.method === 'details' ? 'details' : 'nhs' })
  })
  router.get('/proposed/enrol/flow/select', function (req, res) {
    res.render('proposed/enrol/flow-select')
  })
  router.get('/proposed/enrol/flow/choose', function (req, res) {
    res.render('proposed/enrol/flow-choose')
  })
  router.get('/proposed/enrol/flow/confirm', function (req, res) {
    // Demo only: no enrolment data is submitted.
    res.render('proposed/enrol/flow-confirm')
  })
  router.get('/proposed/enrol/flow/review', function (req, res) {
    res.render('proposed/enrol/flow-review', { duplicate: req.query.dtx === 'mycopd' })
  })
  router.get('/proposed/enrol/existing-enrolments', function (req, res) {
    res.render('proposed/enrol/existing-enrolments')
  })
  router.get('/proposed/enrol/delete', function (req, res) {
    res.render('proposed/enrol/delete')
  })
  router.post('/proposed/enrol/delete-confirmed', function (req, res) {
    // No data mutation: safe prototype-only illustration.
    res.render('proposed/enrol/delete-confirmed')
  })
}
