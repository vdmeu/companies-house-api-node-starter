# companies-house-api-node-starter

A Node.js starter kit for the [UK Companies House REST API](https://developer.company-information.service.gov.uk) -- the free, official register of every UK company. This repo covers the three things that trip almost everyone up on their first integration:

- **Auth** -- CH uses HTTP Basic Auth with your key as the username, not a bearer token or `X-API-Key` header
- **Rate limits** -- 600 requests per 5-minute rolling window, with a `429` + `Retry-After` you need to respect
- **iXBRL vs PDF** -- filed accounts are only sometimes structured data; a lot of the time they're a flat PDF with nothing to parse

One file, no dependencies -- uses the built-in `fetch` (Node 18+, Deno, and Bun all work unchanged).

## Get an API key

Free, official, no credit card: [developer.company-information.service.gov.uk](https://developer.company-information.service.gov.uk). Register an application, generate a REST API key, and you're in -- usually approved within minutes.

## Quick start

```bash
export CH_API_KEY=your_key_here
node example.js
```

```js
// The auth gotcha: your API key is the HTTP Basic Auth *username*.
// The password is left empty, and fetch() has no `auth` option, so you
// have to build the header by hand. This is not a bearer token.
const encoded = Buffer.from(`${CH_API_KEY}:`).toString("base64");

const res = await fetch(
  "https://api.company-information.service.gov.uk/company/00445790",
  { headers: { Authorization: `Basic ${encoded}` } }
);
const data = await res.json();
console.log(data.company_name); // TESCO PLC
```

## The gotchas, in detail

### 1. Auth is Basic Auth, not a header -- and fetch() makes you build it by hand

Most REST APIs today use `Authorization: Bearer <token>` or a custom header. Companies House predates that convention -- your key goes in as the HTTP Basic Auth username with an empty password. Unlike `requests` in Python or `axios`, the Fetch API has no built-in `auth` option, so you base64-encode `"key:"` yourself:

```js
Buffer.from(`${apiKey}:`).toString("base64")
```

Sending it as `X-API-Key` or a raw bearer token returns a `401` that doesn't tell you what you did wrong.

### 2. Rate limits: 600 req / 5 min, and you need to back off correctly

Each key is capped at 600 requests per rolling 5-minute window. Exceed it and you get a `429` with a `Retry-After` header telling you how many seconds to wait. `example.js`'s `requestWithBackoff()` reads that header instead of guessing a fixed sleep time -- guessing wrong either wastes time or gets you rate-limited again immediately.

### 3. Pagination uses `start_index`, not a page number

Officer, PSC, and filing-history endpoints return `items`, `items_per_page`, `start_index`, and `total_results`. There's no `page=2` parameter -- you increment `start_index` by your page size and stop when it reaches `total_results`. Code that only reads the first page will silently drop officers on any company with a long appointment history.

### 4. Filed accounts are metadata first, document second -- and often a plain PDF

`filing-history` tells you a set of accounts was filed and links to a `document_metadata` URL. That metadata lists which content types are actually available for that filing, under `resources`. This is the step people skip -- and it matters, because a large share of UK companies (small companies and micro-entities in particular) file accounts as flat, sometimes scanned, PDFs with **no structured iXBRL data at all**. If you build a parser assuming iXBRL will always be there, it'll work in testing on large companies and then silently fail across most of your real dataset. Check `resources` first; don't find out from a parse failure three steps downstream.

`getLatestAccountsStatus()` in `example.js` shows the full check.

## Beyond the raw API

This repo is a thin, honest wrapper around the official CH API -- it doesn't hide any of the above, it just handles it correctly. If you'd rather not deal with iXBRL parsing, pagination loops, and your own caching layer at all, [Registrum](https://registrum.co.uk) sits on top of the same official data and returns:

- Structured financials already parsed out of iXBRL (or a clear `data_quality` reason when a company's accounts are PDF-only)
- Director networks traversed to 2 degrees in one call
- PSC / beneficial ownership decoded to plain English
- Built-in caching, so you rarely hit the 600 req/5min ceiling in the first place

Free tier, no credit card: [registrum.co.uk](https://registrum.co.uk) -- 50 calls/month, or browse without a key at all.

## License

Code in this repo is MIT licensed. Companies House data is published under the [Open Government Licence v3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/).
