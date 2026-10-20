// Sign in, organisation scope and access control
// CES-001 / CES-002: CIS2 for clinical and organisational users, Cognito for admin/technical users
// CES-003: access scoped to organisation, switch between associated organisations
// CES-004: role-based access – hide what a role cannot use
const svc = require('../lib/service')
const { Errors } = require('../lib/errors')

// Which permission each area of the service needs
const AREA_PERMISSIONS = [
  { path: '/enrolments', permission: 'enrolments:view' },
  { path: '/enrol', permission: 'enrolments:create' },
  { path: '/bulk', permission: 'bulk:upload' },
  { path: '/catalogue', permission: 'catalogue:manage' }
]

module.exports = function (router) {
  // -------------------------------------------------------------------------
  // Guards – must be signed in, and have permission for the area
  // -------------------------------------------------------------------------
  AREA_PERMISSIONS.forEach(function (area) {
    router.use(area.path, function (req, res, next) {
      const user = svc.currentUser(req.session.data)
      if (!user) {
        return res.redirect('/sign-in')
      }
      if (!svc.can(user, area.permission)) {
        return res.status(403).render('access-denied')
      }
      next()
    })
  })

  // Service home – send each role to the right place
  router.get('/home', function (req, res) {
    res.redirect(svc.homeFor(svc.currentUser(req.session.data)))
  })

  // -------------------------------------------------------------------------
  // CIS2 (simulated) – CES-002
  // -------------------------------------------------------------------------
  router.post('/sign-in/cis2-answer', function (req, res) {
    const data = req.session.data
    const user = data.users.find(u => u.id === req.body._cis2User && u.authMethod === 'cis2')
    if (!user) {
      return res.redirect('/sign-in/cis2')
    }
    data.auth = { userId: user.id, organisationId: null }

    if (user.organisationIds.length > 1) {
      return res.redirect('/sign-in/select-organisation')
    }
    data.auth.organisationId = user.organisationIds[0]
    res.redirect(svc.homeFor(user))
  })

  // -------------------------------------------------------------------------
  // Cognito sign in – admin and technical users – CES-002
  // -------------------------------------------------------------------------
  router.post('/sign-in/admin-answer', function (req, res) {
    const data = req.session.data
    const email = (data.adminSignIn && data.adminSignIn.email || '').trim()
    const password = req.body._password || ''
    const errors = new Errors()

    // Email address errors follow the GOV.UK email address pattern
    if (!email) {
      errors.add('email', 'Lorem ipsum dolor sit amet (email address missing)')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.add('email', 'Enter an email address in the correct format, like name@example.com')
    }
    if (!password) {
      errors.add('password', 'Lorem ipsum dolor sit amet (password missing)')
    }

    if (!errors.any) {
      const user = data.users.find(u => u.authMethod === 'cognito' && u.email === email.toLowerCase())
      if (!user) {
        // Do not say which of the two was wrong
        errors.add('email', 'Lorem ipsum dolor sit amet (email or password not recognised)')
      } else {
        data.auth = { userId: user.id, organisationId: null }
        delete data.adminSignIn
        return res.redirect(svc.homeFor(user))
      }
    }

    errors.save(req)
    res.redirect('/sign-in/admin')
  })

  // -------------------------------------------------------------------------
  // Select / change organisation – CES-003
  // -------------------------------------------------------------------------
  router.get('/sign-in/select-organisation', function (req, res, next) {
    const user = svc.currentUser(req.session.data)
    if (!user) return res.redirect('/sign-in')
    res.locals.userOrganisations = user.organisationIds.map(id => svc.organisation(req.session.data, id))
    next()
  })

  router.post('/sign-in/select-organisation-answer', function (req, res) {
    const data = req.session.data
    const user = svc.currentUser(data)
    if (!user) return res.redirect('/sign-in')
    const chosen = req.body._organisationId

    if (!chosen || !user.organisationIds.includes(chosen)) {
      const errors = new Errors()
      errors.add('organisationId', 'Lorem ipsum dolor sit amet (select an organisation)', '#organisationId')
      errors.save(req)
      return res.redirect('/sign-in/select-organisation' + (req.body._change ? '?change=yes' : ''))
    }

    const changed = data.auth.organisationId && data.auth.organisationId !== chosen
    data.auth.organisationId = chosen
    // Clear any half-finished enrolment, it belongs to the old organisation
    if (changed) {
      delete data.enrol
      req.session.success = { text: 'Lorem ipsum dolor sit amet (organisation changed)' }
    }
    res.redirect(svc.homeFor(user))
  })

  // -------------------------------------------------------------------------
  // Sign out
  // -------------------------------------------------------------------------
  router.post('/sign-out', function (req, res) {
    req.session.data.auth = {}
    delete req.session.data.enrol
    res.redirect('/signed-out')
  })
  router.get('/sign-out', function (req, res) {
    req.session.data.auth = {}
    delete req.session.data.enrol
    res.redirect('/signed-out')
  })

  router.get('/signed-out', function (req, res, next) {
    req.session.data.auth = {}
    next()
  })
}
