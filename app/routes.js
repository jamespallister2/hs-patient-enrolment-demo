// External dependencies
const express = require('express')

const router = express.Router()

// Express 5 leaves req.body undefined when a form posts nothing
router.use(function (req, res, next) {
  req.body = req.body || {}
  next()
})

// Each area of the service has its own routes file.
// The ticket IDs in each file refer to the backlog spreadsheet.
require('./routes/prototype')(router) // Prototype settings – not part of the service
require('./routes/auth')(router) //       CES-001, CES-002, CES-003, CES-004
require('./routes/enrol')(router) //      CES-007, CES-008, CES-009
require('./routes/enrolments')(router) // CES-010, CES-014, CES-015
require('./routes/bulk')(router) //       CES-011, CES-012, CES-013
require('./routes/catalogue')(router) //  CES-005

module.exports = router
