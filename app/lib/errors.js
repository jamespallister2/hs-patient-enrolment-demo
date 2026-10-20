// Tiny helper for building error messages for the error summary and fields.
// Errors are stored in the session for one request (post → redirect → get),
// then moved into res.locals.errors and res.locals.errorList by app/locals.js.

class Errors {
  constructor () {
    this.items = {}
  }

  add (field, text, href) {
    if (!this.items[field]) {
      this.items[field] = { text, href: href || '#' + field }
    }
    return this
  }

  get any () {
    return Object.keys(this.items).length > 0
  }

  // Save for the next page load
  save (req) {
    req.session.errors = this.items
  }
}

module.exports = { Errors }
