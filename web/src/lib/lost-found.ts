export type LostFoundReportType = "lost" | "found";
export type LostFoundLifecycle = "draft" | "active" | "reunited" | "closed";

export type PublicPetReport = {
  id: string;
  reportType: LostFoundReportType;
  lifecycleStatus: LostFoundLifecycle;
  petName?: string | null;
  species: string;
  breed?: string | null;
  colors?: string | null;
  distinguishingFeatures?: string | null;
  size?: string | null;
  collarDescription?: string | null;
  approachInstructions?: string | null;
  photoUrls: string[];
  approximateLocation: string;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  eventAt: string;
  createdAt: string;
  updatedAt: string;
};

export function reportTitle(report: Pick<PublicPetReport, "reportType" | "petName" | "species">) {
  const label = report.reportType === "lost" ? "Lost" : "Found";
  return `${label} ${report.petName?.trim() || report.species}`;
}

export function statusLabel(status: LostFoundLifecycle) {
  if (status === "reunited") return "Reunited";
  if (status === "closed") return "Closed";
  if (status === "draft") return "Draft";
  return "Active";
}
