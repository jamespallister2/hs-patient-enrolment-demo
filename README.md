# HealthStore Clinical Enrolment Service – prototype

A clickable HTML wireframe of the **HealthStore Clinical Enrolment Service** backlog (tickets CES-001 to CES-015), built with the [NHS prototype kit](https://prototype-kit.service-manual.nhs.uk/) 8.5 and NHS.UK frontend 10.6.

The structure and interactions are in place, ready for a content designer to write the words.

## Run it

You need Node.js 22.11+ or 24.11+.

```sh
npm install
npm start
```

Then open <http://localhost:3000>. The **Prototype index** page lists test users, journeys by ticket and test NHS numbers.

## How the text works

| What you see | What it means |
| --- | --- |
| `Lorem ipsum dolor sit amet (what it needs to say)` | Placeholder for content design. The words in brackets say what the text needs to do. |
| Plain text that isn't lorem ipsum | Either taken from the user stories or backlog (for example *Accountable clinical organisation*, *Authorising clinician*, *Is this the right patient?*), or the standard wording of an NHS or GOV.UK pattern (for example *There is a problem*, *Log in with my Care Identity*, *Continue anyway*, *Sorry, there is a problem with the service*, *You have added 2 conditions*). |
| Anything marked "Prototype only" or inside the yellow **Prototype settings** bar | Testing tools, not part of the service. These don't need content design. |

Every page template starts with a comment listing its ticket, the patterns it uses and any open questions. To find every placeholder, search the `app/views` folder for `Lorem ipsum`.

## Where things are

```
app/
  routes.js               loads the route files below
  routes/
    auth.js               CES-001–004  log in, organisation scope, role access
    enrol.js              CES-007–009  PDS lookup, single enrolment (variants A and B)
    enrolments.js         CES-010, 014, 015  list, record, history, cancel
    bulk.js               CES-011–013  upload, validate, submit, track
    catalogue.js          CES-005      product catalogue
    prototype.js          prototype settings (not part of the service)
  lib/service.js          permissions by role, organisation scope, lookups
  data/session-data-defaults.js   all test data (fictional)
  views/                  one folder per area; `_components` holds the X-GOV
                          components rebuilt in NHS styling
  assets/sass/components  one file per custom component, using NHS Frontend tokens
docs/, .github/instructions/   NHS Frontend reference and guides for AI coding assistants
```

## Patterns

NHS design system first. X-GOV patterns are used only where the NHS has no fit, and are rebuilt with NHS Frontend tokens so they look consistent:

- **MoJ:** Organisation switcher, Identity bar, Timeline, Filter a list, Add to a list, Add another, Spinner, Numeric data, Notification badge, Page header actions, Timeout warning
- **GOV.UK:** Passwords, There is a problem with the service, Recover from validation errors, Accessible autocomplete (authorising clinician)

Where this prototype departs from the backlog's suggested patterns:

| Backlog suggested | Used instead | Why |
| --- | --- | --- |
| MoJ Sortable table | NHS Table with `sort` (server-side sorting on the enrolments list) | Sortable tables are now built into NHS Frontend 10.6 |
| MoJ Confirm an action (cancel, withdraw) | NHS Interruption page, confirmation example | The NHS pattern now includes a confirmation example for this case |
| GOV.UK Service navigation / MoJ Primary navigation | NHS Header navigation | NHS header already supports navigation |

## Assumptions to check with the team

- **Roles (CES-004):** clinicians create and cancel single enrolments; clinical admins do bulk enrolment and can cancel; back office can see every organisation, cancel on someone's behalf and see the audit table; technical admins only manage the product catalogue.
- **CES-006 entitlement** is a static map in the data file, so it has no screens. It is applied when choosing a product, and shown read-only on product pages.
- **CES-009 date field:** the backlog suggests a Date input but the story doesn't say which date. It's shown as optional and marked "to be confirmed".
- **Duplicate enrolments:** the clinician can "Continue anyway". Policy may need this to block instead.
- **Restricted and deceased PDS records** stop the journey.
- **Cancellation reasons** are placeholders.
- **New single enrolments** start as *Pending* (sent to supplier). Statuses used: Active, Pending, Cancelled.
- **Care Identity button:** the button uses the NHS `login` variant with the recommended wording. Swap in the official button image from the NHS England guidance before research.
- **CIS2 is simulated:** a stand-in page lets testers pick who to log in as.

## Flow map (Quiver)

`flow-map/` has an interactive map of every page and how they connect, made with [Quiver](https://github.com/michaelgallagher/quiver). Open `flow-map/index.html` in a browser. There's one map per journey and a combined map of all 54 pages.

The journeys are scripted in `scenarios/` (one `.flow` file per journey, listed in `all-journeys.set`). To regenerate the map after changing the prototype:

```sh
# once: get Quiver
git clone https://github.com/michaelgallagher/quiver.git ~/quiver
cd ~/quiver && npm install && npx playwright install chromium

# from this prototype's folder
node ~/quiver/bin/cli.js . --scenario-set all-journeys --desktop \
  --name healthstore-clinical-enrolment --title "HealthStore Clinical Enrolment Service" \
  -o flow-map
```

Quiver starts the prototype itself, so you don't need `npm start` running. Two prototype-only helpers exist for the scripts (and for research sessions):

- `/prototype/set?variant=b&pds=yes&supplier=yes&bulk=allValid&next=/enrol/start` – change prototype settings from a link
- `/bulk/prototype-upload` – simulate uploading a sample bulk file
