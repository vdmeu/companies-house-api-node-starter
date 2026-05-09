# registrum-node

Node.js starter kit for the [Registrum API](https://registrum.co.uk) -- structured UK company data built on Companies House.

## Quick start

No dependencies required -- uses the built-in `fetch` (Node 18+).

```js
const API_KEY = "reg_live_YOUR_KEY_HERE";
const BASE_URL = "https://api.registrum.co.uk/v1";

const res = await fetch(
  `${BASE_URL}/company/00445790`,
  { headers: { "X-API-Key": API_KEY } }
);
const data = await res.json();
console.log(data);
```

Run with:

```bash
node --input-type=module < example.js
```

Works with Node 18+, Deno, and Bun with no changes.

## Get an API key

Free tier: 50 calls/month, no credit card required.

Not ready for a key? Browse 10 live companies/day at [registrum.co.uk](https://registrum.co.uk) -- no sign-up needed.

-> [registrum.co.uk/#get-key](https://registrum.co.uk/#get-key)

## What you get

The Registrum API enriches raw Companies House data with:

- **Structured financials** -- turnover, net assets, employees, YoY comparisons in clean GBP values
- **Director networks** -- 2-degree board traversal to find connected entities
- **PSC / beneficial ownership** -- nature-of-control breakdown, cessation dates
- **ECCTA compliance flags** -- identity verification status per director
- **Batch enrichment** -- enrich multiple companies in one request
- **Intelligent caching** -- 24h company data, 7-day financials, resilient during CH outages
- **Fuzzy search** -- company name to enriched profile in one call

## API reference

Full documentation: [api.registrum.co.uk/docs](https://api.registrum.co.uk/docs)

## License

Examples in this repo are MIT licensed. Data is sourced under the [Open Government Licence v3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/).
