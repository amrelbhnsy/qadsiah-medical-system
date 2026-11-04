/* Standalone clinic interface. Safe DOM text rendering; no patient data in URL/storage. */
import { createClinicService } from "./clinicService.js";

export function mountClinic(root, { supabase, playerId, playerName = "", locale = "ar" }) {
  if (!(root instanceof HTMLElement)) throw new Error("Valid mount element required");
  if (!playerId) throw new Error("An existing player ID is required");
  const clinic = createClinicService(supabase);
  const ar = locale !== "en";
  const t = (a,b) => ar ? a : b;
  root.classList.add("qd-clinic");
  root.dir = ar ? "rtl" : "ltr";
  root.replaceChildren();
  const el = (tag, cls, content) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (content !== undefined) n.textContent = String(content);
    return n;
  };
  const field = (parent, label, type = "text", opts = {}) => {
    const box = el("label", "qd-field");
    box.append(el("span", "", label));
    const input = document.createElement(opts.options ? "select" : "input");
    if (opts.options) opts.options.forEach(([v, label]) => {
      const option = el("option", "", label); option.value = v; input.append(option);
    });
    else input.type = type;
    if (opts.required) input.required = true;
    if (opts.min !== undefined) input.min = String(opts.min);
    if (opts.max !== undefined) input.max = String(opts.max);
    if (opts.value !== undefined) input.value = String(opts.value);
    box.append(input); parent.append(box);
    return input;
  };
  const heading = el("h2", "", t("العيادة السريعة والشكاوى المستمرة", "Quick Clinic & Ongoing Complaints"));
  const player = el("p", "qd-muted", t("اللاعب: ", "Player: ") + (playerName || playerId));
  const status = el("p", "qd-status");
  status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite");
  const panel = el("section", "qd-panel");
  panel.append(el("h3", "", t("شكوى جديدة", "New complaint")));
  const episodeForm = el("form", "qd-grid");
  const region = field(episodeForm,t("المنطقة التشريحية","Anatomical region"),"text",{required:true});
  const side = field(episodeForm,t("الجهة","Side"),"text",{options:[
    ["unspecified",t("غير محدد","Unspecified")],["left",t("يسار","Left")],
    ["right",t("يمين","Right")],["bilateral",t("الجانبان","Bilateral")],
    ["midline",t("منتصف","Midline")]]});
  const type = field(episodeForm,t("وصف الشكوى","Complaint description"),"text",{required:true});
  const onset = field(episodeForm,t("تاريخ بداية الشكوى (اختياري)","Onset date (optional)"),"date");
  const addEpisode = el("button","qd-primary",t("إنشاء شكوى","Create complaint"));
  addEpisode.type="submit"; episodeForm.append(addEpisode); panel.append(episodeForm);
  const active = el("section","qd-panel");
  active.append(el("h3","",t("الشكاوى المسجلة","Recorded complaints")));
  const list = el("div","qd-episode-list");
  const refresh = el("button","qd-secondary",t("تحديث القائمة","Refresh list"));
  refresh.type="button"; active.append(refresh,list);
  const visitPanel = el("section","qd-panel");
  visitPanel.append(el("h3","",t("إضافة علاج لشكوى قائمة","Add treatment to existing complaint")));
  const visitForm = el("form","qd-grid");
  const episodeSelect = field(visitForm,t("اختر الشكوى","Choose complaint"),"text",{options:[]});
  const pain = field(visitForm,t("شدة الألم 0–10","Pain 0–10"),"number",{min:0,max:10,value:2,required:true});
  const treatment = field(visitForm,t("نوع العلاج","Treatment"),"text",{required:true});
  const duration = field(visitForm,t("المدة بالدقائق","Duration (minutes)"),"number",{min:1,max:480,value:15,required:true});
  const clearance = field(visitForm,t("قرار المشاركة الطبي","Clinical participation decision"),"text",{options:[
    ["pending",t("قيد التقييم","Pending")],["full",t("كاملة","Full")],
    ["modified",t("معدلة","Modified")],["no",t("لا يشارك","No participation")]]});
  const followLabel=el("label","qd-field qd-check");
  const follow=document.createElement("input"); follow.type="checkbox";
  followLabel.append(follow,el("span","",t("تحتاج متابعة","Follow-up required")));
  visitForm.append(followLabel);
  const notesLabel=el("label","qd-field qd-wide");
  notesLabel.append(el("span","",t("ملاحظات سريرية (اختياري)","Clinical notes (optional)")));
  const notes=document.createElement("textarea");notes.rows=3;notesLabel.append(notes);visitForm.append(notesLabel);
  const addVisit=el("button","qd-primary",t("حفظ الزيارة","Save visit"));addVisit.type="submit";visitForm.append(addVisit);
  visitPanel.append(visitForm);
  const trendPanel=el("section","qd-panel");
  trendPanel.append(el("h3","",t("التطور السريري","Clinical trend")));
  const trend=el("div","qd-trend");
  trendPanel.append(trend);
  root.append(heading,player,status,panel,active,visitPanel,trendPanel);
  const busy=(button,on)=>{button.disabled=on;button.setAttribute("aria-busy",String(on));};
  const message=(s,isError=false)=>{status.textContent=s;status.classList.toggle("qd-error",isError);};
  let episodes=[];
  const drawTrend=async id=>{
    trend.replaceChildren();
    if(!id) return;
    const data=await clinic.episodeTrend(id);
    const info=el("p","",t("الزيارات: ","Visits: ")+data.visitCount+
      t(" | دقائق العلاج: "," | Treatment minutes: ")+data.totalTreatmentMinutes);
    trend.append(info);
    if(data.latestPain!==null) trend.append(el("p","",t("الألم: ","Pain: ")+data.firstPain+" → "+data.latestPain));
    const ul=el("ul","");
    data.visits.forEach(v=>ul.append(el("li","",new Date(v.visited_at).toLocaleDateString(ar?"ar-SA":"en-GB")+
      " · "+v.treatment_type+" · "+v.duration_minutes+" min · "+(v.pain_nrs ?? "—")+"/10")));
    trend.append(ul);
  };
  const reload=async preferredId=>{
    episodes=await clinic.episodesForPlayer(playerId);
    list.replaceChildren(); episodeSelect.replaceChildren();
    episodes.forEach(ep=>{
      const title=ep.anatomical_region+" · "+ep.body_side+" · "+ep.complaint_type+" ("+ep.status+")";
      const option=el("option","",title);option.value=ep.id;episodeSelect.append(option);
      const row=el("div","qd-episode");
      row.append(el("span","",title));
      const btn=el("button","qd-secondary",t("عرض التطور","View trend"));
      btn.type="button";btn.addEventListener("click",()=>{episodeSelect.value=ep.id;drawTrend(ep.id).catch(e=>message(e.message,true));});
      row.append(btn);list.append(row);
    });
    if(!episodes.length) list.append(el("p","qd-muted",t("لا توجد شكاوى مسجلة","No recorded complaints")));
    episodeSelect.disabled=!episodes.length;addVisit.disabled=!episodes.length;
    if(preferredId && episodes.some(x=>x.id===preferredId)) episodeSelect.value=preferredId;
    await drawTrend(episodeSelect.value);
  };
  episodeForm.addEventListener("submit",async e=>{
    e.preventDefault();busy(addEpisode,true);message(t("جارٍ الحفظ…","Saving…"));
    try {
      const ep=await clinic.createEpisode({playerExternalId:playerId,anatomicalRegion:region.value,
        bodySide:side.value,complaintType:type.value,onsetDate:onset.value||null});
      await reload(ep.id);episodeForm.reset();
      message(t("تم إنشاء الشكوى على الخادم","Complaint saved on server"));
    }catch(err){message(t("فشل الحفظ: ","Save failed: ")+err.message,true);}
    finally{busy(addEpisode,false);}
  });
  visitForm.addEventListener("submit",async e=>{
    e.preventDefault();busy(addVisit,true);message(t("جارٍ الحفظ…","Saving…"));
    try{
      await clinic.addVisit({episodeId:episodeSelect.value,painNrs:Number(pain.value),
        treatmentType:treatment.value,durationMinutes:Number(duration.value),
        participationClearance:clearance.value,followUpRequired:follow.checked,
        clinicalNotes:notes.value.trim()||null});
      await drawTrend(episodeSelect.value);visitForm.reset();
      message(t("تم حفظ الزيارة على الخادم","Visit saved on server"));
    }catch(err){message(t("فشل الحفظ: ","Save failed: ")+err.message,true);}
    finally{busy(addVisit,false);}
  });
  refresh.addEventListener("click",()=>reload(episodeSelect.value).then(()=>message(t("تم التحديث","Refreshed"))).catch(e=>message(e.message,true)));
  episodeSelect.addEventListener("change",()=>drawTrend(episodeSelect.value).catch(e=>message(e.message,true)));
  reload().catch(e=>message(t("تعذر تحميل السجلات: ","Unable to load records: ")+e.message,true));
  return { refresh:reload, destroy:()=>root.replaceChildren() };
}
