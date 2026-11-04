/* Qadsiah U18 clinic episode client — ES module.
   Requires an authenticated Supabase client and deployed reviewed migration.
   No localStorage, no secret keys, no direct injury-status mutation. */
export function createClinicService(supabase) {
  if (!supabase?.from) throw new Error("Supabase client required");
  const required = (value, name) => {
    if (typeof value !== "string" || !value.trim()) throw new Error(name + " is required");
    return value.trim();
  };
  const unwrap = ({ data, error }) => {
    if (error) throw error;
    return data;
  };
  return {
    async episodesForPlayer(playerExternalId) {
      return unwrap(await supabase.from("qd_clinic_episodes")
        .select("id,player_external_id,anatomical_region,body_side,complaint_type,diagnosis_text,status,onset_date,created_at")
        .eq("player_external_id", required(playerExternalId, "playerExternalId"))
        .order("created_at", { ascending: false }));
    },
    async createEpisode({ playerExternalId, anatomicalRegion, bodySide = "unspecified", complaintType, onsetDate = null }) {
      return unwrap(await supabase.from("qd_clinic_episodes")
        .insert({ player_external_id: required(playerExternalId, "playerExternalId"),
          anatomical_region: required(anatomicalRegion, "anatomicalRegion"),
          body_side: bodySide, complaint_type: required(complaintType, "complaintType"),
          onset_date: onsetDate }).select().single());
    },
    async addVisit({ episodeId, painNrs, treatmentType, durationMinutes,
                     participationClearance = "pending", followUpRequired = false,
                     clinicalNotes = null, sessionExternalId = null }) {
      if (!Number.isInteger(painNrs) || painNrs < 0 || painNrs > 10) throw new Error("Pain must be 0–10");
      if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 480)
        throw new Error("Invalid treatment duration");
      return unwrap(await supabase.from("qd_clinic_visits")
        .insert({ episode_id: required(episodeId, "episodeId"), pain_nrs: painNrs,
          treatment_type: required(treatmentType, "treatmentType"),
          duration_minutes: durationMinutes, participation_clearance: participationClearance,
          follow_up_required: followUpRequired, clinical_notes: clinicalNotes,
          session_external_id: sessionExternalId }).select().single());
    },
    async episodeTrend(episodeId) {
      const visits = unwrap(await supabase.from("qd_clinic_visits")
        .select("id,visited_at,pain_nrs,duration_minutes,participation_clearance,follow_up_required,treatment_type")
        .eq("episode_id", required(episodeId, "episodeId"))
        .order("visited_at", { ascending: true }));
      const totalTreatmentMinutes = visits.reduce((sum, visit) => sum + visit.duration_minutes, 0);
      const scored = visits.filter(visit => visit.pain_nrs !== null);
      return { visitCount: visits.length, totalTreatmentMinutes,
        firstPain: scored.length ? scored[0].pain_nrs : null,
        latestPain: scored.length ? scored[scored.length - 1].pain_nrs : null,
        visits };
    }
  };
}
