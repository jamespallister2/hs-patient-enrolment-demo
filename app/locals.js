const svc = require('./lib/service')

module.exports = function (req, res, next) {
  const data = req.session.data

  // Copy default data into this session (see app/lib/service.js)
  svc.ensureSessionData(data)

  // One-request errors (set by routes, shown on the page they redirect to)
  if (req.session.errors) {
    res.locals.errors = req.session.errors
    res.locals.errorList = Object.values(req.session.errors)
    delete req.session.errors
  }

  // One-request success banner
  if (req.session.success) {
    res.locals.success = req.session.success
    delete req.session.success
  }

  const user = svc.currentUser(data)
  res.locals.user = user
  res.locals.currentOrganisation = svc.currentOrganisation(data)
  res.locals.svc = svc
  res.locals.can = (permission) => svc.can(user, permission)
  res.locals.roleLabel = user ? data.roles[user.role].label : null

  // Unseen bulk outcomes for the notification badge (CES-013)
  res.locals.unseenBatchCount = user && svc.can(user, 'bulk:upload')
    ? data.batches.filter(b => b.organisationId === data.auth.organisationId && !b.seen && b.status !== 'Processing').length
    : 0

  res.locals.currentPath = req.path
  res.locals.query = req.query

  // Persona options for the prototype settings panel
  res.locals.personaItems = (users, current) => users.map(u => ({
    value: u.id,
    text: `${u.name} – ${data.roles[u.role].label}` +
      (u.organisationIds.length > 1 ? ' (2 organisations)' : '') +
      (u.authMethod === 'cognito' ? ' (admin sign in)' : ''),
    selected: !!current && current.id === u.id
  }))

  next()
}
