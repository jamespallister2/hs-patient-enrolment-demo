// Bulk patient enrolment
// CES-011: download the template and upload a completed file
// CES-012: every row goes through the same NHS number, validation and duplicate
//          checks as a single enrolment
// CES-013: submit the validated file and track per-patient outcomes
//
// In the prototype no file is really uploaded: the file name decides what happens.
//   - no file chosen          → error
//   - not a .csv file         → error (wrong type)
//   - name contains "empty"   → error (empty file)
//   - anything else           → rows are generated (see "Bulk file has no problems"
//                               in the prototype settings for an all-valid file)
const svc = require('../lib/service')
const nhsNumber = require('../lib/nhs-number')
const { Errors } = require('../lib/errors')

const PAGE_SIZE = 10
const PROCESSING_SECONDS = 8

// Build the rows of an uploaded file, applying the CES-009 rules to each row
function buildRows (data, organisationId, scenario) {
  const products = svc.entitledProducts(data, organisationId)
  const rows = []
  for (let i = 0; i < 14; i++) {
    const p = data.patients[10 + i]
    const product = products[i % products.length]
    const condition = product.conditions[0]
    rows.push({
      row: i + 2, // row 1 is the header
      nhsNumber: p.nhsNumber,
      patientName: `${p.givenName} ${p.familyName}`,
      productId: product.id,
      productName: product.name,
      conditionId: condition.id,
      indication: condition.indications[0],
      pathway: product.pathways[0],
      result: 'Valid',
      problem: null,
      outcome: null,
      reason: null,
      enrolmentId: null
    })
  }

  if (scenario !== 'allValid') {
    // Invalid NHS number
    rows[2].nhsNumber = '9991234560'
    rows[2].patientName = ''
    rows[2].result = 'Error'
    rows[2].problem = 'Lorem ipsum dolor sit amet (NHS number is not valid)'
    // No PDS match
    rows[5].nhsNumber = nhsNumber.make(777700 + 5)
    rows[5].patientName = ''
    rows[5].result = 'No PDS match'
    rows[5].problem = 'Lorem ipsum dolor sit amet (no patient found for this NHS number)'
    // Duplicate of an existing enrolment
    const existing = data.enrolments.find(e => e.organisationId === organisationId && e.status !== 'Cancelled')
    if (existing) {
      rows[8].nhsNumber = existing.nhsNumber
      rows[8].patientName = existing.patientName
      rows[8].productId = existing.productId
      rows[8].productName = svc.product(data, existing.productId).name
      rows[8].result = 'Duplicate'
      rows[8].problem = 'Lorem ipsum dolor sit amet (already enrolled: ' + existing.id + ')'
    }
    // Missing pathway
    rows[11].pathway = ''
    rows[11].result = 'Error'
    rows[11].problem = 'Lorem ipsum dolor sit amet (pathway is missing)'
  }
  return rows
}

// Simulate the supplier finishing processing after a few seconds
function progressBatch (data, b) {
  if (b.status !== 'Processing') return
  const elapsed = (Date.now() - new Date(b.submittedAt).getTime()) / 1000
  if (elapsed < PROCESSING_SECONDS) return

  const user = data.users.find(u => u.name === b.uploadedBy) || { name: b.uploadedBy, role: 'clinicalAdmin' }
  let failed = 0
  b.rows.filter(r => r.result === 'Valid').forEach((r, index) => {
    // One row fails at the supplier to show a partial failure
    if (index === 3) {
      r.outcome = 'Failed'
      r.reason = 'Lorem ipsum dolor sit amet (supplier could not create the enrolment)'
      failed++
      return
    }
    const p = svc.patient(data, r.nhsNumber)
    const id = svc.nextEnrolmentId(data)
    const clinician = data.clinicians.find(c => c.organisationIds.includes(b.organisationId))
    data.enrolments.unshift({
      id,
      nhsNumber: r.nhsNumber,
      patientName: r.patientName,
      dateOfBirth: p ? p.dateOfBirth : null,
      organisationId: b.organisationId,
      clinicianId: clinician.id,
      productId: r.productId,
      conditionId: r.conditionId,
      indication: r.indication,
      pathway: r.pathway,
      startDate: null,
      status: 'Active',
      source: 'Bulk',
      batchId: b.id,
      createdAt: b.submittedAt,
      createdBy: b.uploadedBy,
      cancellation: null,
      history: [
        { at: svc.nowIso(), by: 'System', role: null, organisation: null, action: 'Enrolment sent to supplier', detail: null },
        { at: b.submittedAt, by: b.uploadedBy, role: data.roles[user.role] ? data.roles[user.role].label : null, organisation: b.organisationId, action: 'Enrolment created', detail: 'Bulk file ' + b.id }
      ]
    })
    r.outcome = 'Enrolled'
    r.enrolmentId = id
  })
  b.status = failed ? 'Partially failed' : 'Complete'
  b.completedAt = svc.nowIso()
  b.seen = false
}

function paginate (rows, page, baseHref) {
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const current = Math.min(Math.max(1, Number(page) || 1), pageCount)
  const sep = baseHref.includes('?') ? '&' : '?'
  const items = []
  for (let i = 1; i <= pageCount; i++) {
    items.push({ number: String(i), href: `${baseHref}${sep}_page=${i}`, current: i === current })
  }
  return {
    rows: rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE),
    pageCount,
    items,
    previous: current > 1 ? { href: `${baseHref}${sep}_page=${current - 1}` } : null,
    next: current < pageCount ? { href: `${baseHref}${sep}_page=${current + 1}` } : null
  }
}

module.exports = function (router) {
  // Batches belong to an organisation (CES-003)
  router.use('/bulk/:id', function (req, res, next) {
    const data = req.session.data
    const b = svc.batch(data, req.params.id)
    if (!b) return next()
    if (b.organisationId !== data.auth.organisationId) {
      return res.status(403).render('access-denied')
    }
    progressBatch(data, b)
    res.locals.b = b
    res.locals.bOrganisation = svc.organisation(data, b.organisationId)
    next()
  })

  // -------------------------------------------------------------------------
  // Bulk enrolment home – list of files
  // -------------------------------------------------------------------------
  router.get('/bulk', function (req, res) {
    const data = req.session.data
    const batches = data.batches.filter(b => b.organisationId === data.auth.organisationId && b.status !== 'Draft')
    batches.forEach(b => progressBatch(data, b))
    res.render('bulk/index', {
      batches: batches.sort((a, b) => String(b.uploadedAt).localeCompare(String(a.uploadedAt)))
    })
  })

  // Template download (CES-011)
  router.get('/bulk/template.csv', function (req, res) {
    res.set('Content-Type', 'text/csv')
    res.set('Content-Disposition', 'attachment; filename="bulk-enrolment-template.csv"')
    res.send('nhs_number,product,condition,indication,pathway,authorising_clinician\n')
  })

  // -------------------------------------------------------------------------
  // CES-011 – upload
  // -------------------------------------------------------------------------
  // PROTOTYPE ONLY – simulate uploading a sample file without choosing one
  router.get('/bulk/prototype-upload', function (req, res) {
    req.body = { _file: 'sample-enrolments.csv' }
    handleUpload(req, res)
  })

  router.post('/bulk/upload-answer', handleUpload)

  function handleUpload (req, res) {
    const data = req.session.data
    const fileName = (req.body._file || '').trim()
    const errors = new Errors()
    if (!fileName) {
      errors.add('file', 'Lorem ipsum dolor sit amet (select a file)')
    } else if (!/\.csv$/i.test(fileName)) {
      errors.add('file', 'Lorem ipsum dolor sit amet (the selected file must be a CSV)')
    } else if (/empty/i.test(fileName)) {
      errors.add('file', 'Lorem ipsum dolor sit amet (the selected file is empty)')
    }
    if (errors.any) {
      errors.save(req)
      return res.redirect('/bulk/upload')
    }

    const user = svc.currentUser(data)
    const id = svc.nextBatchId(data)
    data.batches.push({
      id,
      fileName: fileName.split(/[\\/]/).pop(),
      organisationId: data.auth.organisationId,
      uploadedBy: user.name,
      uploadedAt: svc.nowIso(),
      submittedAt: null,
      status: 'Draft',
      seen: true,
      rows: buildRows(data, data.auth.organisationId, data.settings.bulkScenario)
    })
    res.redirect(`/bulk/${id}/validating`)
  }

  router.get('/bulk/:id/validating', function (req, res, next) {
    if (!res.locals.b) return next()
    res.render('bulk/validating')
  })

  // -------------------------------------------------------------------------
  // CES-012 – validation results, one row at a time
  // -------------------------------------------------------------------------
  router.get('/bulk/:id/results', function (req, res, next) {
    const b = res.locals.b
    if (!b) return next()
    if (b.status !== 'Draft') return res.redirect(`/bulk/${b.id}`)

    const show = req.query._show || 'all'
    const counts = {
      total: b.rows.length,
      Valid: b.rows.filter(r => r.result === 'Valid').length,
      Error: b.rows.filter(r => r.result === 'Error').length,
      Duplicate: b.rows.filter(r => r.result === 'Duplicate').length,
      'No PDS match': b.rows.filter(r => r.result === 'No PDS match').length
    }
    const filtered = show === 'problems'
      ? b.rows.filter(r => r.result !== 'Valid')
      : (show === 'all' ? b.rows : b.rows.filter(r => r.result === show))

    res.render('bulk/results', {
      counts,
      show,
      problemCount: counts.total - counts.Valid,
      paged: paginate(filtered, req.query._page, `/bulk/${b.id}/results?_show=${encodeURIComponent(show)}`)
    })
  })

  router.get('/bulk/:id/check', function (req, res, next) {
    const b = res.locals.b
    if (!b) return next()
    if (b.status !== 'Draft') return res.redirect(`/bulk/${b.id}`)
    const valid = b.rows.filter(r => r.result === 'Valid').length
    if (!valid) return res.redirect(`/bulk/${b.id}/results`)
    res.render('bulk/check', {
      validCount: valid,
      excludedCount: b.rows.length - valid
    })
  })

  // -------------------------------------------------------------------------
  // CES-013 – submit and track
  // -------------------------------------------------------------------------
  router.post('/bulk/:id/check-answer', function (req, res, next) {
    const b = res.locals.b
    if (!b) return next()
    if (b.status !== 'Draft') return res.redirect(`/bulk/${b.id}`)
    b.status = 'Processing'
    b.submittedAt = svc.nowIso()
    res.redirect(`/bulk/${b.id}/submitted`)
  })

  router.get('/bulk/:id/submitted', function (req, res, next) {
    if (!res.locals.b) return next()
    res.render('bulk/submitted', {
      validCount: res.locals.b.rows.filter(r => r.result === 'Valid').length
    })
  })

  router.get('/bulk/:id', function (req, res, next) {
    const b = res.locals.b
    if (!b) return next()
    if (b.status === 'Draft') return res.redirect(`/bulk/${b.id}/results`)

    const show = req.query._show || 'all'
    const submittedRows = b.rows.filter(r => r.result === undefined || r.result === 'Valid')
    const filtered = show === 'failed' ? submittedRows.filter(r => r.outcome === 'Failed') : submittedRows
    const wasUnseen = !b.seen && b.status !== 'Processing'
    if (b.status !== 'Processing') b.seen = true

    res.render('bulk/batch', {
      show,
      wasUnseen,
      enrolledCount: submittedRows.filter(r => r.outcome === 'Enrolled').length,
      failedCount: submittedRows.filter(r => r.outcome === 'Failed').length,
      paged: paginate(filtered, req.query._page, `/bulk/${b.id}?_show=${show}`)
    })
  })
}
