# Clinic UI — staging test instructions

The branch contains an **actual reusable UI module**, not a deployed page. Do **not** copy it into production `main` until tests pass.

## Mount in a staging application
1. In a staging checkout of this branch, load `src/clinic/clinic.css` from the app page.
2. Provide a Supabase client that already has a **valid authenticated medical-staff session**; do not embed a service-role key or credentials in public source.
3. Ensure the selected `playerId` is the real, mapped ID from the existing players table (not a name, and not a demo ID in production).
4. Add an empty element `<div id="clinic-root"></div>` to the staging page and initialize:
```js
import { mountClinic } from "./src/clinic/clinicUI.js";
const ui = mountClinic(document.getElementById("clinic-root"), {
  supabase, playerId: selectedPlayer.id, playerName: selectedPlayer.name, locale: "ar"
});
```
5. Apply the migration **only after review on staging Supabase**, and provision the authorized clinician's `qd_clinic_staff` row using a trusted administrator.
6. Open the page and verify the following manually.

## Test checklist
- [ ] Unauthenticated user cannot read or insert episodes/visits.
- [ ] Player and coach accounts cannot read or insert clinic records.
- [ ] Authorized physiotherapist can create a complaint episode and see it after refresh.
- [ ] A new visit is attached to the **same** episode; visit count rises but episode count does not.
- [ ] Add two visits (e.g. pain 4 then 2); trend shows 4 → 2 and sums treatment minutes.
- [ ] Pain -1/11, duration 0/481, and blank treatment are rejected; no rows inserted.
- [ ] A forced network failure shows a failure, never a false success.
- [ ] An unrelated player cannot be selected without correct clinical authorization; verify player-to-team scope before production.
- [ ] Test Arabic/English, narrow phone layout, keyboard navigation.
- [ ] Record clinical participation decision but **do not** automatically mark attendance or injury.
- [ ] Verify no identifiable patient data in URL, GitHub, browser storage or console logs.
- [ ] Confirm original `index.html`, `survey.html` and `main` are unchanged.

## Known blockers before production
- Staging migration and RLS audit (including player/team scope and doctor/physio distinctions).
- Verified legacy player ID mapping and medical staff provisioning.
- Immutable audit trail for episode status changes and visits.
- Existing app navigation integration, backend error handling, and clinical workflow acceptance tests.
- No auto-linking to readiness/GPS/exposure yet. These are separate integration milestones.

**Do not paste patient records or Supabase secrets into public GitHub.**
