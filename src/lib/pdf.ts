import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { format } from 'date-fns';
import type { Pet, VaccineRecord, JournalEntry, UserProfile, Medication, SymptomSeverity } from '@/types/models';
import { fmtDate, fmtPetAge } from '@/utils/dates';
import { fmtWeight } from '@/utils/units';
import { SPECIES_LABEL } from '@/utils/petIcon';
import { canonicalizeVaccineName } from '@/utils/vaccineNames';
import { buildSymptomReport, isAppetiteSymptom, type SymptomReport } from '@/utils/insights';

interface PdfArgs {
  pet: Pet;
  profile: UserProfile | null;
  vaccines: VaccineRecord[];
  recentEntries: JournalEntry[];
  medications: JournalEntry[];
}

function escapeHtml(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildHtml(args: PdfArgs): string {
  const { pet, profile, vaccines, recentEntries, medications } = args;
  const today = format(new Date(), 'MMM d, yyyy');

  const petPhoto = pet.photoUrl
    ? `<img class="pet-photo" src="${escapeHtml(pet.photoUrl)}" />`
    : `<div class="pet-photo placeholder">🐾</div>`;

  const vaccineRows = vaccines.length
    ? vaccines
        .map(
          v => `
        <tr>
          <td>${escapeHtml(canonicalizeVaccineName(v.vaccineName))}</td>
          <td>${fmtDate(v.dateGiven)}</td>
          <td>${fmtDate(v.expirationDate)}</td>
          <td>${escapeHtml(v.clinicName ?? '-')}</td>
          <td>${escapeHtml(v.lotNumber ?? '-')}</td>
        </tr>
      `,
        )
        .join('')
    : '<tr><td colspan="5" class="empty">No vaccine records on file.</td></tr>';

  const medRows = medications.length
    ? medications
        .slice(0, 12)
        .map(
          m => `
        <li>
          <strong>${escapeHtml(m.title)}</strong>
          ${m.amount ? `, ${escapeHtml(m.amount)}` : ''}
          <span class="muted"> · ${fmtDate(m.timestamp)}</span>
          ${m.note ? `<div class="note">${escapeHtml(m.note)}</div>` : ''}
        </li>
      `,
        )
        .join('')
    : '<li class="muted empty">No medications logged.</li>';

  const vetVisits = recentEntries.filter(e => e.type === 'vet_visit').slice(0, 6);
  const vetRows = vetVisits.length
    ? vetVisits
        .map(
          e => `
        <li>
          <strong>${escapeHtml(e.title)}</strong>
          <span class="muted"> · ${fmtDate(e.timestamp)}</span>
          ${e.note ? `<div class="note">${escapeHtml(e.note)}</div>` : ''}
        </li>
      `,
        )
        .join('')
    : '<li class="muted empty">No vet visits logged.</li>';

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(pet.name)} · Health Summary</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #1F2933; padding: 40px; background: #FAF7F2; }
  .header { display: flex; align-items: center; gap: 24px; border-bottom: 1px solid #ECE6DC; padding-bottom: 24px; margin-bottom: 24px; }
  .pet-photo { width: 110px; height: 110px; border-radius: 24px; object-fit: cover; background: #E1F1F5; display:flex; align-items:center; justify-content:center; font-size:48px; }
  .pet-photo.placeholder { display:flex; align-items:center; justify-content:center; }
  .title { font-size: 28px; font-weight: 700; margin: 0 0 4px; letter-spacing:-0.3px; }
  .subtitle { color: #6B7280; font-size: 14px; }
  .meta { color: #9CA3AF; font-size: 12px; margin-top: 6px; }
  h2 { font-size: 16px; margin: 28px 0 10px; letter-spacing: 0.4px; text-transform: uppercase; color: #2A8FA8; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; }
  .field { display: flex; flex-direction: column; padding: 12px 14px; background: #fff; border: 1px solid #ECE6DC; border-radius: 12px; }
  .field .label { font-size: 11px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.4px; }
  .field .value { font-size: 15px; color: #1F2933; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #ECE6DC; border-radius: 12px; overflow: hidden; }
  th, td { text-align: left; padding: 10px 12px; font-size: 13px; }
  th { background: #F3EFE9; color: #6B7280; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.4px; }
  td { border-top: 1px solid #ECE6DC; }
  ul { list-style: none; padding: 0; margin: 0; background: #fff; border: 1px solid #ECE6DC; border-radius: 12px; }
  ul li { padding: 10px 14px; border-top: 1px solid #ECE6DC; font-size: 14px; }
  ul li:first-child { border-top: 0; }
  .muted { color: #6B7280; }
  .empty { color: #9CA3AF; font-style: italic; }
  .note { color: #6B7280; font-size: 13px; margin-top: 2px; }
  .warning { padding: 12px 14px; background: #FEF3C7; border-radius: 12px; color: #92400e; margin-top: 6px; font-size: 13px; }
  .danger { padding: 12px 14px; background: #FEE2E2; border-radius: 12px; color: #991b1b; margin-top: 6px; font-size: 13px; }
  .footer { margin-top: 32px; color: #9CA3AF; font-size: 11px; text-align:center; }
</style>
</head>
<body>
  <div class="header">
    ${petPhoto}
    <div>
      <h1 class="title">${escapeHtml(pet.name)}</h1>
      <div class="subtitle">
        ${escapeHtml(SPECIES_LABEL[pet.species])}${pet.breed ? ' · ' + escapeHtml(pet.breed) : ''}
        ${fmtPetAge(pet.birthday, pet.approxAgeMonths) ? ' · ' + fmtPetAge(pet.birthday, pet.approxAgeMonths) : ''}
      </div>
      <div class="meta">Health summary generated ${today}${profile?.email ? ' · ' + escapeHtml(profile.email) : ''}</div>
    </div>
  </div>

  <h2>Owner & Vet</h2>
  <div class="grid">
    <div class="field"><span class="label">Owner</span><span class="value">${escapeHtml(profile?.displayName || profile?.email || '-')}</span></div>
    <div class="field"><span class="label">Vet</span><span class="value">${escapeHtml(pet.vetName || '-')}</span></div>
    <div class="field"><span class="label">Vet phone</span><span class="value">${escapeHtml(pet.vetPhone || '-')}</span></div>
    <div class="field"><span class="label">Vet website</span><span class="value">${escapeHtml(pet.vetWebsite || '-')}</span></div>
    <div class="field"><span class="label">Microchip</span><span class="value">${escapeHtml(pet.microchip || '-')}</span></div>
  </div>

  <h2>Identifiers</h2>
  <div class="grid">
    <div class="field"><span class="label">Species</span><span class="value">${escapeHtml(SPECIES_LABEL[pet.species])}</span></div>
    <div class="field"><span class="label">Breed</span><span class="value">${escapeHtml(pet.breed || '-')}</span></div>
    <div class="field"><span class="label">Birthday</span><span class="value">${fmtDate(pet.birthday)}</span></div>
    <div class="field"><span class="label">Weight</span><span class="value">${fmtWeight(pet.weightKg)}</span></div>
  </div>

  ${pet.allergies ? `<h2>Allergies</h2><div class="warning">${escapeHtml(pet.allergies)}</div>` : ''}
  ${pet.emergencyNotes ? `<h2>Emergency notes</h2><div class="danger">${escapeHtml(pet.emergencyNotes)}</div>` : ''}

  <h2>Current medications</h2>
  <ul>${medRows}</ul>

  <h2>Vaccination records</h2>
  <table>
    <thead>
      <tr><th>Vaccine</th><th>Given</th><th>Expires</th><th>Clinic</th><th>Lot</th></tr>
    </thead>
    <tbody>${vaccineRows}</tbody>
  </table>

  <h2>Recent vet visits</h2>
  <ul>${vetRows}</ul>

  ${pet.notes ? `<h2>Notes</h2><div class="field" style="background:#fff;"><span class="value">${escapeHtml(pet.notes)}</span></div>` : ''}

  <div class="footer">Generated by PawProof. For your records, not a medical document.</div>
</body>
</html>`;
}

export async function generatePetHealthPdf(args: PdfArgs): Promise<string> {
  const html = buildHtml(args);
  const { uri } = await Print.printToFileAsync({ html });
  return uri;
}

export async function sharePetHealthPdf(args: PdfArgs): Promise<void> {
  const uri = await generatePetHealthPdf(args);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `${args.pet.name} health summary` });
  }
}

// ── Pet sitter PDF: tuned for someone caring for the pet temporarily.
//    Leads with feeding/walk routines, current meds, contacts, and "do not
//    do" notes. De-emphasises old vaccine records in favor of actionable info.

interface SitterPdfArgs {
  pet: Pet;
  profile: UserProfile | null;
  medications: Medication[];
  recentEntries: JournalEntry[];
}

function buildSitterHtml(args: SitterPdfArgs): string {
  const { pet, profile, medications, recentEntries } = args;
  const today = format(new Date(), 'MMM d, yyyy');

  const petPhoto = pet.photoUrl
    ? `<img class="pet-photo" src="${escapeHtml(pet.photoUrl)}" />`
    : `<div class="pet-photo placeholder">🐾</div>`;

  // Pull routines from recent entries: show what time the pet was last fed,
  // walked, given meds. Helpful baseline for a sitter.
  const recentFeeds = recentEntries.filter(e => e.type === 'fed').slice(0, 3);
  const recentWalks = recentEntries.filter(e => e.type === 'walk').slice(0, 3);

  const medRows = medications.filter(m => m.isActive).length
    ? medications.filter(m => m.isActive).map(m => `
        <li>
          <strong>${escapeHtml(m.name)}</strong>
          ${m.dosage ? `, ${escapeHtml(m.dosage)}` : ''}
          <div class="note">
            ${frequencyLabel(m.frequency)}${m.instructions ? ` · ${escapeHtml(m.instructions)}` : ''}
          </div>
        </li>
      `).join('')
    : '<li class="muted empty">No active medications.</li>';

  const recentRoutine = (entries: JournalEntry[]): string => entries.length
    ? entries.map(e => `<li>${escapeHtml(e.title)} <span class="muted">· ${escapeHtml(format(new Date(e.timestamp), 'EEE p'))}</span>${e.note ? `<div class="note">${escapeHtml(e.note)}</div>` : ''}</li>`).join('')
    : '<li class="muted empty">No recent log.</li>';

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(pet.name)} · Sitter Guide</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #1F2933; padding: 40px; background: #FAF7F2; }
  .header { display: flex; align-items: center; gap: 24px; border-bottom: 1px solid #ECE6DC; padding-bottom: 24px; margin-bottom: 24px; }
  .pet-photo { width: 110px; height: 110px; border-radius: 24px; object-fit: cover; background: #E1F1F5; display:flex; align-items:center; justify-content:center; font-size:48px; }
  .pet-photo.placeholder { display:flex; align-items:center; justify-content:center; }
  .title { font-size: 28px; font-weight: 700; margin: 0 0 4px; letter-spacing:-0.3px; }
  .subtitle { color: #6B7280; font-size: 14px; }
  .meta { color: #9CA3AF; font-size: 12px; margin-top: 6px; }
  h2 { font-size: 14px; margin: 28px 0 10px; letter-spacing: 0.4px; text-transform: uppercase; color: #2A8FA8; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; }
  .field { display: flex; flex-direction: column; padding: 12px 14px; background: #fff; border: 1px solid #ECE6DC; border-radius: 12px; }
  .field .label { font-size: 11px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.4px; }
  .field .value { font-size: 15px; color: #1F2933; margin-top: 2px; }
  ul { list-style: none; padding: 0; margin: 0; background: #fff; border: 1px solid #ECE6DC; border-radius: 12px; }
  ul li { padding: 10px 14px; border-top: 1px solid #ECE6DC; font-size: 14px; }
  ul li:first-child { border-top: 0; }
  .muted { color: #6B7280; }
  .empty { color: #9CA3AF; font-style: italic; }
  .note { color: #6B7280; font-size: 13px; margin-top: 2px; }
  .warning { padding: 12px 14px; background: #FEF3C7; border-radius: 12px; color: #92400e; font-size: 14px; line-height: 1.5; }
  .danger { padding: 12px 14px; background: #FEE2E2; border-radius: 12px; color: #991b1b; font-size: 14px; line-height: 1.5; }
  .contact-row { display: flex; justify-content: space-between; padding: 10px 0; border-top: 1px solid #ECE6DC; }
  .contact-row:first-child { border-top: 0; }
  .contact-row .label { color: #6B7280; font-size: 13px; }
  .contact-row .value { font-weight: 600; }
  .footer { margin-top: 32px; color: #9CA3AF; font-size: 11px; text-align:center; }
</style>
</head>
<body>
  <div class="header">
    ${petPhoto}
    <div>
      <h1 class="title">${escapeHtml(pet.name)} · Sitter Guide</h1>
      <div class="subtitle">
        ${escapeHtml(SPECIES_LABEL[pet.species])}${pet.breed ? ' · ' + escapeHtml(pet.breed) : ''}${pet.weightKg != null ? ' · ' + fmtWeight(pet.weightKg) : ''}
      </div>
      <div class="meta">Prepared ${today}${profile?.email ? ' · ' + escapeHtml(profile.email) : ''}</div>
    </div>
  </div>

  ${pet.allergies ? `<h2>Allergies</h2><div class="warning">⚠ ${escapeHtml(pet.allergies)}</div>` : ''}
  ${pet.emergencyNotes ? `<h2>Important</h2><div class="danger">${escapeHtml(pet.emergencyNotes)}</div>` : ''}

  ${pet.feedingInstructions ? `<h2>Feeding</h2><div class="field"><span class="value">${escapeHtml(pet.feedingInstructions)}</span></div>` : ''}
  ${pet.walkRoutine ? `<h2>Walks &amp; exercise</h2><div class="field"><span class="value">${escapeHtml(pet.walkRoutine)}</span></div>` : ''}
  ${pet.behaviorNotes ? `<h2>Behavior notes</h2><div class="field"><span class="value">${escapeHtml(pet.behaviorNotes)}</span></div>` : ''}
  ${pet.favoriteThings ? `<h2>Favorites</h2><div class="field"><span class="value">${escapeHtml(pet.favoriteThings)}</span></div>` : ''}
  ${pet.boardingInstructions ? `<h2>Boarding &amp; sitting</h2><div class="field"><span class="value">${escapeHtml(pet.boardingInstructions)}</span></div>` : ''}

  <h2>Current medications</h2>
  <ul>${medRows}</ul>

  <h2>Recent feeding logs</h2>
  <ul>${recentRoutine(recentFeeds)}</ul>

  <h2>Recent walks</h2>
  <ul>${recentRoutine(recentWalks)}</ul>

  <h2>Contacts</h2>
  <div class="field">
    <div class="contact-row"><span class="label">Vet</span><span class="value">${escapeHtml(pet.vetName || '-')}</span></div>
    <div class="contact-row"><span class="label">Vet phone</span><span class="value">${escapeHtml(pet.vetPhone || '-')}</span></div>
    <div class="contact-row"><span class="label">Emergency contact</span><span class="value">${escapeHtml(pet.emergencyContactName || '-')}</span></div>
    <div class="contact-row"><span class="label">Emergency phone</span><span class="value">${escapeHtml(pet.emergencyContactPhone || '-')}</span></div>
    <div class="contact-row"><span class="label">Microchip</span><span class="value">${escapeHtml(pet.microchip || '-')}</span></div>
  </div>

  ${pet.notes ? `<h2>Owner notes</h2><div class="field"><span class="value">${escapeHtml(pet.notes)}</span></div>` : ''}

  <div class="footer">Generated by PawProof · Not a medical document</div>
</body>
</html>`;
}

function frequencyLabel(f: Medication['frequency']): string {
  const map: Record<Medication['frequency'], string> = {
    once_daily: 'Once a day',
    twice_daily: '2× a day',
    three_times_daily: '3× a day',
    every_other_day: 'Every 2 days',
    weekly: 'Weekly',
    monthly: 'Monthly',
    as_needed: 'As needed',
  };
  return map[f];
}

export async function shareSitterPdf(args: SitterPdfArgs): Promise<void> {
  const html = buildSitterHtml(args);
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `${args.pet.name} sitter guide` });
  }
}

// ── Vet report PDF: a symptom-focused summary for a veterinary visit.
//    Leads with appetite (the most common owner concern), then a per-symptom
//    summary table (count / first seen / last seen / severity), a
//    chronological symptom log with the owner's notes, and current
//    medications + vaccine status for context.

interface VetReportArgs {
  pet: Pet;
  profile: UserProfile | null;
  /** All of the pet's journal entries (the report filters to the range). */
  entries: JournalEntry[];
  medications: Medication[];
  vaccines: VaccineRecord[];
  /** Range start (ISO). */
  fromIso: string;
  /** Range end (ISO). Defaults to now. */
  toIso?: string;
}

const SEVERITY_LABEL: Record<SymptomSeverity, string> = {
  mild: 'Mild',
  medium: 'Medium',
  serious: 'Serious',
};

function severityChips(breakdown: Record<SymptomSeverity, number>): string {
  const parts: string[] = [];
  (['serious', 'medium', 'mild'] as SymptomSeverity[]).forEach(s => {
    if (breakdown[s] > 0) {
      const cls = s === 'serious' ? 'sev-serious' : s === 'medium' ? 'sev-medium' : 'sev-mild';
      parts.push(`<span class="sev ${cls}">${breakdown[s]} ${SEVERITY_LABEL[s]}</span>`);
    }
  });
  return parts.join(' ') || '<span class="muted">—</span>';
}

function relDays(iso: string): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '';
  const days = Math.floor((Date.now() - then.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

function buildVetReportHtml(args: VetReportArgs): string {
  const { pet, profile, entries, medications, vaccines, fromIso, toIso } = args;
  const report: SymptomReport = buildSymptomReport(entries, fromIso, toIso);
  const today = format(new Date(), 'MMM d, yyyy');
  const rangeLabel = `${fmtDate(report.fromIso)} – ${fmtDate(report.toIso)}`;

  const petPhoto = pet.photoUrl
    ? `<img class="pet-photo" src="${escapeHtml(pet.photoUrl)}" />`
    : `<div class="pet-photo placeholder">🐾</div>`;

  // Appetite callout — the headline concern. Pulls the appetite group if present.
  const appetite = report.groups.find(g => isAppetiteSymptom(g.name));
  const appetiteBlock = appetite
    ? `<div class="callout">
         <div class="callout-title">⚠ Appetite — ${escapeHtml(appetite.name)}</div>
         <div class="callout-body">
           Reported <strong>${appetite.count}×</strong> in this period.
           Most recent: <strong>${fmtDate(appetite.lastSeen)}</strong> (${relDays(appetite.lastSeen)}).
           First in range: ${fmtDate(appetite.firstSeen)}.
           <div class="callout-sev">${severityChips(appetite.severityBreakdown)}</div>
         </div>
       </div>`
    : `<div class="callout callout-ok">No appetite issues (e.g. "Not eating") were logged in this period.</div>`;

  // Per-symptom summary table.
  const summaryRows = report.groups.length
    ? report.groups
        .map(
          g => `
        <tr>
          <td><strong>${escapeHtml(g.name)}</strong></td>
          <td>${g.count}×</td>
          <td>${fmtDate(g.firstSeen)}</td>
          <td>${fmtDate(g.lastSeen)}<div class="muted">${relDays(g.lastSeen)}</div></td>
          <td>${severityChips(g.severityBreakdown)}</td>
        </tr>`,
        )
        .join('')
    : '<tr><td colspan="5" class="empty">No symptoms logged in this period.</td></tr>';

  // Chronological symptom log with notes.
  const logRows = report.timeline.length
    ? report.timeline
        .map(
          o => `
        <li>
          <strong>${escapeHtml(o.name)}</strong>
          ${o.severity ? `<span class="sev sev-${o.severity}">${SEVERITY_LABEL[o.severity]}</span>` : ''}
          <span class="muted"> · ${fmtDate(o.timestamp)}</span>
          ${o.note ? `<div class="note">${escapeHtml(o.note)}</div>` : ''}
        </li>`,
        )
        .join('')
    : '<li class="muted empty">No symptom entries to list.</li>';

  const activeMeds = medications.filter(m => m.isActive);
  const medRows = activeMeds.length
    ? activeMeds
        .map(
          m => `
        <li>
          <strong>${escapeHtml(m.name)}</strong>${m.dosage ? `, ${escapeHtml(m.dosage)}` : ''}
          <div class="note">${frequencyLabel(m.frequency)}${m.instructions ? ` · ${escapeHtml(m.instructions)}` : ''}</div>
        </li>`,
        )
        .join('')
    : '<li class="muted empty">No active medications.</li>';

  const sortedVax = [...vaccines].sort((a, b) => +new Date(b.dateGiven) - +new Date(a.dateGiven)).slice(0, 8);
  const vaxRows = sortedVax.length
    ? sortedVax
        .map(
          v => `
        <tr>
          <td>${escapeHtml(canonicalizeVaccineName(v.vaccineName))}</td>
          <td>${fmtDate(v.dateGiven)}</td>
          <td>${fmtDate(v.expirationDate)}</td>
        </tr>`,
        )
        .join('')
    : '<tr><td colspan="3" class="empty">No vaccine records on file.</td></tr>';

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(pet.name)} · Vet Report</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #1F2933; padding: 40px; background: #FAF7F2; }
  .header { display: flex; align-items: center; gap: 24px; border-bottom: 1px solid #ECE6DC; padding-bottom: 24px; margin-bottom: 20px; }
  .pet-photo { width: 96px; height: 96px; border-radius: 22px; object-fit: cover; background: #E1F1F5; display:flex; align-items:center; justify-content:center; font-size:42px; }
  .pet-photo.placeholder { display:flex; align-items:center; justify-content:center; }
  .title { font-size: 26px; font-weight: 700; margin: 0 0 4px; letter-spacing:-0.3px; }
  .subtitle { color: #6B7280; font-size: 14px; }
  .meta { color: #9CA3AF; font-size: 12px; margin-top: 6px; }
  h2 { font-size: 14px; margin: 26px 0 10px; letter-spacing: 0.4px; text-transform: uppercase; color: #2A8FA8; }
  .callout { padding: 14px 16px; background: #FEF3C7; border: 1px solid #FCD96B; border-radius: 12px; margin-top: 6px; }
  .callout-ok { background: #ECFDF5; border-color: #A7F3D0; color: #065F46; font-size: 14px; }
  .callout-title { font-weight: 700; color: #92400e; font-size: 15px; }
  .callout-body { color: #78350f; font-size: 13px; margin-top: 4px; line-height: 1.5; }
  .callout-sev { margin-top: 8px; }
  table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #ECE6DC; border-radius: 12px; overflow: hidden; }
  th, td { text-align: left; padding: 10px 12px; font-size: 13px; vertical-align: top; }
  th { background: #F3EFE9; color: #6B7280; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.4px; }
  td { border-top: 1px solid #ECE6DC; }
  ul { list-style: none; padding: 0; margin: 0; background: #fff; border: 1px solid #ECE6DC; border-radius: 12px; }
  ul li { padding: 10px 14px; border-top: 1px solid #ECE6DC; font-size: 14px; }
  ul li:first-child { border-top: 0; }
  .muted { color: #6B7280; font-size: 12px; }
  .empty { color: #9CA3AF; font-style: italic; }
  .note { color: #6B7280; font-size: 13px; margin-top: 3px; }
  .sev { display: inline-block; padding: 1px 7px; border-radius: 999px; font-size: 11px; font-weight: 700; margin-left: 4px; }
  .sev-mild { background: #D1FAE5; color: #065F46; }
  .sev-medium { background: #FEF3C7; color: #92400e; }
  .sev-serious { background: #FEE2E2; color: #991b1b; }
  .footer { margin-top: 32px; color: #9CA3AF; font-size: 11px; text-align:center; }
</style>
</head>
<body>
  <div class="header">
    ${petPhoto}
    <div>
      <h1 class="title">${escapeHtml(pet.name)} · Vet Report</h1>
      <div class="subtitle">
        ${escapeHtml(SPECIES_LABEL[pet.species])}${pet.breed ? ' · ' + escapeHtml(pet.breed) : ''}${fmtPetAge(pet.birthday, pet.approxAgeMonths) ? ' · ' + fmtPetAge(pet.birthday, pet.approxAgeMonths) : ''}${pet.weightKg != null ? ' · ' + fmtWeight(pet.weightKg) : ''}
      </div>
      <div class="meta">Reporting period: ${rangeLabel} · Generated ${today}${profile?.email ? ' · ' + escapeHtml(profile.email) : ''}</div>
    </div>
  </div>

  <h2>Appetite</h2>
  ${appetiteBlock}

  <h2>Symptom summary (${report.totalSymptomEntries} ${report.totalSymptomEntries === 1 ? 'entry' : 'entries'})</h2>
  <table>
    <thead><tr><th>Symptom</th><th>Count</th><th>First</th><th>Most recent</th><th>Severity</th></tr></thead>
    <tbody>${summaryRows}</tbody>
  </table>

  <h2>Symptom log</h2>
  <ul>${logRows}</ul>

  <h2>Current medications</h2>
  <ul>${medRows}</ul>

  <h2>Recent vaccinations</h2>
  <table>
    <thead><tr><th>Vaccine</th><th>Given</th><th>Expires</th></tr></thead>
    <tbody>${vaxRows}</tbody>
  </table>

  ${pet.allergies ? `<h2>Allergies</h2><div class="callout">${escapeHtml(pet.allergies)}</div>` : ''}

  <div class="footer">Generated by PawProof from owner-reported logs. Informational only — not a medical diagnosis.</div>
</body>
</html>`;
}

export async function shareVetReportPdf(args: VetReportArgs): Promise<void> {
  const html = buildVetReportHtml(args);
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `${args.pet.name} vet report` });
  }
}
