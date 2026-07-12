#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { DataForSeoClient } from "./dataforseo.js";
import { loadRepositoryEnv } from "./env.js";

loadRepositoryEnv();

const commonShape = {
  location: z.string().default("United States").describe("Full DataForSEO location name."),
  language: z.string().default("en").describe("Language code."),
  limit: z.number().int().min(1).max(300).default(100),
};

const server = new McpServer(
  { name: "pawproof-seo", version: "0.1.0" },
  {
    instructions:
      "Read-only paid SEO research for PawProof. Every tool calls DataForSEO and may incur cost. Prefer one content_gaps call per weekly run, keep limits at 100 unless more data is necessary, and report the location, language, data timestamps, and opportunity-score formula. Search volume is monthly provider data, not a live counter.",
  },
);

function textResult(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

function options(input: { location: string; language: string; limit: number }) {
  return { locationName: input.location, languageCode: input.language, limit: input.limit };
}

server.registerTool(
  "competitor_domains",
  {
    title: "Find organic competitors",
    description: "Find domains sharing Google organic rankings with a target domain.",
    inputSchema: { target: z.string().min(1).default("pawproof.app"), ...commonShape },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
  },
  async (input) => textResult(await DataForSeoClient.fromEnvironment().competitors(input.target, options(input))),
);

server.registerTool(
  "ranked_keywords",
  {
    title: "Get ranked keywords",
    description: "Return normalized Google organic keywords, positions, URLs, volume, difficulty, and estimated traffic for a domain.",
    inputSchema: { target: z.string().min(1), ...commonShape },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
  },
  async (input) => textResult(await DataForSeoClient.fromEnvironment().rankedKeywords(input.target, options(input))),
);

server.registerTool(
  "keyword_metrics",
  {
    title: "Get keyword metrics",
    description: "Return normalized monthly Google keyword volume, CPC, difficulty, intent, SERP data, and source timestamps.",
    inputSchema: {
      keywords: z.array(z.string().min(1)).min(1).max(700),
      location: commonShape.location,
      language: commonShape.language,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
  },
  async (input) => textResult(await DataForSeoClient.fromEnvironment().keywordOverview(input.keywords, {
    locationName: input.location,
    languageCode: input.language,
  })),
);

server.registerTool(
  "content_gaps",
  {
    title: "Find competitor content gaps",
    description: "Compare PawProof with up to five competitors and rank missing organic keywords using volume, difficulty, competitor position, and cross-domain agreement.",
    inputSchema: {
      target: z.string().min(1).default("pawproof.app"),
      competitors: z.array(z.string().min(1)).min(1).max(5),
      ...commonShape,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
  },
  async (input) => textResult({
    target: input.target,
    location: input.location,
    language: input.language,
    scoreFormula: "log10(volume + 10) × (1 - difficulty / 125) × competitor-rank signal × cross-domain multiplier",
    gaps: await DataForSeoClient.fromEnvironment().contentGaps(input.target, input.competitors, options(input)),
  }),
);

await server.connect(new StdioServerTransport());
