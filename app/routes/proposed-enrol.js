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
  router.get('/proposed/enrol/delete', function (req, res) {
    res.render('proposed/enrol/delete')
  })
  router.post('/proposed/enrol/delete-confirmed', function (req, res) {
    // No data mutation: safe prototype-only illustration.
    res.render('proposed/enrol/delete-confirmed')
  })
}
