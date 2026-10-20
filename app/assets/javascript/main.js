// Custom behaviour for the prototype.
// Every page works without JavaScript; these modules enhance it.
import accessibleAutocomplete from 'accessible-autocomplete'

// ---------------------------------------------------------------------------
// Accessible autocomplete – enhances <select data-module="app-autocomplete">
// (CES-009 authorising clinician). Referenced by the GOV.UK Select guidance.
// ---------------------------------------------------------------------------
document.querySelectorAll('select[data-module="app-autocomplete"]').forEach(function (select) {
  accessibleAutocomplete.enhanceSelectElement({
    selectElement: select,
    defaultValue: '',
    showAllValues: true,
    dropdownArrow: function () { return '' }
  })
})

// ---------------------------------------------------------------------------
// Timeout warning (MoJ pattern) – opened from the prototype settings panel
// ---------------------------------------------------------------------------
const dialog = document.querySelector('[data-module="app-timeout-warning"]')
let countdownTimer

function openTimeoutWarning () {
  if (!dialog || typeof dialog.showModal !== 'function') return
  let seconds = 120
  const countdown = dialog.querySelector('[data-countdown]')
  dialog.showModal()
  dialog.focus()
  clearInterval(countdownTimer)
  countdownTimer = setInterval(function () {
    seconds--
    if (seconds <= 0) {
      window.location.href = '/signed-out?reason=timeout'
      return
    }
    // Only update the text every 20 seconds so screen readers are not flooded
    if (seconds % 20 === 0 || seconds < 20) {
      const minutes = Math.ceil(seconds / 60)
      countdown.textContent = seconds >= 60
        ? minutes + (minutes === 1 ? ' minute' : ' minutes')
        : seconds + (seconds === 1 ? ' second' : ' seconds')
    }
  }, 1000)
}

document.querySelectorAll('[data-module="app-show-timeout-warning"]').forEach(function (link) {
  link.addEventListener('click', function (event) {
    event.preventDefault()
    openTimeoutWarning()
  })
})

if (dialog) {
  dialog.querySelector('[data-module="app-timeout-continue"]').addEventListener('click', function () {
    clearInterval(countdownTimer)
    dialog.close()
  })
}

// ---------------------------------------------------------------------------
// Add another (MoJ component) – repeating text inputs (CES-005 indications)
// Without JavaScript, the "Add another" button submits the form and the
// server adds a blank row.
// ---------------------------------------------------------------------------
document.querySelectorAll('[data-module="app-add-another"]').forEach(function (container) {
  const list = container.querySelector('[data-add-another-list]')
  const addButton = container.querySelector('[data-add-another-add]')
  if (!list || !addButton) return

  function renumber () {
    const items = list.querySelectorAll('[data-add-another-item]')
    items.forEach(function (item, index) {
      const label = item.querySelector('label')
      const input = item.querySelector('input')
      const id = 'indication-' + index
      label.setAttribute('for', id)
      label.querySelector('[data-add-another-number]').textContent = index + 1
      input.id = id
      const remove = item.querySelector('[data-add-another-remove]')
      if (remove) remove.hidden = items.length === 1
    })
  }

  addButton.addEventListener('click', function (event) {
    event.preventDefault()
    const first = list.querySelector('[data-add-another-item]')
    const clone = first.cloneNode(true)
    clone.querySelector('input').value = ''
    list.appendChild(clone)
    renumber()
    clone.querySelector('input').focus()
  })

  list.addEventListener('click', function (event) {
    const remove = event.target.closest('[data-add-another-remove]')
    if (!remove) return
    event.preventDefault()
    remove.closest('[data-add-another-item]').remove()
    renumber()
    list.querySelector('input').focus()
  })

  renumber()
})
