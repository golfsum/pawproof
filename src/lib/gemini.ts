import { uriToBase64 } from './storage';

// Model: gemini-2.5-flash. Uses the public Generative Language REST API so we
// don't need a native SDK. The key must be available on-device as
// EXPO_PUBLIC_GEMINI_API_KEY. For production we recommend proxying through a
// Cloud Function so the key isn't shipped in the bundle.

const MODEL = 'gemini-2.5-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export interface OcrExtractedFields {
  petName: string | null;
  vaccineName: string | null;
  dateGiven: string | null;      // ISO yyyy-mm-dd if confident
  expirationDate: string | null; // ISO yyyy-mm-dd if confident
  clinicName: string | null;
  lotNumber: string | null;
}

export interface OcrResult {
  rawText: string;
  fields: OcrExtractedFields;
}

const OCR_PROMPT = `You are an OCR assistant for a pet care app. The user uploads a photo of a vaccination certificate, rabies tag, or vet record.

Return STRICT JSON (no markdown fences, no commentary). Schema:
{
  "rawText": "<all readable text from the document, preserving line breaks>",
  "fields": {
    "petName": <string or null>,
    "vaccineName": <string or null - e.g. "Rabies", "DA2PP", "Bordetella", "FVRCP">,
    "dateGiven": <"YYYY-MM-DD" or null>,
    "expirationDate": <"YYYY-MM-DD" or null>,
    "clinicName": <string or null>,
    "lotNumber": <string or null>
  }
}

Rules:
- If a field isn't clearly present, set it to null. Do NOT guess.
- Normalise all dates to YYYY-MM-DD. Resolve 2-digit years to 20YY.
- Vaccine name is the canonical vaccine, not the brand (e.g. "DA2PP" not "Vanguard Plus 5").
- petName is the animal, not the owner.
- Output JSON ONLY.`;

export async function extractVaccineInfo(imageUri: string): Promise<OcrResult> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing EXPO_PUBLIC_GEMINI_API_KEY. Add it to your .env file.');
  }

  const base64 = await uriToBase64(imageUri);
  const mimeType = inferMimeType(imageUri);

  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: OCR_PROMPT },
          {
            inlineData: {
              mimeType,
              data: base64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
    },
  };

  const res = await fetch(`${ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Gemini OCR failed (${res.status}): ${errText.slice(0, 300)}`);
  }

  const json = await res.json();
  const text: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini returned no text. Try a clearer photo.');
  }

  let parsed: OcrResult;
  try {
    parsed = JSON.parse(stripFences(text));
  } catch {
    throw new Error('Could not parse Gemini response as JSON.');
  }

  // Defensive normalisation
  parsed.rawText ??= '';
  parsed.fields ??= {
    petName: null,
    vaccineName: null,
    dateGiven: null,
    expirationDate: null,
    clinicName: null,
    lotNumber: null,
  };
  return parsed;
}

function stripFences(s: string): string {
  return s.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
}

// ────────────────────────────────────────────────────────────────────────────
// Universal document extractor. Handles ANY pet-related document (vaccine
// certificate, vet invoice, vet record, insurance card, etc). Auto-detects
// the document type and pulls out everything actionable in one pass. The
// confirm UI then shows whatever was found.
// ────────────────────────────────────────────────────────────────────────────

export type DetectedDocumentType =
  | 'vaccine_certificate'
  | 'vet_invoice'
  | 'vet_record'
  | 'insurance'
  | 'other';

export type PetSex = 'male' | 'female';
export type PetSpeciesGuess =
  | 'dog' | 'cat' | 'bird' | 'rabbit' | 'reptile' | 'fish' | 'small_mammal' | 'other';

export interface ExtractedPetDetails {
  name: string | null;
  species: PetSpeciesGuess | null;
  breed: string | null;
  birthday: string | null;        // ISO yyyy-mm-dd
  approxAgeMonths: number | null;
  weightKg: number | null;        // canonical kg, Gemini converts from lb if needed
  microchip: string | null;
  sex: PetSex | null;
  color: string | null;
}

export interface DocumentOcrResult {
  documentType: DetectedDocumentType;
  suggestedTitle: string;
  rawText: string;
  petName: string | null;
  documentDate: string | null;     // ISO yyyy-mm-dd
  clinicName: string | null;
  invoiceTotal: string | null;
  invoiceNumber: string | null;
  vaccinesAdministered: InvoiceVaccineGiven[];
  vaccinesDue: InvoiceVaccineDue[];
  petDetails: ExtractedPetDetails;
  notes: string | null;
}

const UNIVERSAL_PROMPT = `You are an OCR assistant for a pet care app. The user is uploading a photo of a pet-related document. Common types you'll see:
- Vaccine certificate, rabies tag, or vaccine record card
- Vet invoice, "services rendered" sheet, or visit summary
- Vet record, exam report, or lab results
- Pet insurance card or policy summary
- Other pet paperwork (microchip registration, adoption papers, grooming receipt, etc.)

Return STRICT JSON ONLY (no markdown fences, no commentary). Schema:
{
  "documentType": "vaccine_certificate" | "vet_invoice" | "vet_record" | "insurance" | "other",
  "suggestedTitle": "<short title, 3-6 words, e.g. \\"Buddy rabies certificate\\" or \\"Heartstone Vet · Oct 2025\\">",
  "rawText": "<all readable text from the document, preserving line breaks>",
  "petName": "<animal name or null>",
  "documentDate": "<YYYY-MM-DD or null - the date of the visit / issuance>",
  "clinicName": "<vet clinic / insurance provider / issuer or null>",
  "invoiceTotal": "<string or null - e.g. \\"$123.45\\" with currency symbol>",
  "invoiceNumber": "<string or null>",
  "vaccinesAdministered": [
    {
      "name": "<canonical vaccine name>",
      "dateGiven": "<YYYY-MM-DD or null - defaults to documentDate if blank>",
      "lotNumber": "<string or null>"
    }
  ],
  "vaccinesDue": [
    {
      "name": "<canonical vaccine name>",
      "dueDate": "<YYYY-MM-DD - required, omit entries without a clear date>"
    }
  ],
  "petDetails": {
    "name": "<animal name or null>",
    "species": "dog" | "cat" | "bird" | "rabbit" | "reptile" | "fish" | "small_mammal" | "other" | null,
    "breed": "<breed name or null>",
    "birthday": "<YYYY-MM-DD or null>",
    "approxAgeMonths": <integer months or null - convert years to months (e.g. 1.5 years = 18, 4 years = 48)>,
    "weightKg": <decimal kg or null - convert lb to kg (kg = lb * 0.4536) and round to 1 decimal>,
    "microchip": "<microchip / RFID / chip number, digits only or null>",
    "sex": "male" | "female" | null,
    "color": "<coat / fur color or null, e.g. \\"Black\\", \\"Tan\\", \\"Brindle\\">"
  },
  "notes": "<string or null - anything else worth surfacing (allergies noted, exam findings, owner contact info)>"
}

Rules:
- Identify documentType from the CONTENT, not the file name.

Vaccine extraction (read this carefully):
- A "vaccine administered" is any vaccine that was GIVEN during the visit covered by this document.
- Common signals that a vaccine was administered (any one is sufficient):
  - It appears as a line item in the services / charges / "today's visit" section
  - It has a price, charge, or line-item code next to it
  - It has a "given on", "administered", "vaccinated", or "today's date" notation
  - It has a lot number, serial number, or expiration printed next to it
  - It is listed in a "vaccine history" table with a date that matches or is close to the document date
- A "vaccine due" is one with a clearly stated future date labelled "due", "next due", "due by", "expires", "renewal date", or shown in a "next due" / "upcoming" column.
- If a vaccine appears in BOTH a "given today" context AND with a future "next due" date (very common on vet invoices, where the vaccine was just given today and the next renewal is shown), include it in BOTH arrays.
- BE THOROUGH: if the document lists 4 vaccines with charges and 4 next-due dates, the answer is 4 entries in vaccinesAdministered AND 4 entries in vaccinesDue. Do NOT silently drop entries you're unsure about. If a vaccine name appears anywhere with strong contextual evidence it was given, include it.
- If the document is clearly NOT vaccine-related (e.g. an insurance card with no clinical data), set both arrays to [].

Naming + dates:
- Normalise vaccine names using the alias table below. ALWAYS return the canonical name on the right, never an alias.
- Strip suffixes like "Annual", "1-Year", "3-Year", "Booster", "Adult", "Puppy", "Kitten".
- Normalise all dates to YYYY-MM-DD. Resolve 2-digit years to 20YY.
- petName is the animal, not the owner.

Vaccine alias → canonical map (use this EXACTLY):

  DHPP: the standard dog combo vaccine. Any of these aliases → "DHPP":
    "Parvo", "Parvovirus", "CPV", "Distemper", "CDV", "Adenovirus",
    "Hepatitis", "Parainfluenza", "DA2PP", "DAPP", "DAP", "DHPPi",
    "DAPPi", "DA2P-P", "DHLPP", "5-in-1", "Five-Way", "Combo",
    "Puppy Combo", "Distemper Combo"
    → CAVEAT: only collapse to DHPP when listed as a single line item.
      If the doc clearly itemises separate monovalent shots (rare),
      keep them separate. The 99% case is combo → DHPP.

  FVRCP: the standard cat combo vaccine. Any of these → "FVRCP":
    "Feline Distemper", "Feline Combo", "Rhino", "Rhinotracheitis",
    "Calici", "Calicivirus", "Panleukopenia", "Panleuk", "HCP", "RCP"

  Rabies: "Rab", "Rabies" → "Rabies"
  Bordetella: "Bord", "Kennel Cough", "B. bronchiseptica" → "Bordetella"
  Lepto: "Leptospirosis", "Lepto4", "Lepto 4-way" → "Lepto"
  Lyme: "Borrelia", "Borreliosis" → "Lyme"
  Influenza: "Flu", "Canine Flu", "CIV", "H3N2", "H3N8", "Bivalent Flu" → "Influenza"
  FeLV: "Feline Leukemia", "Leukemia" → "FeLV"
  FIV: "Feline Immunodeficiency" → "FIV"
  Heartworm Test: "HW", "HW Test", "4DX", "SNAP 4DX", "SNAP Test", "Accuplex" → "Heartworm Test"
  Fecal: "Fecal Exam", "Fecal Test", "Ova & Parasites", "O&P" → "Fecal"
  Rattlesnake: "Crotalus" → "Rattlesnake"

Pet vitals extraction:
- Look for vitals anywhere on the document. Common signal labels: "DOB:", "Date of Birth:", "Age:", "Weight:", "Wt:", "Microchip:", "Chip #:", "Breed:", "Sex:", "Color:", "Coat:".
- birthday + approxAgeMonths: if both appear, fill both. If only one, fill that one and leave the other null.
- weightKg: if the document gives weight in lb (or "#"), convert (kg = lb * 0.4536) and round to 1 decimal.
- microchip: digits only (strip spaces, dashes, or "ID:" prefixes).
- sex: lowercase "male" or "female" only. Map M, M(N), MN → male and F, F(S), FS → female. Don't return null just because the doc says "neutered"; that's still male.
- species: lowercase. Map "Canine" → "dog", "Feline" → "cat", "Rabbit" → "rabbit", etc.
- If a vital isn't clearly present, set its field to null. Do NOT guess.

Output:
- If a non-vaccine field isn't clearly present, set it to null. Do NOT guess names, dates, totals.
- Output JSON ONLY.`;

export async function extractDocumentInfo(imageUri: string): Promise<DocumentOcrResult> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing EXPO_PUBLIC_GEMINI_API_KEY. Add it to your .env file.');
  }

  const base64 = await uriToBase64(imageUri);
  const mimeType = inferMimeType(imageUri);

  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: UNIVERSAL_PROMPT },
          { inlineData: { mimeType, data: base64 } },
        ],
      },
    ],
    generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
  };

  const res = await fetch(`${ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Gemini OCR failed (${res.status}): ${errText.slice(0, 300)}`);
  }

  const json = await res.json();
  const text: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned no text. Try a clearer photo.');

  let parsed: DocumentOcrResult;
  try {
    parsed = JSON.parse(stripFences(text));
  } catch {
    throw new Error('Could not parse Gemini response as JSON.');
  }

  // Defensive normalisation
  parsed.documentType ??= 'other';
  parsed.suggestedTitle ??= 'Pet document';
  parsed.rawText ??= '';
  parsed.vaccinesAdministered = Array.isArray(parsed.vaccinesAdministered) ? parsed.vaccinesAdministered : [];
  parsed.vaccinesDue = Array.isArray(parsed.vaccinesDue) ? parsed.vaccinesDue : [];
  if (parsed.documentDate) {
    parsed.vaccinesAdministered = parsed.vaccinesAdministered.map(v => ({
      ...v,
      dateGiven: v.dateGiven ?? parsed.documentDate,
    }));
  }
  parsed.vaccinesAdministered = parsed.vaccinesAdministered.filter(v => v.name && v.name.trim().length > 0);
  parsed.vaccinesDue = parsed.vaccinesDue.filter(v => v.name && v.dueDate);
  return parsed;
}

// ────────────────────────────────────────────────────────────────────────────
// Vet invoice extractor. Pulls structured data from a vet visit invoice:
// document metadata, vaccines administered today, AND future vaccines due.
// Lets the app bulk-create vaccine records + reminders in one scan.
// ────────────────────────────────────────────────────────────────────────────

export interface InvoiceVaccineGiven {
  name: string;
  dateGiven: string | null;   // ISO yyyy-mm-dd
  lotNumber: string | null;
}

export interface InvoiceVaccineDue {
  name: string;
  dueDate: string;            // ISO yyyy-mm-dd, never null (this is the whole point)
}

export interface InvoiceOcrResult {
  rawText: string;
  documentDate: string | null;
  clinicName: string | null;
  petName: string | null;
  invoiceTotal: string | null;
  invoiceNumber: string | null;
  vaccinesAdministered: InvoiceVaccineGiven[];
  vaccinesDue: InvoiceVaccineDue[];
}

const INVOICE_PROMPT = `You are an OCR assistant for a pet care app. The user uploads a photo of a veterinary INVOICE, visit summary, or "services rendered" sheet.

Return STRICT JSON ONLY (no markdown fences, no commentary). Schema:
{
  "rawText": "<all readable text from the document, preserving line breaks>",
  "documentDate": "<YYYY-MM-DD or null - the date of the visit/invoice>",
  "clinicName": "<string or null - vet clinic or hospital name>",
  "petName": "<string or null - the animal, NOT the owner>",
  "invoiceTotal": "<string or null - e.g. \\"$123.45\\" formatted with currency symbol>",
  "invoiceNumber": "<string or null>",
  "vaccinesAdministered": [
    {
      "name": "<canonical vaccine name>",
      "dateGiven": "<YYYY-MM-DD or null>",
      "lotNumber": "<string or null>"
    }
  ],
  "vaccinesDue": [
    {
      "name": "<canonical vaccine name>",
      "dueDate": "<YYYY-MM-DD>"
    }
  ]
}

Rules:
- "vaccinesAdministered" are vaccines given DURING THIS VISIT, usually listed under "Services", "Vaccines", "Today", or similar. If dateGiven isn't explicit per vaccine, leave it null (the app will default to documentDate).
- "vaccinesDue" are future-dated vaccines listed as "due", "next due", "due date", or "upcoming". Only include entries that have a clear future date. Skip ambiguous entries.
- Normalise vaccine names to canonical short forms: "Rabies", "DHPP", "DA2PP", "DAPP", "Bordetella", "FVRCP", "Lepto", "Lyme", "Influenza", "Heartworm Test", "Fecal", etc. Strip frequency suffixes like "Annual" or "1-Year".
- Normalise all dates to YYYY-MM-DD. Resolve 2-digit years to 20YY.
- If a vaccine is listed both as administered today AND with a future due date (next-due), include it in BOTH arrays.
- petName is the animal, not the owner.
- If a field isn't clearly present, set it to null (or empty array). Do NOT guess.
- Output JSON ONLY.`;

export async function extractVetInvoiceInfo(imageUri: string): Promise<InvoiceOcrResult> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing EXPO_PUBLIC_GEMINI_API_KEY. Add it to your .env file.');
  }

  const base64 = await uriToBase64(imageUri);
  const mimeType = inferMimeType(imageUri);

  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: INVOICE_PROMPT },
          { inlineData: { mimeType, data: base64 } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
    },
  };

  const res = await fetch(`${ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Gemini OCR failed (${res.status}): ${errText.slice(0, 300)}`);
  }

  const json = await res.json();
  const text: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned no text. Try a clearer photo.');

  let parsed: InvoiceOcrResult;
  try {
    parsed = JSON.parse(stripFences(text));
  } catch {
    throw new Error('Could not parse Gemini response as JSON.');
  }

  // Defensive normalisation
  parsed.rawText ??= '';
  parsed.vaccinesAdministered = Array.isArray(parsed.vaccinesAdministered) ? parsed.vaccinesAdministered : [];
  parsed.vaccinesDue = Array.isArray(parsed.vaccinesDue) ? parsed.vaccinesDue : [];
  // Backfill: if a vaccine's dateGiven is null but we have documentDate, use it.
  if (parsed.documentDate) {
    parsed.vaccinesAdministered = parsed.vaccinesAdministered.map(v => ({
      ...v,
      dateGiven: v.dateGiven ?? parsed.documentDate,
    }));
  }
  // Sanitise vaccines without a name/date. They're not actionable.
  parsed.vaccinesAdministered = parsed.vaccinesAdministered.filter(v => v.name && v.name.trim().length > 0);
  parsed.vaccinesDue = parsed.vaccinesDue.filter(v => v.name && v.dueDate);

  // Defensive defaults for petDetails (Gemini sometimes omits the block).
  const emptyPet: ExtractedPetDetails = {
    name: null, species: null, breed: null, birthday: null,
    approxAgeMonths: null, weightKg: null, microchip: null,
    sex: null, color: null,
  };
  parsed.petDetails = { ...emptyPet, ...(parsed.petDetails ?? {}) };

  return parsed;
}

function inferMimeType(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.heic') || lower.endsWith('.heif')) return 'image/heic';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.pdf')) return 'application/pdf';
  return 'image/jpeg';
}
