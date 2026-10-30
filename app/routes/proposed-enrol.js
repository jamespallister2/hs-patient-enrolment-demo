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
}
