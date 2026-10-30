// Prototype-only comparison page for interaction design review.
// Existing service journeys remain unchanged.
module.exports = function (router) {
  router.get('/versions', function (req, res) {
    res.render('versions')
  })
}
