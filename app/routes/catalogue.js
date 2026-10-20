// CES-005 – Configure the DTx product catalogue (technical admin)
// Products, versions, conditions and indications; withdraw a product.
//
// Adding and editing share a draft (data.productDraft):
//   details → conditions (add to a list) → condition (with indications) → check
const svc = require('../lib/service')
const { Errors } = require('../lib/errors')

const KNOWN_PATHWAYS = ['Pathway 1', 'Pathway 2', 'Pathway 3']

function asArray (value) {
  if (!value) return []
  return [].concat(value).filter(v => v !== '_unchecked')
}

module.exports = function (router) {
  router.use('/catalogue', function (req, res, next) {
    res.locals.draft = req.session.data.productDraft || null
    res.locals.knownPathways = KNOWN_PATHWAYS
    next()
  })

  // -------------------------------------------------------------------------
  // Start adding / editing
  // -------------------------------------------------------------------------
  router.get('/catalogue/add/start', function (req, res) {
    req.session.data.productDraft = {
      id: null,
      name: '',
      version: '',
      description: '',
      status: 'Live',
      pathways: [],
      conditions: []
    }
    res.redirect('/catalogue/add/details')
  })

  router.get('/catalogue/:id/edit', function (req, res, next) {
    const p = svc.product(req.session.data, req.params.id)
    if (!p) return next()
    req.session.data.productDraft = structuredClone(p)
    res.redirect('/catalogue/add/check')
  })

  function requireDraft (req, res, next) {
    if (!req.session.data.productDraft) return res.redirect('/catalogue')
    res.locals.draft = req.session.data.productDraft
    next()
  }

  // -------------------------------------------------------------------------
  // Product details
  // -------------------------------------------------------------------------
  router.get('/catalogue/add/details', requireDraft, function (req, res, next) { next() })

  router.post('/catalogue/add/details-answer', requireDraft, function (req, res) {
    const draft = req.session.data.productDraft
    const body = req.body
    draft.name = (body._name || '').trim()
    draft.version = (body._version || '').trim()
    draft.description = (body._description || '').trim()
    draft.status = body._status || 'Live'
    draft.pathways = asArray(body._pathways)

    const errors = new Errors()
    if (!draft.name) errors.add('name', 'Lorem ipsum dolor sit amet (enter the product name)')
    if (!draft.version) errors.add('version', 'Lorem ipsum dolor sit amet (enter the version)')
    if (draft.description.length > 300) errors.add('description', 'Lorem ipsum dolor sit amet (description must be 300 characters or less)')
    if (!draft.pathways.length) errors.add('pathways', 'Lorem ipsum dolor sit amet (select at least one pathway)', '#pathways')
    if (errors.any) {
      errors.save(req)
      return res.redirect('/catalogue/add/details' + (req.query.returnTo === 'check' ? '?returnTo=check' : ''))
    }
    if (req.query.returnTo === 'check' || draft.id) return res.redirect('/catalogue/add/check')
    res.redirect(draft.conditions.length ? '/catalogue/add/conditions' : '/catalogue/add/condition')
  })

  // -------------------------------------------------------------------------
  // Conditions – MoJ "Add to a list"
  // -------------------------------------------------------------------------
  router.get('/catalogue/add/conditions', requireDraft, function (req, res, next) {
    if (!req.session.data.productDraft.conditions.length) return res.redirect('/catalogue/add/condition')
    next()
  })

  router.post('/catalogue/add/conditions-answer', requireDraft, function (req, res) {
    const answer = req.body._addAnother
    if (!answer) {
      const errors = new Errors()
      errors.add('addAnother', 'Lorem ipsum dolor sit amet (select yes if you need to add another condition)', '#addAnother')
      errors.save(req)
      return res.redirect('/catalogue/add/conditions')
    }
    res.redirect(answer === 'yes' ? '/catalogue/add/condition' : '/catalogue/add/check')
  })

  router.get('/catalogue/add/condition', requireDraft, function (req, res) {
    const draft = req.session.data.productDraft
    const index = req.query._index !== undefined ? Number(req.query._index) : null
    const existing = index !== null ? draft.conditions[index] : null
    const pending = req.session.conditionForm
    delete req.session.conditionForm
    const form = pending || {
      name: existing ? existing.name : '',
      indications: existing ? existing.indications.slice() : ['']
    }
    if (!form.indications.length) form.indications = ['']
    res.render('catalogue/add/condition', { index, form })
  })

  router.post('/catalogue/add/condition-answer', requireDraft, function (req, res) {
    const draft = req.session.data.productDraft
    const index = req.body._index !== '' && req.body._index !== undefined ? Number(req.body._index) : null
    const name = (req.body._conditionName || '').trim()
    let indications = asArray(req.body._indications).map(i => i.trim())
    const action = req.body._action || ''
    const backTo = '/catalogue/add/condition' + (index !== null ? '?_index=' + index : '')

    // No-JavaScript add another / remove
    if (action === 'add') {
      req.session.conditionForm = { name, indications: indications.concat(['']) }
      return res.redirect(backTo + '#indications')
    }
    if (action.startsWith('remove-')) {
      const i = Number(action.replace('remove-', ''))
      indications.splice(i, 1)
      req.session.conditionForm = { name, indications }
      return res.redirect(backTo + '#indications')
    }

    indications = indications.filter(Boolean)
    const errors = new Errors()
    if (!name) errors.add('conditionName', 'Lorem ipsum dolor sit amet (enter the condition)')
    if (!indications.length) errors.add('indications', 'Lorem ipsum dolor sit amet (enter at least one indication)', '#indication-0')
    if (errors.any) {
      errors.save(req)
      req.session.conditionForm = { name, indications: indications.length ? indications : [''] }
      return res.redirect(backTo)
    }

    const condition = {
      id: index !== null ? draft.conditions[index].id : (draft.id || 'new') + 'c' + Date.now(),
      name,
      indications
    }
    if (index !== null) {
      draft.conditions[index] = condition
    } else {
      draft.conditions.push(condition)
    }
    res.redirect('/catalogue/add/conditions')
  })

  router.get('/catalogue/add/condition-remove', requireDraft, function (req, res) {
    const draft = req.session.data.productDraft
    const index = Number(req.query._index)
    if (!isNaN(index)) draft.conditions.splice(index, 1)
    res.redirect('/catalogue/add/conditions')
  })

  // -------------------------------------------------------------------------
  // Check answers and save
  // -------------------------------------------------------------------------
  router.get('/catalogue/add/check', requireDraft, function (req, res, next) { next() })

  router.post('/catalogue/add/check-answer', requireDraft, function (req, res) {
    const data = req.session.data
    const draft = data.productDraft
    if (!draft.name || !draft.conditions.length) return res.redirect('/catalogue/add/check')

    if (draft.id) {
      const i = data.products.findIndex(p => p.id === draft.id)
      data.products[i] = draft
      req.session.success = { text: 'Lorem ipsum dolor sit amet (' + draft.name + ' updated)' }
    } else {
      draft.id = svc.nextProductId(data)
      data.products.push(draft)
      req.session.success = { text: 'Lorem ipsum dolor sit amet (' + draft.name + ' added)' }
    }
    const id = draft.id
    delete data.productDraft
    res.redirect('/catalogue/' + id)
  })

  // -------------------------------------------------------------------------
  // Catalogue list and product page
  // -------------------------------------------------------------------------
  router.get('/catalogue', function (req, res) {
    res.render('catalogue/index')
  })

  router.get('/catalogue/:id', function (req, res, next) {
    const p = svc.product(req.session.data, req.params.id)
    if (!p) return next()
    const data = req.session.data
    res.render('catalogue/product', {
      p,
      entitledOrganisations: data.organisations.filter(o => (data.entitlements[o.id] || []).includes(p.id)),
      enrolmentCount: data.enrolments.filter(e => e.productId === p.id && e.status !== 'Cancelled').length
    })
  })

  // Withdraw – NHS Interruption page, confirmation example
  router.get('/catalogue/:id/withdraw', function (req, res, next) {
    const p = svc.product(req.session.data, req.params.id)
    if (!p || p.status !== 'Live') return next()
    res.render('catalogue/withdraw', {
      p,
      enrolmentCount: req.session.data.enrolments.filter(e => e.productId === p.id && e.status !== 'Cancelled').length
    })
  })

  router.post('/catalogue/:id/withdraw-answer', function (req, res, next) {
    const p = svc.product(req.session.data, req.params.id)
    if (!p) return next()
    p.status = 'Withdrawn'
    req.session.success = { text: 'Lorem ipsum dolor sit amet (' + p.name + ' withdrawn)' }
    res.redirect('/catalogue/' + p.id)
  })
}
