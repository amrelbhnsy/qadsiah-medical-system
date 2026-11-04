# Clinic Episodes Foundation — Al-Qadsiah U18

**Development branch only. Not deployed. No production records changed.**

## Goal
A player may train fully while receiving daily treatment for a persistent complaint. Store **one complaint episode** and **many visits**; do not automatically count each visit as a separate injury.

## Files
- `db/clinic_episodes_v1.sql`: additive Postgres tables, indexes and initial Supabase RLS policies.
- `src/clinic/clinicService.js`: reusable browser ES-module data-access service.

## Example
```js
import { createClinicService } from "./src/clinic/clinicService.js";
const clinic = createClinicService(supabase); // authenticated Supabase client
const episodes = await clinic.episodesForPlayer(playerId);
const visit = await clinic.addVisit({
  episodeId: episodes[0].id, painNrs: 2, treatmentType: "manual",
  durationMinutes: 15, participationClearance: "full", followUpRequired: false
});
const trend = await clinic.episodeTrend(episodes[0].id);
```

## Before deployment — mandatory checks
1. Verify legacy player identifiers and mapping for all 36 real players; never create demo players in production.
2. Test migration on a staging copy and confirm RLS access for doctors/physios and denial for players/coaches/anonymous users.
3. Provision `qd_clinic_staff` through a trusted administrator only; never expose a service-role key in the browser.
4. Implement audit trail and controlled episode updates before allowing production edits.
5. Integrate player profile, daily readiness, GPS, Weekly Program, injury surveillance, and reports through stable IDs. No automatic injury diagnosis or clearance.
6. Verify patient privacy, data minimization and backups. Do not add real medical data to this public repository.

## Scientific semantics
- **Complaint episode**: longitudinal medical issue; multiple visits.
- **Visit**: one encounter/treatment; does not imply a new injury.
- **Participation clearance**: clinician-recorded decision; **not** proof of actual training attendance.
- **Injury surveillance**: independently classify according to the chosen FIFA/IOC-compatible case definition, including medical-attention cases without time loss when appropriate.
- **Exposure**: derive from actual attendance minutes, not scheduled sessions.

## Status
Foundational code only; no UI integration, clinical validation, or live deployment yet.
