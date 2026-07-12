export type JsonObject = Record<string, unknown>;

export interface ResearchOptions {
  locationName?: string;
  languageCode?: string;
  limit?: number;
}

export interface KeywordMetric {
  keyword: string;
  searchVolume: number | null;
  cpc: number | null;
  competition: number | null;
  difficulty: number | null;
  intent: string | null;
  rank: number | null;
  url: string | null;
  estimatedTraffic: number | null;
  lastUpdated: string | null;
}

export interface CompetitorMetric {
  domain: string;
  intersections: number | null;
  organicKeywordCount: number | null;
  estimatedTraffic: number | null;
  averagePosition: number | null;
}

export interface GapMetric extends KeywordMetric {
  competitorDomains: string[];
  bestCompetitorRank: number | null;
  opportunityScore: number;
}

const API_BASE = "https://api.dataforseo.com/v3";

function object(value: unknown): JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function clampLimit(value = 100, max = 1000): number {
  return Math.max(1, Math.min(max, Math.trunc(value)));
}

function domainName(value: string): string {
  return value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
}

function taskItems(body: JsonObject): JsonObject[] {
  const task = object(array(body.tasks)[0]);
  const taskStatus = numberOrNull(task.status_code);
  if (taskStatus !== null && taskStatus !== 20000) {
    throw new Error(`DataForSEO task failed (${taskStatus}): ${String(task.status_message ?? "Unknown error")}`);
  }
  const result = object(array(task.result)[0]);
  return array(result.items).map(object);
}

export function normalizeRankedKeyword(item: JsonObject): KeywordMetric | null {
  const keywordData = object(item.keyword_data);
  const keywordInfo = object(keywordData.keyword_info);
  const properties = object(keywordData.keyword_properties);
  const intentInfo = object(keywordData.search_intent_info);
  const rankedElement = object(item.ranked_serp_element);
  const serpItem = object(rankedElement.serp_item);
  const keyword = stringOrNull(keywordData.keyword) ?? stringOrNull(item.keyword);
  if (!keyword) return null;

  return {
    keyword,
    searchVolume: numberOrNull(keywordInfo.search_volume),
    cpc: numberOrNull(keywordInfo.cpc),
    competition: numberOrNull(keywordInfo.competition),
    difficulty: numberOrNull(properties.keyword_difficulty),
    intent: stringOrNull(intentInfo.main_intent),
    rank: numberOrNull(serpItem.rank_group) ?? numberOrNull(serpItem.rank_absolute),
    url: stringOrNull(serpItem.url),
    estimatedTraffic: numberOrNull(serpItem.etv),
    lastUpdated: stringOrNull(keywordInfo.last_updated_time),
  };
}

function scoreGap(metric: KeywordMetric, bestRank: number | null, domainCount: number): number {
  const volume = Math.max(0, metric.searchVolume ?? 0);
  const difficulty = Math.max(0, Math.min(100, metric.difficulty ?? 50));
  const rankSignal = bestRank === null ? 0.5 : Math.max(0.1, (101 - Math.min(100, bestRank)) / 100);
  const score = Math.log10(volume + 10) * (1 - difficulty / 125) * rankSignal * (1 + Math.min(4, domainCount - 1) * 0.15);
  return Math.round(score * 100) / 100;
}

export class DataForSeoClient {
  constructor(
    private readonly login: string,
    private readonly password: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  static fromEnvironment(fetchImpl: typeof fetch = fetch): DataForSeoClient {
    const login = process.env.DATAFORSEO_LOGIN;
    const password = process.env.DATAFORSEO_PASSWORD;
    if (!login || !password) {
      throw new Error("Set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD before using PawProof SEO tools.");
    }
    return new DataForSeoClient(login, password, fetchImpl);
  }

  private async post(path: string, payload: JsonObject): Promise<JsonObject> {
    const response = await this.fetchImpl(`${API_BASE}${path}`, {
      method: "POST",
      headers: {
        authorization: `Basic ${Buffer.from(`${this.login}:${this.password}`).toString("base64")}`,
        "content-type": "application/json",
      },
      body: JSON.stringify([payload]),
    });
    const body = (await response.json()) as JsonObject;
    if (!response.ok) {
      throw new Error(`DataForSEO HTTP ${response.status}: ${String(body.status_message ?? response.statusText)}`);
    }
    const status = numberOrNull(body.status_code);
    if (status !== null && status !== 20000) {
      throw new Error(`DataForSEO request failed (${status}): ${String(body.status_message ?? "Unknown error")}`);
    }
    return body;
  }

  async competitors(target: string, options: ResearchOptions = {}): Promise<CompetitorMetric[]> {
    const body = await this.post("/dataforseo_labs/google/competitors_domain/live", {
      target: domainName(target),
      location_name: options.locationName ?? "United States",
      language_code: options.languageCode ?? "en",
      item_types: ["organic"],
      limit: clampLimit(options.limit, 100),
      order_by: ["metrics.organic.etv,desc"],
    });

    return taskItems(body).map((item) => {
      const metrics = object(object(item.metrics).organic);
      const intersections = object(object(item.intersections).organic);
      return {
        domain: stringOrNull(item.domain) ?? "unknown",
        intersections: numberOrNull(intersections.count) ?? numberOrNull(item.intersections),
        organicKeywordCount: numberOrNull(metrics.count),
        estimatedTraffic: numberOrNull(metrics.etv),
        averagePosition: numberOrNull(metrics.avg_position),
      };
    });
  }

  async rankedKeywords(target: string, options: ResearchOptions = {}): Promise<KeywordMetric[]> {
    const body = await this.post("/dataforseo_labs/google/ranked_keywords/live", {
      target: domainName(target),
      location_name: options.locationName ?? "United States",
      language_code: options.languageCode ?? "en",
      item_types: ["organic"],
      historical_serp_mode: "live",
      limit: clampLimit(options.limit),
      filters: ["keyword_data.keyword_info.search_volume", ">", 0],
      order_by: ["keyword_data.keyword_info.search_volume,desc"],
    });
    return taskItems(body).map(normalizeRankedKeyword).filter((item): item is KeywordMetric => item !== null);
  }

  async keywordOverview(keywords: string[], options: ResearchOptions = {}): Promise<KeywordMetric[]> {
    const cleaned = [...new Set(keywords.map((keyword) => keyword.trim().toLowerCase()).filter(Boolean))].slice(0, 700);
    if (cleaned.length === 0) return [];
    const body = await this.post("/dataforseo_labs/google/keyword_overview/live", {
      keywords: cleaned,
      location_name: options.locationName ?? "United States",
      language_code: options.languageCode ?? "en",
      include_serp_info: true,
    });
    return taskItems(body).map(normalizeRankedKeyword).filter((item): item is KeywordMetric => item !== null);
  }

  async contentGaps(target: string, competitors: string[], options: ResearchOptions = {}): Promise<GapMetric[]> {
    const uniqueCompetitors = [...new Set(competitors.map(domainName))].filter((domain) => domain !== domainName(target)).slice(0, 5);
    const perDomainLimit = clampLimit(options.limit ?? 100, 300);
    const [targetKeywords, ...competitorKeywords] = await Promise.all([
      this.rankedKeywords(target, { ...options, limit: perDomainLimit }),
      ...uniqueCompetitors.map((domain) => this.rankedKeywords(domain, { ...options, limit: perDomainLimit })),
    ]);
    const owned = new Set(targetKeywords.map((item) => item.keyword.toLowerCase()));
    const gaps = new Map<string, { metric: KeywordMetric; domains: Set<string>; bestRank: number | null }>();

    competitorKeywords.forEach((keywords, index) => {
      for (const metric of keywords) {
        const key = metric.keyword.toLowerCase();
        if (owned.has(key)) continue;
        const current = gaps.get(key) ?? { metric, domains: new Set<string>(), bestRank: null };
        current.domains.add(uniqueCompetitors[index]);
        if ((metric.searchVolume ?? 0) > (current.metric.searchVolume ?? 0)) current.metric = metric;
        if (metric.rank !== null && (current.bestRank === null || metric.rank < current.bestRank)) current.bestRank = metric.rank;
        gaps.set(key, current);
      }
    });

    return [...gaps.values()]
      .map(({ metric, domains, bestRank }) => ({
        ...metric,
        competitorDomains: [...domains].sort(),
        bestCompetitorRank: bestRank,
        opportunityScore: scoreGap(metric, bestRank, domains.size),
      }))
      .sort((a, b) => b.opportunityScore - a.opportunityScore || (b.searchVolume ?? 0) - (a.searchVolume ?? 0))
      .slice(0, perDomainLimit);
  }
}
