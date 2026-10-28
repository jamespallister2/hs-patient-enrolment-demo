// Interaction design proposals: isolated preview URLs, original routes unchanged.
module.exports = function (router) {
  router.get('/proposed/enrol/nhs-number', function (req, res) {
    res.render('proposed/enrol/nhs-number')
  })
}
