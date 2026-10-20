// Enrolment management
// CES-014: view, list, search and filter enrolments
// CES-015: immutable audit trail
// CES-010: cancel an enrolment (clinician, clinical admin, or back office on someone's behalf)
const svc = require('../lib/service')
const { Errors } = require('../lib/errors')

const PAGE_SIZE = 10
const STATUSES = ['Active', 'Pending', 'Cancelled']

// Reasons are placeholders – the backlog does not list them
const CANCEL_REASONS = [
  'Lorem ipsum reason 1',
  'Lorem ipsum reason 2',
  'Lorem ipsum reason 3',
  'Other'
]

function asArray (value) {
  if (!value) return []
  return [].concat(value).filter(v => v && v !== '_unchecked')
}

function queryString (params) {
  const parts = []
  Object.keys(params).forEach(key => {
    asArray(params[key]).forEach(v => parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(v)))
  })
  return parts.length ? '?' + parts.join('&') : ''
}

function canCancel (data, user, e) {
  if (!e || e.status === 'Cancelled') return false
  if (svc.can(user, 'enrolments:cancelOnBehalf')) return true
  return svc.can(user, 'enrolments:cancel') && e.organisationId === data.auth.organisationId
}

module.exports = function (router) {
  // -------------------------------------------------------------------------
  // CES-014 – list, search, filter, sort, paginate
  // Query parameters start with _ so the kit does not save them in the session.
  // -------------------------------------------------------------------------
  router.get('/enrolments', function (req, res) {
    const data = req.session.data
    const user = svc.currentUser(data)
    const q = (req.query._q || '').trim()
    const statuses = asArray(req.query._status)
    const productIds = asArray(req.query._product)
    const orgIds = asArray(req.query._organisation)
    const sort = req.query._sort || 'created'
    const dir = req.query._dir === 'ascending' ? 'ascending' : 'descending'
    const showOrganisation = svc.can(user, 'enrolments:viewAllOrganisations')

    let results = svc.enrolmentsInScope(data).slice()

    if (q) {
      const digits = q.replace(/\s/g, '')
      results = results.filter(e =>
        e.patientName.toLowerCase().includes(q.toLowerCase()) ||
        (digits && e.nhsNumber.includes(digits)) ||
        e.id.toLowerCase() === q.toLowerCase()
      )
    }
    if (statuses.length) results = results.filter(e => statuses.includes(e.status))
    if (productIds.length) results = results.filter(e => productIds.includes(e.productId))
    if (orgIds.length) results = results.filter(e => orgIds.includes(e.organisationId))

    const sortKeys = {
      patient: e => e.patientName.split(' ').reverse().join(' '),
      product: e => svc.product(data, e.productId).name,
      organisation: e => svc.organisation(data, e.organisationId).name,
      created: e => e.createdAt,
      status: e => e.status
    }
    const key = sortKeys[sort] || sortKeys.created
    results.sort((a, b) => {
      const r = String(key(a)).localeCompare(String(key(b)))
      return dir === 'ascending' ? r : -r
    })

    const total = results.length
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
    const page = Math.min(Math.max(1, Number(req.query._page) || 1), pageCount)
    const pageResults = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    const filterParams = { _q: q, _status: statuses, _product: productIds, _organisation: orgIds }
    const baseParams = Object.assign({}, filterParams, { _sort: sort, _dir: dir })

    // Selected filter tags (MoJ Filter – remove one at a time)
    const selected = []
    statuses.forEach(s => selected.push({
      group: 'Status',
      text: s,
      href: '/enrolments' + queryString(Object.assign({}, baseParams, { _status: statuses.filter(x => x !== s) }))
    }))
    productIds.forEach(id => selected.push({
      group: 'Product',
      text: svc.product(data, id).name,
      href: '/enrolments' + queryString(Object.assign({}, baseParams, { _product: productIds.filter(x => x !== id) }))
    }))
    orgIds.forEach(id => selected.push({
      group: 'Organisation',
      text: svc.organisation(data, id).name,
      href: '/enrolments' + queryString(Object.assign({}, baseParams, { _organisation: orgIds.filter(x => x !== id) }))
    }))

    // Server-side sortable column headers (NHS Table, head.href + sort)
    const sortHeader = (column) => {
      const isCurrent = sort === column
      const nextDir = isCurrent && dir === 'ascending' ? 'descending' : 'ascending'
      return {
        href: '/enrolments' + queryString(Object.assign({}, filterParams, { _sort: column, _dir: nextDir })),
        sort: isCurrent ? dir : 'none'
      }
    }

    // Pagination items
    const pageItems = []
    for (let i = 1; i <= pageCount; i++) {
      pageItems.push({
        number: String(i),
        href: '/enrolments' + queryString(Object.assign({}, baseParams, { _page: String(i) })),
        current: i === page
      })
    }

    res.render('enrolments/index', {
      q,
      statuses,
      productIds,
      orgIds,
      selected,
      showOrganisation,
      allStatuses: STATUSES,
      filterProducts: data.products,
      results: pageResults,
      total,
      page,
      pageCount,
      firstShown: total ? (page - 1) * PAGE_SIZE + 1 : 0,
      lastShown: Math.min(page * PAGE_SIZE, total),
      pageItems,
      previousHref: page > 1 ? '/enrolments' + queryString(Object.assign({}, baseParams, { _page: String(page - 1) })) : null,
      nextHref: page < pageCount ? '/enrolments' + queryString(Object.assign({}, baseParams, { _page: String(page + 1) })) : null,
      sortHeader,
      clearHref: '/enrolments'
    })
  })

  // -------------------------------------------------------------------------
  // Load the enrolment and check access for /enrolments/:id/...
  // -------------------------------------------------------------------------
  router.use('/enrolments/:id', function (req, res, next) {
    const data = req.session.data
    const e = svc.enrolment(data, req.params.id)
    if (!e) return next()
    if (!svc.canAccessEnrolment(data, e)) {
      return res.status(403).render('access-denied')
    }
    const user = svc.currentUser(data)
    res.locals.e = e
    res.locals.eProduct = svc.product(data, e.productId)
    res.locals.eCondition = svc.condition(data, e.productId, e.conditionId)
    res.locals.eOrganisation = svc.organisation(data, e.organisationId)
    res.locals.eClinician = svc.clinician(data, e.clinicianId)
    res.locals.eCanCancel = canCancel(data, user, e)
    res.locals.isBackOffice = svc.can(user, 'enrolments:cancelOnBehalf')
    next()
  })

  // -------------------------------------------------------------------------
  // CES-014 / CES-015 – enrolment record with Details and History tabs
  // -------------------------------------------------------------------------
  router.get('/enrolments/:id', function (req, res, next) {
    if (!res.locals.e) return next()
    const data = req.session.data
    const user = svc.currentUser(data)
    const e = res.locals.e
    const actionFilter = req.query._action || ''

    const history = e.history
      .filter(h => !actionFilter || h.action === actionFilter)
      .map(h => ({
        title: h.action,
        by: h.by,
        role: h.role,
        at: h.at,
        description: [
          h.detail,
          h.organisation && h.role === 'Back office' ? 'Lorem ipsum (on behalf of) ' + svc.organisation(data, h.organisation).name : null
        ].filter(Boolean).join('. ')
      }))

    res.render('enrolments/detail', {
      history,
      actionFilter,
      historyActions: [...new Set(e.history.map(h => h.action))],
      showAuditTable: svc.can(user, 'audit:view')
    })
  })

  // -------------------------------------------------------------------------
  // CES-010 – cancel: reason, then confirm
  // -------------------------------------------------------------------------
  function requireCancellable (req, res, next) {
    if (!res.locals.e) return next('route')
    if (!res.locals.eCanCancel) return res.status(403).render('access-denied')
    next()
  }

  router.get('/enrolments/:id/cancel', requireCancellable, function (req, res) {
    const data = req.session.data
    data.cancel = data.cancel && data.cancel.id === req.params.id ? data.cancel : { id: req.params.id }
    res.render('enrolments/cancel', {
      reasons: CANCEL_REASONS,
      cancel: data.cancel
    })
  })

  router.post('/enrolments/:id/cancel-answer', requireCancellable, function (req, res) {
    const data = req.session.data
    const reason = req.body._reason
    const details = (req.body._details || '').trim()
    data.cancel = { id: req.params.id, reason, details }
    const errors = new Errors()
    if (!reason) {
      errors.add('reason', 'Lorem ipsum dolor sit amet (select a reason)', '#reason')
    } else if (reason === 'Other' && !details) {
      errors.add('details', 'Lorem ipsum dolor sit amet (enter a reason)')
    }
    if (errors.any) {
      errors.save(req)
      return res.redirect(`/enrolments/${req.params.id}/cancel`)
    }
    res.redirect(`/enrolments/${req.params.id}/cancel/confirm`)
  })

  router.get('/enrolments/:id/cancel/confirm', requireCancellable, function (req, res) {
    const data = req.session.data
    if (!data.cancel || data.cancel.id !== req.params.id || !data.cancel.reason) {
      return res.redirect(`/enrolments/${req.params.id}/cancel`)
    }
    res.render('enrolments/cancel-confirm', { cancel: data.cancel })
  })

  router.post('/enrolments/:id/cancel/confirm-answer', requireCancellable, function (req, res) {
    const data = req.session.data
    const user = svc.currentUser(data)
    const e = res.locals.e
    const cancel = data.cancel
    if (!cancel || cancel.id !== e.id) return res.redirect(`/enrolments/${e.id}/cancel`)

    const onBehalf = svc.can(user, 'enrolments:cancelOnBehalf')
    const now = svc.nowIso()
    e.status = 'Cancelled'
    e.cancellation = {
      at: now,
      by: user.name,
      role: data.roles[user.role].label,
      reason: cancel.reason === 'Other' ? cancel.details : cancel.reason,
      details: cancel.reason === 'Other' ? '' : cancel.details,
      onBehalfOf: onBehalf ? e.organisationId : null
    }
    e.history.unshift({
      at: now,
      by: user.name,
      role: data.roles[user.role].label,
      organisation: onBehalf ? e.organisationId : null,
      action: 'Enrolment cancelled',
      detail: e.cancellation.reason
    })
    delete data.cancel
    req.session.success = { text: 'Lorem ipsum dolor sit amet (enrolment cancelled)' }
    res.redirect(`/enrolments/${e.id}`)
  })
}
