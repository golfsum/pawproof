---
name: pawproof-seo
description: Run PawProof's competitor SEO research, keyword and content-gap analysis, Markdown article drafting, on-site publishing checks, RSS preparation, and social or Google Business Profile syndication. Use for weekly SEO routines, competitor ranking comparisons, keyword prioritization, content briefs, new web/content/blog articles, or refreshing underperforming PawProof content.
---

# PawProof SEO

Use the `pawproof-seo` MCP tools as the metrics source and the repository as the publishing source of truth.

## Weekly workflow

1. Read [references/pawproof-content.md](references/pawproof-content.md) before choosing a topic.
2. Call `competitor_domains` for `pawproof.app` when the competitor set is stale or missing. Remove irrelevant directories, retailers, publishers, and veterinary practices.
3. Choose no more than five direct competitors. Call `content_gaps` once with location `United States`, language `en`, and limit `100`.
4. Save a dated analysis to `.seo-findings/YYYY-MM-DD.md`. Include provider timestamps, target market, the selected competitors, top opportunities, volume, difficulty, rank, intent, and why each topic fits PawProof.
5. Check existing landing pages and `web/content/blog` for cannibalization. Prefer improving an existing page when it already serves the same intent.
6. Select one topic using business relevance first, then intent, attainable difficulty, volume, and competitor agreement. Do not select a topic solely because its score is highest.
7. Research any factual health, vaccine, legal, travel, or safety claims with current primary or authoritative sources. Keyword metrics are not evidence for editorial claims.
8. Draft one original article at `web/content/blog/<descriptive-slug>.md` using `web/content/blog/_template.md`. Use one H1 only through `title`; start body headings at H2.
9. Search every page or article changed in the run for the Unicode em dash character `U+2014`. Replace each one with a comma, parentheses, a colon, or a short sentence.
10. Run `node .agents/skills/pawproof-seo/scripts/validate-article.mjs <article-path>`. Fix every error.
11. Run `node .agents/skills/pawproof-seo/scripts/syndicate.mjs <article-path>`. Without `SEO_SYNDICATION_WEBHOOK_URL`, this writes a reviewable payload; with it, the script sends the payload to the configured automation endpoint.
12. Run `npm run build` in `web`. Do not publish when the build fails.

## Article requirements

- Answer the search intent in the opening paragraph.
- Never use the Unicode em dash character `U+2014`. Use commas, parentheses, colons, or short sentences instead.
- Write with calm empathy for busy or worried pet owners. Stay practical without becoming sentimental, alarmist, or salesy.
- Use the target keyword naturally in the title, introduction, and at least one H2; avoid repetition targets.
- Provide 800-1,800 useful words unless the query is answered better with less.
- Include at least two contextual internal links and one product-relevant next step.
- End with an H2 named `Frequently asked questions` and at least two question-shaped H3s.
- Keep claims specific and support consequential claims with links to authoritative sources.
- Never invent PawProof functionality, customer results, rankings, volumes, quotes, or citations.
- Avoid diagnosis or individualized veterinary advice. Tell readers to consult a veterinarian when decisions depend on a pet's health.

## Metrics rules

- Describe results as the latest provider data, not a live search counter.
- Treat volume as estimated monthly searches and difficulty as a directional provider metric.
- Preserve zero and null as different values.
- Report the market and language with every analysis.
- Keep tool limits low because MCP calls use paid DataForSEO endpoints.

## Publishing behavior

Write content only after a clear opportunity is found. If no opportunity meets the editorial bar, update the findings report and stop without creating filler content. Never publish a draft with failed validation, unsupported medical claims, or a duplicate search intent.
