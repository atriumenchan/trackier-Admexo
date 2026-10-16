export type CertifiedTracker = {
  product: string;
  company: string;
  domains: string[];
  transparencyParam?: string;
};

export function isCertifiedHost(host: string, trackers: CertifiedTracker[]) {
  const name = host.toLowerCase().replace(/\.$/, "");
  for (const tracker of trackers) {
    for (const domain of tracker.domains) {
      const listed = domain.toLowerCase().replace(/\.$/, "");
      if (!listed) continue;
      if (name === listed || name.endsWith(`.${listed}`)) return tracker;
    }
  }
  return null;
}

export function transparencyNames(trackers: CertifiedTracker[]) {
  const names = new Set<string>();
  for (const tracker of trackers) {
    if (tracker.transparencyParam) names.add(tracker.transparencyParam.toLowerCase());
  }
  return names;
}

function splitRow(line: string) {
  if (line.includes("|")) return line.split("|").map((cell) => cell.trim()).filter(Boolean);
  if (line.includes("\t")) return line.split("\t").map((cell) => cell.trim());
  return line.split(/\s{2,}/).map((cell) => cell.trim());
}

function cleanDomains(cell: string) {
  const seen = new Set<string>();
  for (const token of cell.split(/[,;\s]+/)) {
    let value = token.trim().toLowerCase().replace(/^\*\./, "");
    value = value.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/\.$/, "");
    if (!value || value.includes(":") || !value.includes(".") || value === "domains") continue;
    seen.add(value);
  }
  return [...seen];
}

export function parseCertifiedTrackerTable(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !/^[-+|=\s]+$/.test(line));
  const rows = lines.map(splitRow).filter((cells) => cells.some(Boolean));
  const start = rows.length && /^product$/i.test(rows[0][0] || "") ? 1 : 0;
  const trackers: CertifiedTracker[] = [];
  for (const cells of rows.slice(start)) {
    if (cells.length < 3) continue;
    const domains = cleanDomains(cells.slice(2, cells.length > 3 ? -1 : undefined).join(" ") || cells[2]);
    const product = cells[0].trim();
    if (!product || !domains.length) continue;
    const transparencyParam = cells.length > 3 ? cells[cells.length - 1].trim() : "";
    const tracker: CertifiedTracker = { product, company: cells[1].trim(), domains };
    if (transparencyParam && !transparencyParam.includes(".")) tracker.transparencyParam = transparencyParam;
    trackers.push(tracker);
  }
  return trackers;
}

export function asCertifiedTrackers(value: unknown) {
  if (!value || typeof value !== "object" || !("trackers" in value) || !Array.isArray(value.trackers)) return [];
  return value.trackers.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const record = row as Partial<CertifiedTracker>;
    const domains = Array.isArray(record.domains) ? record.domains.filter((domain): domain is string => typeof domain === "string" && domain.includes(".")) : [];
    if (!domains.length || typeof record.product !== "string") return [];
    const tracker: CertifiedTracker = { product: record.product, company: typeof record.company === "string" ? record.company : "", domains };
    if (typeof record.transparencyParam === "string" && record.transparencyParam) tracker.transparencyParam = record.transparencyParam;
    return [tracker];
  });
}
