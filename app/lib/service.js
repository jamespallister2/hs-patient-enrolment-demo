// Service helpers: signed-in user, organisation scope, permissions and lookups.
// Prototype only – not production code.

const defaults = require('../data/session-data-defaults')

// ---------------------------------------------------------------------------
// Permissions by role (CES-004 – least privilege)
// Roles only see navigation and actions they can use. Actions they cannot use
// are hidden, not disabled.
// ---------------------------------------------------------------------------
const PERMISSIONS = {
  clinician: ['enrolments:view', 'enrolments:create', 'enrolments:cancel'],
  clinicalAdmin: ['enrolments:view', 'bulk:upload', 'enrolments:cancel'],
  backOffice: ['enrolments:view', 'enrolments:viewAllOrganisations', 'enrolments:cancelOnBehalf', 'audit:view'],
  techAdmin: ['catalogue:manage']
}

function can (user, permission) {
  if (!user) return false
  return (PERMISSIONS[user.role] || []).includes(permission)
}

// Deep copy the defaults into the session once, so changes made while testing
// (new enrolments, cancellations) never leak between sessions or survive a reset.
function ensureSessionData (data) {
  if (data.__initialised) return
  for (const key of Object.keys(defaults)) {
    data[key] = structuredClone(defaults[key])
  }
  data.__initialised = true
}

function currentUser (data) {
  if (!data.auth || !data.auth.userId) return null
  return data.users.find(u => u.id === data.auth.userId) || null
}

function currentOrganisation (data) {
  if (!data.auth || !data.auth.organisationId) return null
  return data.organisations.find(o => o.id === data.auth.organisationId) || null
}

function organisation (data, id) {
  return data.organisations.find(o => o.id === id) || null
}

function product (data, id) {
  return data.products.find(p => p.id === id) || null
}

function condition (data, productId, conditionId) {
  const p = product(data, productId)
  if (!p) return null
  return p.conditions.find(c => c.id === conditionId) || null
}

function clinician (data, id) {
  return data.clinicians.find(c => c.id === id) || null
}

function patient (data, nhsNumber) {
  return data.patients.find(p => p.nhsNumber === nhsNumber) || null
}

function enrolment (data, id) {
  return data.enrolments.find(e => e.id === id) || null
}

function batch (data, id) {
  return data.batches.find(b => b.id === id) || null
}

// Live products the organisation is entitled to (CES-005, CES-006)
function entitledProducts (data, organisationId) {
  const ids = data.entitlements[organisationId] || []
  return data.products.filter(p => ids.includes(p.id) && p.status === 'Live')
}

// Enrolments in scope for the user (CES-003)
function enrolmentsInScope (data) {
  const user = currentUser(data)
  if (!user) return []
  if (can(user, 'enrolments:viewAllOrganisations')) return data.enrolments
  const orgId = data.auth.organisationId
  return data.enrolments.filter(e => e.organisationId === orgId)
}

function canAccessEnrolment (data, e) {
  const user = currentUser(data)
  if (!user || !e) return false
  if (can(user, 'enrolments:viewAllOrganisations')) return true
  return e.organisationId === data.auth.organisationId
}

// Where each role lands after signing in
function homeFor (user) {
  if (!user) return '/sign-in'
  if (user.role === 'techAdmin') return '/catalogue'
  return '/enrolments'
}

// Simple ID helpers
function nextEnrolmentId (data) {
  const max = data.enrolments.reduce((m, e) => Math.max(m, Number(e.id.replace('ENR-', ''))), 10000)
  return 'ENR-' + (max + 1)
}

function nextBatchId (data) {
  const max = data.batches.reduce((m, b) => Math.max(m, Number(b.id.split('-')[2])), 0)
  return 'B-2026-' + String(max + 1).padStart(4, '0')
}

function nextProductId (data) {
  return 'p' + (data.products.length + 1)
}

function nowIso () {
  return new Date().toISOString()
}

module.exports = {
  PERMISSIONS,
  can,
  ensureSessionData,
  currentUser,
  currentOrganisation,
  organisation,
  product,
  condition,
  clinician,
  patient,
  enrolment,
  batch,
  entitledProducts,
  enrolmentsInScope,
  canAccessEnrolment,
  homeFor,
  nextEnrolmentId,
  nextBatchId,
  nextProductId,
  nowIso
}
