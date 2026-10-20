// PROTOTYPE ONLY – settings panel and persona switching. Not part of the service.
const svc = require('../lib/service')

module.exports = function (router) {
  router.post('/prototype/settings', function (req, res) {
    const data = req.session.data
    const body = req.body
    const outages = [].concat(data.settings.outages || []).filter(v => v !== '_unchecked')

    data.settings.pdsUnavailable = outages.includes('pds') ? 'yes' : 'no'
    data.settings.supplierUnavailable = outages.includes('supplier') ? 'yes' : 'no'
    data.settings.bulkScenario = outages.includes('bulkAllValid') ? 'allValid' : 'mixed'
    delete data.settings.outages

    const currentId = data.auth && data.auth.userId
    const persona = body._persona || ''

    if (persona !== (currentId || '')) {
      if (!persona) {
        data.auth = {}
        return res.redirect('/sign-in')
      }
      const user = data.users.find(u => u.id === persona)
      data.auth = {
        userId: user.id,
        organisationId: user.organisationIds[0] || null
      }
      return res.redirect(svc.homeFor(user))
    }

    res.redirect(body._returnTo || '/')
  })

  // Quick links from the prototype index: sign straight in as a persona
  router.get('/prototype/sign-in-as/:userId', function (req, res) {
    const data = req.session.data
    const user = data.users.find(u => u.id === req.params.userId)
    if (!user) return res.redirect('/')
    data.auth = {
      userId: user.id,
      organisationId: user.organisationIds[0] || null
    }
    res.redirect(req.query.next || svc.homeFor(user))
  })

  // Change settings from a link, e.g. /prototype/set?variant=b&pds=yes&next=/enrol/start
  // Used by the Quiver flow-map scenarios and handy for research sessions.
  router.get('/prototype/set', function (req, res) {
    const settings = req.session.data.settings
    if (req.query.variant) settings.enrolVariant = req.query.variant === 'b' ? 'b' : 'a'
    if (req.query.pds) settings.pdsUnavailable = req.query.pds === 'yes' ? 'yes' : 'no'
    if (req.query.supplier) settings.supplierUnavailable = req.query.supplier === 'yes' ? 'yes' : 'no'
    if (req.query.bulk) settings.bulkScenario = req.query.bulk === 'allValid' ? 'allValid' : 'mixed'
    res.redirect(req.query.next || '/')
  })
}
