# Wiring the "Submit a promo" form to Google Forms

Responses land in a Google Sheet you own. The site's custom form posts straight to
Google, so no server/backend is needed (works on Vercel/Netlify/etc).

## 1. Create the form

1. Go to <https://forms.google.com> → blank form. Name it e.g. "Pilates Prices SG — promo tips".
2. Add **4 questions, in this exact order**, all of type **Short answer**:
   1. `Studio`
   2. `Promo link`
   3. `Offer`
   4. `Email`
   (Short answer matters — a dropdown/multiple-choice would reject values not in its list.)
3. (Optional) Responses tab → link to a Google Sheet, and turn on email notifications.

## 2. Get the field IDs (the "pre-filled link" trick)

1. Top-right ⋮ menu → **Get pre-filled link**.
2. Type a recognisable placeholder in each field:
   `STUDIO` / `LINK` / `OFFER` / `EMAIL`.
3. Click **Get link** → **Copy link**. It looks like:
   ```
   https://docs.google.com/forms/d/e/1FAIpQLSxxxx/viewform?usp=pp_url&entry.111=STUDIO&entry.222=LINK&entry.333=OFFER&entry.444=EMAIL
   ```
4. Note which `entry.NNN` maps to which placeholder.

## 3. Fill in `.env.local`

Copy `.env.local.example` to `.env.local` and set:

```
NEXT_PUBLIC_GFORM_ACTION=https://docs.google.com/forms/d/e/1FAIpQLSxxxx/formResponse
NEXT_PUBLIC_GFORM_ENTRY_STUDIO=entry.111
NEXT_PUBLIC_GFORM_ENTRY_URL=entry.222
NEXT_PUBLIC_GFORM_ENTRY_OFFER=entry.333
NEXT_PUBLIC_GFORM_ENTRY_EMAIL=entry.444
```

Note: `ACTION` ends in **`/formResponse`**, not `/viewform`.

Restart `npm run dev`. The form now posts to Google. (On your host, add the same
`NEXT_PUBLIC_*` vars to the project's environment settings.)

## Shortcut

Just paste that pre-filled link to Claude and it'll fill in `.env.local` for you.
