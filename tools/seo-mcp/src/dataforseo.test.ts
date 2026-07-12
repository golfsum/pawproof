import assert from "node:assert/strict";
import test from "node:test";
import { DataForSeoClient, normalizeRankedKeyword } from "./dataforseo.js";

test("normalizes a ranked keyword", () => {
  const result = normalizeRankedKeyword({
    keyword_data: {
      keyword: "pet health records",
      keyword_info: { search_volume: 720, cpc: 2.4, competition: 0.31, last_updated_time: "2026-06-01" },
      keyword_properties: { keyword_difficulty: 28 },
      search_intent_info: { main_intent: "commercial" },
    },
    ranked_serp_element: { serp_item: { rank_group: 7, url: "https://example.com/pets", etv: 31.5 } },
  });
  assert.deepEqual(result, {
    keyword: "pet health records",
    searchVolume: 720,
    cpc: 2.4,
    competition: 0.31,
    difficulty: 28,
    intent: "commercial",
    rank: 7,
    url: "https://example.com/pets",
    estimatedTraffic: 31.5,
    lastUpdated: "2026-06-01",
  });
});

test("computes gaps and excludes keywords already owned by PawProof", async () => {
  const responses = [
    [ranked("owned keyword", 100, 18, 4)],
    [ranked("owned keyword", 100, 18, 3), ranked("pet record app", 1000, 35, 5)],
    [ranked("pet record app", 1000, 35, 2), ranked("dog medical history", 500, 20, 8)],
  ];
  let index = 0;
  const fetchMock = async () => new Response(JSON.stringify({
    status_code: 20000,
    tasks: [{ status_code: 20000, result: [{ items: responses[index++] }] }],
  }), { status: 200, headers: { "content-type": "application/json" } });
  const client = new DataForSeoClient("login", "password", fetchMock as typeof fetch);
  const gaps = await client.contentGaps("pawproof.app", ["one.test", "two.test"], { limit: 10 });
  assert.equal(gaps[0].keyword, "pet record app");
  assert.deepEqual(gaps[0].competitorDomains, ["one.test", "two.test"]);
  assert.equal(gaps.some((gap) => gap.keyword === "owned keyword"), false);
});

function ranked(keyword: string, searchVolume: number, difficulty: number, rank: number) {
  return {
    keyword_data: { keyword, keyword_info: { search_volume: searchVolume }, keyword_properties: { keyword_difficulty: difficulty } },
    ranked_serp_element: { serp_item: { rank_group: rank } },
  };
}
