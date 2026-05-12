# Exponent Phase 5 (Google Apps Script)

This folder contains the clasp-managed Apps Script backend for consultation booking.

## What it does

- Accepts booking payloads via `doPost(e)` from the Next.js API proxy.
- Validates JSON and required booking fields.
- Creates a Google Calendar event and attempts to generate a Google Meet link.
- Appends booking details to the `Leads CRM` sheet.
- Sends an HTML confirmation email to the lead.
- Returns a normalized JSON response:
  - `{ ok, code, message, data, timestamp }`

## Folder layout

- `appsscript.json` - Apps Script manifest and scopes
- `src/index.gs` - request handling + booking pipeline
- `src/templates.gs` - HTML email templates/utilities
- `.clasp.json.example` - sample clasp config

## Prerequisites

1. Install clasp globally:
   ```bash
   npm i -g @google/clasp
   ```
2. Authenticate:
   ```bash
   clasp login
   ```
3. Create a standalone Apps Script project in Google Drive.
4. Enable **Advanced Google services** in Apps Script:
   - Calendar API (required for Meet link creation via `Calendar.Events.insert`)
5. In Google Cloud project linked to script, ensure Calendar API is enabled.

## Initial setup

From `etd-portal/gas`:

1. Copy sample clasp config:
   ```bash
   cp .clasp.json.example .clasp.json
   ```
2. Edit `.clasp.json` and set your `scriptId`.
3. Push files:
   ```bash
   clasp push
   ```

## Script properties

Set these in Apps Script Project Settings -> Script Properties:

- `TARGET_CALENDAR_ID` (required)
- `CRM_SPREADSHEET_ID` (required)
- `CRM_SHEET_NAME` (optional, default `Leads CRM`)
- `FROM_NAME` (optional, default `Exponent Tech and Digital`)
- `COMPANY_EMAIL` (optional, used as reply-to)
- `TIMEZONE` (optional, default script timezone)

## Deploy as Web App

1. Apps Script -> Deploy -> New deployment -> Web app
2. Execute as: **Me**
3. Who has access: **Anyone** (or per your proxy constraints)
4. Deploy and copy Web App URL.
5. Use this URL in your Next.js proxy environment variable.

## Expected POST payload

```json
{
  "service": "web-development",
  "budget": "INR 2L-5L",
  "timeline": "8-12 weeks",
  "goals": "Build a B2B lead generation website",
  "notes": "Need CMS workflow",
  "slot": {
    "startIso": "2026-05-01T11:00:00.000Z",
    "endIso": "2026-05-01T11:30:00.000Z"
  },
  "contact": {
    "name": "Jane Client",
    "email": "jane@example.com",
    "company": "Client Co",
    "phone": "+91-9999999999"
  }
}
```

## Smoke test

```bash
curl -X POST "YOUR_GAS_WEB_APP_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "service":"web-development",
    "budget":"INR 2L-5L",
    "timeline":"8-12 weeks",
    "goals":"Build a new marketing website",
    "slot":{"startIso":"2026-05-01T11:00:00.000Z","endIso":"2026-05-01T11:30:00.000Z"},
    "contact":{"name":"Jane Client","email":"jane@example.com","company":"Client Co"}
  }'
```

Verify:

- Calendar event is created
- Google Meet link is present
- Row appears in `Leads CRM`
- Confirmation email is delivered
- JSON response returns `ok: true`

## Error codes

- `INVALID_JSON`
- `VALIDATION_ERROR`
- `CONFIG_ERROR`
- `CALENDAR_ERROR`
- `SHEET_ERROR`
- `EMAIL_ERROR`
- `INTERNAL_ERROR`



