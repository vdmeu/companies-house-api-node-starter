const API_KEY = "rg_live_YOUR_KEY_HERE";
const BASE_URL = "https://api.registrum.co.uk/v1";

const res = await fetch(
  `${BASE_URL}/company/00445790`,
  { headers: { "X-API-Key": API_KEY } }
);
const data = await res.json();
console.log(data);
