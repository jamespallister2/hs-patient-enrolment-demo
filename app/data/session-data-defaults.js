// Default session data for the HealthStore Clinical Enrolment Service prototype.
//
// Everything here is FICTIONAL test data. Organisation names, people, ODS codes,
// products, conditions, indications and pathways are placeholders for testing
// the journeys – they are not real and are not content.
//
// NHS numbers are in the 999 range used for testing and pass the checksum.

const nhsNumber = require('../lib/nhs-number')

// ---------------------------------------------------------------------------
// Organisations (CES-003, CES-006)
// ---------------------------------------------------------------------------
const organisations = [
  { id: 'RX1', odsCode: 'RX1', name: 'Northfield NHS Foundation Trust' },
  { id: 'RX2', odsCode: 'RX2', name: 'Riverside Community Health Services' },
  { id: 'Y0123', odsCode: 'Y0123', name: 'Elm Park Primary Care Network' }
]

// ---------------------------------------------------------------------------
// Users / personas (CES-002, CES-004)
// authMethod: 'cis2' (clinical/organisational) or 'cognito' (admin/technical)
// ---------------------------------------------------------------------------
const users = [
  {
    id: 'clinician-multi',
    name: 'Dr Asha Patel',
    role: 'clinician',
    authMethod: 'cis2',
    organisationIds: ['RX1', 'RX2'],
    email: null
  },
  {
    id: 'clinician',
    name: 'Dr Tom Hughes',
    role: 'clinician',
    authMethod: 'cis2',
    organisationIds: ['RX1'],
    email: null
  },
  {
    id: 'clinical-admin',
    name: 'Sam Okafor',
    role: 'clinicalAdmin',
    authMethod: 'cis2',
    organisationIds: ['RX1'],
    email: null
  },
  {
    id: 'back-office',
    name: 'Priya Shah',
    role: 'backOffice',
    authMethod: 'cognito',
    organisationIds: [],
    email: 'priya.shah@example.com'
  },
  {
    id: 'tech-admin',
    name: 'Lee Morgan',
    role: 'techAdmin',
    authMethod: 'cognito',
    organisationIds: [],
    email: 'lee.morgan@example.com'
  }
]

// Role labels are taken from the user stories
const roles = {
  clinician: { label: 'Clinician' },
  clinicalAdmin: { label: 'Clinical admin' },
  backOffice: { label: 'Back office' },
  techAdmin: { label: 'Technical admin' }
}

// ---------------------------------------------------------------------------
// Authorising clinicians, per organisation (CES-009 – autocomplete)
// ---------------------------------------------------------------------------
const clinicianNames = [
  'Dr Asha Patel', 'Dr Tom Hughes', 'Dr Grace Bennett', 'Dr Ravi Kumar',
  'Dr Hannah Clarke', 'Dr Oliver Brooks', 'Dr Fatima Rahman', 'Dr James Whitfield',
  'Dr Chloe Evans', 'Dr Daniel Osei', 'Dr Megan Lloyd', 'Dr Samuel Price',
  'Dr Aisha Begum', 'Dr Michael Turner', 'Dr Emily Dawson', 'Dr Nathan Ward'
]
const clinicians = clinicianNames.map((name, i) => ({
  id: 'C' + String(4100000 + i * 137),
  name,
  registration: 'GMC ' + String(4100000 + i * 137),
  organisationIds: i % 3 === 0 ? ['RX1', 'RX2'] : (i % 3 === 1 ? ['RX1'] : ['RX2', 'Y0123'])
}))

// ---------------------------------------------------------------------------
// DTx product catalogue (CES-005)
// ---------------------------------------------------------------------------
const products = [
  {
    id: 'p1',
    name: 'DTx product A',
    version: '2.1',
    status: 'Live',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    conditions: [
      { id: 'p1c1', name: 'Insomnia', indications: ['Indication A1', 'Indication A2'] },
      { id: 'p1c2', name: 'Anxiety', indications: ['Indication A3'] }
    ],
    pathways: ['Pathway 1', 'Pathway 2']
  },
  {
    id: 'p2',
    name: 'DTx product B',
    version: '1.4',
    status: 'Live',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    conditions: [
      { id: 'p2c1', name: 'Type 2 diabetes', indications: ['Indication B1', 'Indication B2'] }
    ],
    pathways: ['Pathway 1']
  },
  {
    id: 'p3',
    name: 'DTx product C',
    version: '3.0',
    status: 'Live',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    conditions: [
      { id: 'p3c1', name: 'Low back pain', indications: ['Indication C1'] },
      { id: 'p3c2', name: 'Osteoarthritis', indications: ['Indication C2', 'Indication C3'] }
    ],
    pathways: ['Pathway 1', 'Pathway 2', 'Pathway 3']
  },
  {
    id: 'p4',
    name: 'DTx product D',
    version: '1.0',
    status: 'Withdrawn',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    conditions: [
      { id: 'p4c1', name: 'Depression', indications: ['Indication D1'] }
    ],
    pathways: ['Pathway 1']
  }
]

// Static entitlement map: organisation → products it is commissioned for (CES-006)
const entitlements = {
  RX1: ['p1', 'p2', 'p3'],
  RX2: ['p1', 'p4'],
  Y0123: ['p2']
}

// ---------------------------------------------------------------------------
// Patients – a stub of PDS (CES-007, CES-008)
// pdsStatus: 'ok' | 'restricted' | 'deceased' | 'superseded'
// ---------------------------------------------------------------------------
const givenNames = ['Olivia', 'George', 'Amelia', 'Harry', 'Isla', 'Jack', 'Ava', 'Noah',
  'Mia', 'Leo', 'Ivy', 'Oscar', 'Freya', 'Arthur', 'Rosie', 'Muhammad', 'Lily', 'Theo',
  'Evie', 'Alfie', 'Grace', 'Henry', 'Sophia', 'Archie', 'Ella', 'Joshua', 'Poppy', 'Jacob',
  'Ruby', 'Thomas', 'Zara', 'William', 'Alice', 'Ethan', 'Maya', 'Samuel']
const familyNames = ['Smith', 'Jones', 'Taylor', 'Brown', 'Williams', 'Wilson', 'Johnson',
  'Davies', 'Patel', 'Robinson', 'Wright', 'Thompson', 'Evans', 'Walker', 'White', 'Roberts',
  'Green', 'Hall', 'Wood', 'Jackson', 'Clarke', 'Khan', 'Hughes', 'Edwards', 'Turner', 'Hill',
  'Moore', 'Cooper', 'Ward', 'Morris', 'King', 'Lee', 'Baker', 'Harris', 'Scott', 'Young']
const streets = ['Station Road', 'Church Lane', 'Mill Street', 'Park Avenue', 'High Street', 'Victoria Road']
const towns = ['Northfield', 'Riverside', 'Elm Park']

const patients = givenNames.map((given, i) => {
  const year = 1945 + ((i * 7) % 60)
  const month = ((i * 5) % 12) + 1
  const day = ((i * 11) % 27) + 1
  return {
    nhsNumber: nhsNumber.make(123400 + i * 17),
    givenName: given,
    familyName: familyNames[i].toUpperCase(),
    dateOfBirth: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    gender: i % 2 === 0 ? 'Female' : 'Male',
    address: [`${10 + i} ${streets[i % streets.length]}`, towns[i % towns.length]],
    postcode: `AB${(i % 9) + 1} ${(i % 9) + 1}CD`,
    gpPractice: ['Northfield Medical Centre', 'Riverside Surgery', 'Elm Park Health Centre'][i % 3],
    pdsStatus: 'ok'
  }
})

// Special PDS scenarios for testing unhappy paths (CES-008)
const scenarioNumbers = {
  restricted: nhsNumber.make(200100),
  deceased: nhsNumber.make(200200),
  superseded: nhsNumber.make(200300),
  supersededBy: nhsNumber.make(200400),
  noMatch: nhsNumber.make(555500),
  pdsUnavailable: nhsNumber.make(200500)
}
patients.push(
  {
    nhsNumber: scenarioNumbers.restricted,
    givenName: 'Restricted',
    familyName: 'RECORD',
    dateOfBirth: '1980-01-01',
    gender: 'Not known',
    address: [],
    postcode: '',
    gpPractice: '',
    pdsStatus: 'restricted'
  },
  {
    nhsNumber: scenarioNumbers.deceased,
    givenName: 'Edward',
    familyName: 'FINCH',
    dateOfBirth: '1938-04-12',
    dateOfDeath: '2026-08-02',
    gender: 'Male',
    address: ['4 Mill Street', 'Northfield'],
    postcode: 'AB1 1CD',
    gpPractice: 'Northfield Medical Centre',
    pdsStatus: 'deceased'
  },
  {
    nhsNumber: scenarioNumbers.superseded,
    supersededBy: scenarioNumbers.supersededBy,
    givenName: 'Margaret',
    familyName: 'HOLLOWAY',
    dateOfBirth: '1962-09-30',
    gender: 'Female',
    address: ['22 Church Lane', 'Riverside'],
    postcode: 'AB2 2CD',
    gpPractice: 'Riverside Surgery',
    pdsStatus: 'superseded'
  },
  {
    nhsNumber: scenarioNumbers.supersededBy,
    givenName: 'Margaret',
    familyName: 'HOLLOWAY',
    dateOfBirth: '1962-09-30',
    gender: 'Female',
    address: ['22 Church Lane', 'Riverside'],
    postcode: 'AB2 2CD',
    gpPractice: 'Riverside Surgery',
    pdsStatus: 'ok'
  }
)

// ---------------------------------------------------------------------------
// Enrolments (CES-009, CES-010, CES-014, CES-015)
// status: 'Active' | 'Pending' | 'Cancelled'
// ---------------------------------------------------------------------------
function isoDaysAgo (days, hour = 10, minute = 15) {
  const d = new Date(Date.UTC(2026, 9, 20, hour, minute))
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString()
}

const enrolments = []
for (let i = 0; i < 34; i++) {
  const patient = patients[i]
  const orgId = i % 5 === 4 ? 'RX2' : (i % 7 === 6 ? 'Y0123' : 'RX1')
  const productIds = entitlements[orgId].filter(id => id !== 'p4' || orgId === 'RX2')
  const product = products.find(p => p.id === productIds[i % productIds.length])
  const condition = product.conditions[i % product.conditions.length]
  const clinician = clinicians.find(c => c.organisationIds.includes(orgId))
  const createdAt = isoDaysAgo(2 + i * 2, 9 + (i % 7), (i * 13) % 60)
  const fromBulk = i % 6 === 2
  const createdBy = fromBulk ? 'Sam Okafor' : clinician.name
  const status = i % 9 === 3 ? 'Cancelled' : (i % 8 === 1 ? 'Pending' : 'Active')

  const history = [
    {
      at: createdAt,
      by: createdBy,
      role: fromBulk ? 'Clinical admin' : 'Clinician',
      organisation: orgId,
      action: 'Enrolment created',
      detail: fromBulk ? 'Bulk file B-2026-0011' : null
    }
  ]
  if (status === 'Active') {
    history.push({
      at: isoDaysAgo(2 + i * 2, 9 + (i % 7), ((i * 13) % 60) + 1 > 59 ? 59 : ((i * 13) % 60) + 1),
      by: 'System',
      role: null,
      organisation: null,
      action: 'Enrolment sent to supplier',
      detail: null
    })
  }
  let cancellation = null
  if (status === 'Cancelled') {
    const byBackOffice = i % 2 === 1
    cancellation = {
      at: isoDaysAgo(1 + i, 14, 5),
      by: byBackOffice ? 'Priya Shah' : clinician.name,
      role: byBackOffice ? 'Back office' : 'Clinician',
      reason: 'Lorem ipsum reason 1',
      details: '',
      onBehalfOf: byBackOffice ? orgId : null
    }
    history.push({
      at: cancellation.at,
      by: cancellation.by,
      role: cancellation.role,
      organisation: cancellation.onBehalfOf,
      action: 'Enrolment cancelled',
      detail: cancellation.reason
    })
  }

  enrolments.push({
    id: 'ENR-' + String(10001 + i),
    nhsNumber: patient.nhsNumber,
    patientName: `${patient.givenName} ${patient.familyName}`,
    dateOfBirth: patient.dateOfBirth,
    organisationId: orgId,
    clinicianId: clinician.id,
    productId: product.id,
    conditionId: condition.id,
    indication: condition.indications[0],
    pathway: product.pathways[i % product.pathways.length],
    startDate: null,
    status,
    source: fromBulk ? 'Bulk' : 'Single',
    batchId: fromBulk ? 'B-2026-0011' : null,
    createdAt,
    createdBy,
    cancellation,
    history: history.reverse()
  })
}

// ---------------------------------------------------------------------------
// Bulk batches (CES-011 – CES-013)
// ---------------------------------------------------------------------------
const batches = [
  {
    id: 'B-2026-0011',
    fileName: 'enrolments-september.csv',
    organisationId: 'RX1',
    uploadedBy: 'Sam Okafor',
    uploadedAt: isoDaysAgo(30, 11, 2),
    submittedAt: isoDaysAgo(30, 11, 9),
    status: 'Complete',
    seen: true,
    rows: enrolments.filter(e => e.batchId === 'B-2026-0011').map((e, idx) => ({
      row: idx + 2,
      nhsNumber: e.nhsNumber,
      patientName: e.patientName,
      productId: e.productId,
      conditionId: e.conditionId,
      pathway: e.pathway,
      outcome: 'Enrolled',
      reason: null,
      enrolmentId: e.id
    }))
  },
  {
    id: 'B-2026-0012',
    fileName: 'enrolments-october.csv',
    organisationId: 'RX1',
    uploadedBy: 'Sam Okafor',
    uploadedAt: isoDaysAgo(1, 15, 40),
    submittedAt: isoDaysAgo(1, 15, 48),
    status: 'Partially failed',
    seen: false,
    rows: [
      { row: 2, nhsNumber: patients[20].nhsNumber, patientName: `${patients[20].givenName} ${patients[20].familyName}`, productId: 'p1', conditionId: 'p1c1', pathway: 'Pathway 1', outcome: 'Enrolled', reason: null, enrolmentId: null },
      { row: 3, nhsNumber: patients[22].nhsNumber, patientName: `${patients[22].givenName} ${patients[22].familyName}`, productId: 'p2', conditionId: 'p2c1', pathway: 'Pathway 1', outcome: 'Enrolled', reason: null, enrolmentId: null },
      { row: 4, nhsNumber: patients[24].nhsNumber, patientName: `${patients[24].givenName} ${patients[24].familyName}`, productId: 'p3', conditionId: 'p3c1', pathway: 'Pathway 2', outcome: 'Failed', reason: 'Lorem ipsum dolor sit amet', enrolmentId: null },
      { row: 5, nhsNumber: patients[26].nhsNumber, patientName: `${patients[26].givenName} ${patients[26].familyName}`, productId: 'p1', conditionId: 'p1c2', pathway: 'Pathway 2', outcome: 'Enrolled', reason: null, enrolmentId: null }
    ]
  }
]

module.exports = {
  // Reference data
  organisations,
  users,
  roles,
  clinicians,
  products,
  entitlements,
  patients,
  scenarioNumbers,

  // Records
  enrolments,
  batches,

  // Prototype settings (changed from the prototype settings panel)
  settings: {
    enrolVariant: 'a', // 'a' = task list, 'b' = linear question pages
    pdsUnavailable: 'no',
    supplierUnavailable: 'no',
    bulkScenario: 'mixed' // 'mixed' | 'allValid'
  }
}
