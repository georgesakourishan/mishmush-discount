// api/generate-discount.js
// Vercel serverless function for Shopify Flow -> Unique discount code per customer

const API_VERSION = "2025-10";
const SHOP = process.env.SHOP;                  // e.g. "1dkprr-fx.myshopify.com"
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;    // shpat_...
const PRICE_RULE_ID = process.env.PRICE_RULE_ID; // "1668282417377"
const FLOW_HMAC_SECRET = process.env.FLOW_HMAC_SECRET || ""; // optional shared secret

// ----- utils -----
async function shopifyFetch(path, init = {}) {
  const url = `https://${SHOP}/admin/api/${API_VERSION}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": ADMIN_TOKEN,
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Shopify API ${res.status} ${res.statusText}: ${text}`);
  }
  return res.json();
}

function randomCode() {
  return `MISHMUSH-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

async function getExistingWelcomeCode(customerId) {
  // Try to read the metafield if it exists
  try {
    const data = await shopifyFetch(`/customers/${customerId}/metafields.json?namespace=custom&key=welcome_discount_code`);
    // REST returns array for /metafields on a resource; querying by ns/key via params returns all metafields,
    // so filter client-side to be safe.
    const mf = (data.metafields || []).find(m => m.namespace === "custom" && m.key === "welcome_discount_code");
    return mf ? { code: mf.value, metafieldId: mf.id } : null;
  } catch (e) {
    // If 404 or empty, treat as not existing
    return null;
  }
}

async function writeWelcomeCode(customerId, code) {
  // Create or update metafield (create is simpler; if exists, update)
  const existing = await shopifyFetch(`/customers/${customerId}/metafields.json?namespace=custom`);
  const current = (existing.metafields || []).find(m => m.key === "welcome_discount_code");

  const payload = {
    metafield: {
      namespace: "custom",
      key: "welcome_discount_code",
      type: "single_line_text_field",
      value: code,
    },
  };

  if (current) {
    // Update
    const res = await shopifyFetch(`/metafields/${current.id}.json`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return res.metafield;
  } else {
    // Create
    const res = await shopifyFetch(`/customers/${customerId}/metafields.json`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return res.metafield;
  }
}

async function createDiscountCode(priceRuleId, desiredCode) {
  const res = await shopifyFetch(`/price_rules/${priceRuleId}/discount_codes.json`, {
    method: "POST",
    body: JSON.stringify({ discount_code: { code: desiredCode } }),
  });
  return res.discount_code;
}

function safeParse(body) {
  try { return JSON.parse(body); } catch { return null; }
}

function verifyFlowHmac(req, rawBody) {
  if (!FLOW_HMAC_SECRET) return true; // skip if not set
  const sent = req.headers["x-flow-signature"] || req.headers["x-shopify-hmac-sha256"];
  if (!sent) return false;
  // simple equality on shared secret + raw body; if you want HMAC-SHA256, change accordingly
  const expected = Buffer.from(FLOW_HMAC_SECRET + rawBody).toString("base64");
  return sent === expected;
}

// ----- handler -----
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!SHOP || !ADMIN_TOKEN || !PRICE_RULE_ID) {
    return res.status(500).json({ error: "Missing required env vars: SHOP, ADMIN_TOKEN, PRICE_RULE_ID" });
  }

  let raw = "";
  try {
    raw = await new Promise((resolve) => {
      let data = "";
      req.on("data", (chunk) => (data += chunk));
      req.on("end", () => resolve(data));
    });
  } catch {
    return res.status(400).json({ error: "Unable to read body" });
  }

  // Optional: verify request authenticity
  if (!verifyFlowHmac(req, raw)) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  const payload = safeParse(raw);
  let customerId, email, first_name;

  if (payload && payload.customer) {
    // Flow format: { customer: { id, email, first_name, ... } }
    ({ id: customerId, email, first_name } = payload.customer);
  } else if (payload && payload.id) {
    // Webhook format: { id, email, first_name, ... }
    ({ id: customerId, email, first_name } = payload);
  } else {
    return res.status(400).json({ error: "Missing customer payload. Expected { customer: { id, ... } } or { id, ... }" });
  }

  if (!customerId) {
    return res.status(400).json({ error: "Missing customer id" });
  }

  try {
    // Idempotency: don’t create a new code if one already exists
    const existing = await getExistingWelcomeCode(customerId);
    if (existing?.code) {
      return res.status(200).json({ success: true, code: existing.code, reused: true });
    }

    // Try up to 3 times in case of code collision
    let created = null;
    for (let i = 0; i < 3; i++) {
      const candidate = randomCode();
      try {
        created = await createDiscountCode(PRICE_RULE_ID, candidate);
        break;
      } catch (err) {
        // If collision (422), retry with a new random code
        if (!String(err.message || "").includes("422")) throw err;
      }
    }
    if (!created) throw new Error("Unable to create a unique discount code after retries.");

    // Save to customer metafield for email merge
    await writeWelcomeCode(customerId, created.code);

    return res.status(200).json({ success: true, code: created.code, reused: false });
  } catch (err) {
    console.error("generate-discount error:", err);
    return res.status(500).json({ error: String(err.message || err) });
  }
}
