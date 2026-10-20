// Single patient enrolment
// CES-007 / CES-008: find and verify a patient by NHS number via PDS
// CES-009: create a single patient enrolment
//
// Two variants of the CES-009 journey, switchable from the prototype settings panel:
//   A – task list ("Complete multiple tasks")      /enrol/a/...
//   B – one question per page, then check answers  /enrol/b/...
const svc = require('../lib/service')
const nhsNumber = require('../lib/nhs-number')
const { Errors } = require('../lib/errors')

// Questions in CES-009, in order. `field` is the key in data.enrol.
const QUESTIONS = {
  organisation: { field: 'organisationId', error: 'Lorem ipsum dolor sit amet (select the accountable clinical organisation)' },
  clinician: { field: 'clinicianId', error: 'Lorem ipsum dolor sit amet (enter the authorising clinician)' },
  product: { field: 'productId', error: 'Lorem ipsum dolor sit amet (select a product)' },
  condition: { field: 'conditionId', error: 'Lorem ipsum dolor sit amet (select a condition)' },
  indication: { field: 'indication', error: 'Lorem ipsum dolor sit amet (select an indication)' },
  pathway: { field: 'pathway', error: 'Lorem ipsum dolor sit amet (select a pathway)' },
  'start-date': { field: 'startDate', error: null } // optional – field to be confirmed
}

// Linear order (variant B)
const ORDER_B = ['organisation', 'clinician', 'product', 'condition', 'indication', 'pathway', 'start-date']

// Task list groupings (variant A)
const TASKS_A = [
  { id: 'organisation', questions: ['organisation', 'clinician'] },
  { id: 'product', questions: ['product', 'condition', 'indication'] },
  { id: 'pathway', questions: ['pathway', 'start-date'] }
]

// Changing an earlier answer clears answers that depend on it
const DEPENDENTS = {
  organisationId: ['clinicianId', 'productId', 'conditionId', 'indication', 'pathway'],
  productId: ['conditionId', 'indication', 'pathway'],
  conditionId: ['indication']
}

function nextQuestion (variant, question) {
  if (variant === 'b') {
    const i = ORDER_B.indexOf(question)
    return i < ORDER_B.length - 1 ? `/enrol/b/${ORDER_B[i + 1]}` : '/enrol/b/check'
  }
  const task = TASKS_A.find(t => t.questions.includes(question))
  const i = task.questions.indexOf(question)
  return i < task.questions.length - 1 ? `/enrol/a/${task.questions[i + 1]}` : '/enrol/a/tasks'
}

function previousQuestion (variant, question) {
  if (variant === 'b') {
    const i = ORDER_B.indexOf(question)
    return i > 0 ? `/enrol/b/${ORDER_B[i - 1]}` : '/enrol/confirm-patient'
  }
  const task = TASKS_A.find(t => t.questions.includes(question))
  const i = task.questions.indexOf(question)
  return i > 0 ? `/enrol/a/${task.questions[i - 1]}` : '/enrol/a/tasks'
}

function hasAnswer (enrol, question) {
  const q = QUESTIONS[question]
  if (question === 'start-date') return !!enrol.startDateAnswered
  return !!enrol[q.field]
}

// Task list statuses use the NHS Task list wording: Completed, Incomplete, Cannot start yet
function taskStatus (enrol, task, index) {
  const prerequisitesDone = TASKS_A.slice(0, index).every(t => t.questions.every(q => hasAnswer(enrol, q)))
  if (index > 0 && !prerequisitesDone) return 'Cannot start yet'
  const answered = task.questions.filter(q => hasAnswer(enrol, q)).length
  if (answered === task.questions.length) return 'Completed'
  return 'Incomplete'
}

function allAnswered (enrol) {
  return ORDER_B.every(q => hasAnswer(enrol, q))
}

function findDuplicate (data, enrol) {
  return data.enrolments.find(e =>
    e.nhsNumber === enrol.nhsNumber &&
    e.productId === enrol.productId &&
    e.status !== 'Cancelled'
  )
}

module.exports = function (router) {
  // Context for every /enrol page: the patient being enrolled
  router.use('/enrol', function (req, res, next) {
    const data = req.session.data
    data.enrol = data.enrol || {}
    res.locals.enrol = data.enrol
    res.locals.enrolPatient = data.enrol.patientConfirmed ? svc.patient(data, data.enrol.nhsNumber) : null
    next()
  })

  // Start (or restart) an enrolment
  router.get('/enrol/start', function (req, res) {
    req.session.data.enrol = {}
    res.redirect('/enrol/nhs-number')
  })

  // -------------------------------------------------------------------------
  // CES-008 – NHS number
  // Error messages: the NHS pattern gives exact wording only for "too long".
  // -------------------------------------------------------------------------
  router.post('/enrol/nhs-number-answer', function (req, res) {
    const data = req.session.data
    const result = nhsNumber.validate(req.body._nhsNumber)
    const errors = new Errors()
    const messages = {
      empty: 'Lorem ipsum dolor sit amet (enter the NHS number)',
      letters: 'Lorem ipsum dolor sit amet (NHS number must only include numbers)',
      tooShort: 'Lorem ipsum dolor sit amet (NHS number is too short)',
      tooLong: 'Lorem ipsum dolor sit amet (NHS number is too long)',
      invalid: 'Lorem ipsum dolor sit amet (NHS number is not valid)'
    }
    data.enrol.nhsNumberEntered = req.body._nhsNumber
    if (result.error) {
      errors.add('nhsNumber', messages[result.error])
      errors.save(req)
      return res.redirect('/enrol/nhs-number')
    }
    data.enrol = { nhsNumber: result.value, nhsNumberEntered: req.body._nhsNumber }
    res.redirect('/enrol/searching')
  })

  // After the spinner, decide where to go (PDS lookup simulation)
  router.get('/enrol/search-result', function (req, res) {
    const data = req.session.data
    const number = data.enrol.nhsNumber
    if (!number) return res.redirect('/enrol/nhs-number')

    if (data.settings.pdsUnavailable === 'yes' || number === data.scenarioNumbers.pdsUnavailable) {
      return res.redirect('/enrol/pds-unavailable')
    }

    const patient = svc.patient(data, number)
    if (!patient) return res.redirect('/enrol/no-match')
    if (patient.pdsStatus === 'restricted') return res.redirect('/enrol/restricted')
    if (patient.pdsStatus === 'deceased') return res.redirect('/enrol/deceased')
    if (patient.pdsStatus === 'superseded') {
      // PDS returns the current record for a superseded NHS number
      data.enrol.supersededFrom = number
      data.enrol.nhsNumber = patient.supersededBy
    }
    res.redirect('/enrol/confirm-patient')
  })

  router.get('/enrol/confirm-patient', function (req, res, next) {
    const data = req.session.data
    const patient = svc.patient(data, data.enrol.nhsNumber)
    if (!patient) return res.redirect('/enrol/nhs-number')
    res.locals.patient = patient
    next()
  })

  router.post('/enrol/confirm-patient-answer', function (req, res) {
    const data = req.session.data
    const answer = req.body._confirmPatient
    if (!answer) {
      const errors = new Errors()
      errors.add('confirmPatient', 'Lorem ipsum dolor sit amet (select yes if this is the right patient)', '#confirmPatient')
      errors.save(req)
      return res.redirect('/enrol/confirm-patient')
    }
    if (answer === 'no') {
      return res.redirect('/enrol/start')
    }
    data.enrol.patientConfirmed = true
    // Default the accountable organisation to the organisation the user is working in
    if (!data.enrol.organisationId) {
      data.enrol.organisationId = data.auth.organisationId
    }
    const variant = data.settings.enrolVariant === 'b' ? 'b' : 'a'
    res.redirect(variant === 'a' ? '/enrol/a/tasks' : '/enrol/b/organisation')
  })

  // -------------------------------------------------------------------------
  // CES-009 – questions (shared by both variants)
  // -------------------------------------------------------------------------
  function requirePatient (req, res, next) {
    if (req.params.variant && !['a', 'b'].includes(req.params.variant)) return next('route')
    if (!req.session.data.enrol.patientConfirmed) return res.redirect('/enrol/nhs-number')
    next()
  }

  function submitEnrolment (req, res) {
    const data = req.session.data
    const enrol = data.enrol
    if (data.settings.supplierUnavailable === 'yes') {
      return res.redirect('/enrol/supplier-unavailable')
    }

    const user = svc.currentUser(data)
    const patient = svc.patient(data, enrol.nhsNumber)
    const now = svc.nowIso()
    const id = svc.nextEnrolmentId(data)
    const startDate = enrol.startDate && enrol.startDate.year
      ? `${enrol.startDate.year}-${String(enrol.startDate.month).padStart(2, '0')}-${String(enrol.startDate.day).padStart(2, '0')}`
      : null

    data.enrolments.unshift({
      id,
      nhsNumber: patient.nhsNumber,
      patientName: `${patient.givenName} ${patient.familyName}`,
      dateOfBirth: patient.dateOfBirth,
      organisationId: enrol.organisationId,
      clinicianId: enrol.clinicianId,
      productId: enrol.productId,
      conditionId: enrol.conditionId,
      indication: enrol.indication,
      pathway: enrol.pathway,
      startDate,
      status: 'Pending',
      source: 'Single',
      batchId: null,
      createdAt: now,
      createdBy: user.name,
      cancellation: null,
      history: [
        {
          at: now,
          by: user.name,
          role: data.roles[user.role].label,
          organisation: enrol.organisationId,
          action: 'Enrolment created',
          detail: enrol.duplicateAcknowledged ? 'Lorem ipsum (created after possible duplicate warning)' : null
        }
      ]
    })

    data.lastCreatedEnrolmentId = id
    data.enrol = {}
    res.redirect('/enrol/confirmation')
  }

  router.get('/enrol/:variant/tasks', requirePatient, function (req, res) {
    const data = req.session.data
    const enrol = data.enrol
    res.render('enrol/tasks', {
      variant: 'a',
      tasks: TASKS_A.map((task, index) => ({
        id: task.id,
        href: `/enrol/a/${task.questions[0]}`,
        status: taskStatus(enrol, task, index)
      })),
      readyToCheck: allAnswered(enrol)
    })
  })

  router.get('/enrol/:variant/:question', requirePatient, function (req, res, next) {
    const { variant, question } = req.params
    if (!QUESTIONS[question]) return next()
    const data = req.session.data
    const enrol = data.enrol
    const user = svc.currentUser(data)

    res.render(`enrol/questions/${question}`, {
      variant,
      question,
      formAction: `/enrol/${variant}/${question}-answer` + (req.query.returnTo === 'check' ? '?returnTo=check' : ''),
      backHref: req.query.returnTo === 'check' ? `/enrol/${variant}/check` : previousQuestion(variant, question),
      userOrganisations: user.organisationIds.map(id => svc.organisation(data, id)),
      cliniciansForOrg: data.clinicians.filter(c => c.organisationIds.includes(enrol.organisationId)),
      productsForOrg: svc.entitledProducts(data, enrol.organisationId),
      selectedProduct: svc.product(data, enrol.productId),
      selectedCondition: svc.condition(data, enrol.productId, enrol.conditionId)
    })
  })

  router.post('/enrol/:variant/:question-answer', requirePatient, function (req, res, next) {
    const { variant, question } = req.params
    const q = QUESTIONS[question]
    if (!q) return next()
    const data = req.session.data
    const enrol = data.enrol
    const errors = new Errors()

    if (question === 'start-date') {
      const d = req.body._startDate || {}
      const any = d.day || d.month || d.year
      const all = d.day && d.month && d.year
      if (any && !all) {
        errors.add('startDate', 'Lorem ipsum dolor sit amet (date must include a day, month and year)', '#startDate-day')
      } else if (all && isNaN(new Date(`${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`))) {
        errors.add('startDate', 'Lorem ipsum dolor sit amet (date must be a real date)', '#startDate-day')
      }
      enrol.startDate = d
      if (!errors.any) enrol.startDateAnswered = true
    } else {
      const value = req.body['_' + q.field]
      if (!value) {
        errors.add(q.field, q.error, '#' + q.field)
      } else {
        if (enrol[q.field] && enrol[q.field] !== value) {
          (DEPENDENTS[q.field] || []).forEach(dep => delete enrol[dep])
        }
        enrol[q.field] = value
      }
    }

    if (errors.any) {
      errors.save(req)
      return res.redirect(`/enrol/${variant}/${question}` + (req.query.returnTo === 'check' ? '?returnTo=check' : ''))
    }

    // Return to check answers if possible, otherwise carry on through dependent questions
    if (req.query.returnTo === 'check' && allAnswered(enrol)) {
      return res.redirect(`/enrol/${variant}/check`)
    }
    const nextUrl = nextQuestion(variant, question)
    if (req.query.returnTo === 'check' && nextUrl !== `/enrol/${variant}/check` && nextUrl !== '/enrol/a/tasks') {
      return res.redirect(nextUrl + '?returnTo=check')
    }
    res.redirect(nextUrl)
  })

  // -------------------------------------------------------------------------
  // CES-009 – check answers, duplicate check, submit
  // -------------------------------------------------------------------------
  router.get('/enrol/:variant/check', requirePatient, function (req, res) {
    const data = req.session.data
    const enrol = data.enrol
    if (!allAnswered(enrol)) {
      return res.redirect(req.params.variant === 'a' ? '/enrol/a/tasks' : '/enrol/b/organisation')
    }
    res.render('enrol/check', {
      variant: req.params.variant,
      organisation: svc.organisation(data, enrol.organisationId),
      clinician: svc.clinician(data, enrol.clinicianId),
      product: svc.product(data, enrol.productId),
      condition: svc.condition(data, enrol.productId, enrol.conditionId)
    })
  })

  router.post('/enrol/:variant/check-answer', requirePatient, function (req, res) {
    const data = req.session.data
    const enrol = data.enrol
    const variant = req.params.variant
    if (!allAnswered(enrol)) return res.redirect(`/enrol/${variant}/check`)

    const duplicate = findDuplicate(data, enrol)
    if (duplicate && !enrol.duplicateAcknowledged) {
      enrol.duplicateId = duplicate.id
      return res.redirect(`/enrol/${variant}/duplicate`)
    }

    submitEnrolment(req, res)
  })

  router.get('/enrol/:variant/duplicate', requirePatient, function (req, res) {
    const data = req.session.data
    const duplicate = svc.enrolment(data, data.enrol.duplicateId)
    if (!duplicate) return res.redirect(`/enrol/${req.params.variant}/check`)
    res.render('enrol/duplicate', {
      variant: req.params.variant,
      duplicate,
      duplicateProduct: svc.product(data, duplicate.productId)
    })
  })

  router.post('/enrol/:variant/duplicate-answer', requirePatient, function (req, res) {
    req.session.data.enrol.duplicateAcknowledged = true
    submitEnrolment(req, res)
  })

  router.get('/enrol/confirmation', function (req, res) {
    const data = req.session.data
    const e = svc.enrolment(data, data.lastCreatedEnrolmentId)
    if (!e) return res.redirect('/enrolments')
    res.render('enrol/confirmation', {
      created: e,
      product: svc.product(data, e.productId)
    })
  })
}
