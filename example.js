// Companies House REST API -- Node.js starter kit.
//
// Covers the three things that trip people up when they first integrate:
//   1. Auth: HTTP Basic Auth with your API key as the *username* (empty password)
//   2. Rate limits: 600 requests / 5 minutes, returns 429 + Retry-After when exceeded
//   3. Pagination: officer/PSC/filing-history lists use start_index + items_per_page
//
// Get a free API key: https://developer.company-information.service.gov.uk
// (Applications are usually approved within minutes.)
//
// No dependencies -- built-in fetch (Node 18+, Deno, Bun all work unchanged).

const BASE_URL = "https://api.company-information.service.gov.uk";

function authHeader(apiKey) {
  // CH doesn't use a bearer token or an X-API-Key header -- your key goes
  // in as the HTTP Basic Auth *username*, with an empty password. fetch()
  // has no `auth` option like other HTTP clients, so build the header by hand.
  const encoded = Buffer.from(`${apiKey}:`).toString("base64");
  return { Authorization: `Basic ${encoded}` };
}

async function requestWithBackoff(url, apiKey, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await fetch(url, { headers: authHeader(apiKey) });
    if (res.status === 429) {
      // CH sends Retry-After in seconds -- respect it rather than guessing.
      const waitSeconds = Number(res.headers.get("retry-after") ?? 5);
      await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
      continue;
    }
    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText} for ${url}`);
    }
    return res.json();
  }
  throw new Error(`Still rate-limited after ${maxRetries} retries`);
}

function getCompany(companyNumber, apiKey) {
  return requestWithBackoff(`${BASE_URL}/company/${companyNumber}`, apiKey);
}

async function getAllOfficers(companyNumber, apiKey, pageSize = 35) {
  // Officer lists are paginated -- items_per_page + start_index, not a page
  // number. A company with a long history of appointments needs several
  // requests to get everyone; naive code that only reads the first page
  // silently drops officers.
  const officers = [];
  let startIndex = 0;
  while (true) {
    const url = `${BASE_URL}/company/${companyNumber}/officers?items_per_page=${pageSize}&start_index=${startIndex}`;
    const page = await requestWithBackoff(url, apiKey);
    officers.push(...(page.items ?? []));
    startIndex += pageSize;
    if (startIndex >= (page.total_results ?? 0)) break;
  }
  return officers;
}

async function getLatestAccountsStatus(companyNumber, apiKey) {
  // The iXBRL-vs-PDF gotcha that catches almost everyone building on top of CH.
  //
  // filing-history only gives you *metadata* about a filing, not the document
  // itself. To check whether structured financial data actually exists:
  //   1. Find the latest "accounts" filing in filing-history
  //   2. Follow links.document_metadata to the Document API
  //   3. Check the `resources` map for which content types are available
  //   4. Only request content with an Accept header matching one you found
  //
  // Crucially: `resources` frequently lists only application/pdf, not
  // application/xhtml+xml (iXBRL). A large share of UK companies file
  // small-company or micro-entity accounts that Companies House stores as
  // flat, sometimes scanned, PDFs -- there is no structured data in them to
  // parse, no matter how good your XBRL parser is. Always check `resources`
  // before assuming iXBRL exists; don't find out from a parse failure three
  // steps downstream.
  const url = `${BASE_URL}/company/${companyNumber}/filing-history?category=accounts`;
  const history = await requestWithBackoff(url, apiKey);
  const items = history.items ?? [];
  if (items.length === 0) {
    return { available: false, reason: "no accounts filings found" };
  }

  const latest = items[0];
  const docMetadataUrl = latest.links?.document_metadata;
  if (!docMetadataUrl) {
    return { available: false, reason: "filing has no linked document" };
  }

  const metadata = await requestWithBackoff(docMetadataUrl, apiKey);
  const resources = metadata.resources ?? {};

  if ("application/xhtml+xml" in resources) {
    return { available: true, format: "ixbrl", filedOn: latest.date };
  }
  if ("application/pdf" in resources) {
    return { available: false, reason: "PDF only -- no structured iXBRL data to parse", filedOn: latest.date };
  }
  return { available: false, reason: `unrecognised formats: ${Object.keys(resources)}` };
}

async function main() {
  const apiKey = process.env.CH_API_KEY;
  if (!apiKey) {
    console.error("Set CH_API_KEY -- get one free at https://developer.company-information.service.gov.uk");
    process.exit(1);
  }

  const companyNumber = "00445790"; // Tesco PLC -- a large, active company good for testing

  const company = await getCompany(companyNumber, apiKey);
  console.log(`${company.company_name} (${company.company_number}) -- ${company.company_status}`);

  const officers = await getAllOfficers(companyNumber, apiKey);
  console.log(`${officers.length} officer records (including resigned)`);

  const accounts = await getLatestAccountsStatus(companyNumber, apiKey);
  console.log("Latest accounts:", accounts);
}

main();
