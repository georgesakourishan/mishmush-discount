// api/maintenance.js
// Vercel cron job for Mish Mush Kids maintenance tasks
// Runs daily at 09:00 UTC (configured in vercel.json)
//
// Features:
// ✅ Authenticated cron protection
// ✅ Paginated fetching of all discount codes
// ✅ Deletes codes older than 30 days
// ✅ Retry logic for rate limits
// ✅ Structured logging for observability
// ✅ Optional Slack summary alert

const API_VERSION = "2025-10";
const SHOP = process.env.SHOP;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const PRICE_RULE_ID = process.env.PRICE_RULE_ID;
const CRON_SECRET = process.env.CRON_SECRET;
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const DAYS_TO_KEEP = 8; // keep codes for 7 days; cron runs daily at 09:00 UTC

// ---------- Utilities ----------

function log(type, msg, data = {}) {
  console.log(JSON.stringify({ type, msg, ...data }));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withRetry(fn, retries = 3, delay = 1000) {
  try {
    return await fn();
  } catch (err) {
    const msg = err.message || "";
    if (retries > 0 && /(429|rate limit)/i.test(msg)) {
      log("retry", "Hit Shopify rate limit — retrying", { retriesLeft: retries });
      await sleep(delay);
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw err;
  }
}

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

function isOlderThan(dateString, days) {
  const created = new Date(dateString);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return created < cutoff;
}

// ---------- Core Logic ----------

async function fetchAllDiscountCodes() {
  let codes = [];
  let nextURL = `/price_rules/${PRICE_RULE_ID}/discount_codes.json?limit=250`;

  while (nextURL) {
    const res = await fetch(`https://${SHOP}/admin/api/${API_VERSION}${nextURL}`, {
      headers: { "X-Shopify-Access-Token": ADMIN_TOKEN },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Shopify API ${res.status}: ${text}`);
    }

    const data = await res.json();
    codes.push(...(data.discount_codes || []));

    const link = res.headers.get("link");
    const next = link && link.match(/<([^>]+)>; rel="next"/);
    nextURL = next ? next[1].replace(`https://${SHOP}/admin/api/${API_VERSION}`, "") : null;
  }

  return codes;
}

async function deleteOldCodes(codes) {
  const oldCodes = codes.filter((c) => isOlderThan(c.created_at, DAYS_TO_KEEP));
  if (oldCodes.length === 0) {
    log("cleanup", "No codes older than threshold", { days: DAYS_TO_KEEP });
    return 0;
  }

  let deleted = 0;
  for (const code of oldCodes) {
    await withRetry(() =>
      shopifyFetch(`/price_rules/${PRICE_RULE_ID}/discount_codes/${code.id}.json`, {
        method: "DELETE",
      })
    );
    deleted++;
  }

  log("cleanup", "Deleted old codes", { deleted, thresholdDays: DAYS_TO_KEEP });
  return deleted;
}

async function getDiscountCodeStats(codes) {
  const used = codes.filter((c) => c.usage_count > 0).length;
  const unused = codes.filter((c) => c.usage_count === 0).length;

  return {
    total: codes.length,
    used,
    unused,
    samples: codes.slice(0, 5).map((c) => ({
      code: c.code,
      usage_count: c.usage_count,
      created_at: c.created_at,
    })),
  };
}

async function sendSlackSummary(stats, deleted) {
  if (!SLACK_WEBHOOK_URL) return;

  const text = `🧹 *Mish Mush Maintenance Summary*\n
• Total Codes: ${stats.total}
• Used: ${stats.used}
• Unused: ${stats.unused}
• Deleted (>${DAYS_TO_KEEP}d): ${deleted}\n
Top 5 Codes:\n${stats.samples
    .map((s) => `• ${s.code} (${s.usage_count} uses, created ${s.created_at.slice(0, 10)})`)
    .join("\n")}`;

  await fetch(SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  }).catch((err) => log("error", "Slack alert failed", { error: err.message }));
}

// ---------- Handler ----------

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Use GET" });
  }

  const authHeader = req.headers.authorization;
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!SHOP || !ADMIN_TOKEN || !PRICE_RULE_ID) {
    return res.status(500).json({
      error: "Missing required env vars: SHOP, ADMIN_TOKEN, PRICE_RULE_ID",
    });
  }

  const timestamp = new Date().toISOString();
  log("start", "🧹 Maintenance job running", { timestamp });

  try {
    const codes = await withRetry(fetchAllDiscountCodes);
    const statsBefore = await getDiscountCodeStats(codes);

    const deleted = await deleteOldCodes(codes);

    // Recalculate after deletion
    const remainingCodes = await withRetry(fetchAllDiscountCodes);
    const statsAfter = await getDiscountCodeStats(remainingCodes);

    await sendSlackSummary(statsAfter, deleted);

    log("success", "📊 Maintenance complete", { deleted, statsAfter });

    return res.status(200).json({
      success: true,
      timestamp,
      deleted,
      statsBefore,
      statsAfter,
      message: `Maintenance completed successfully — deleted ${deleted} codes older than ${DAYS_TO_KEEP} days.`,
    });
  } catch (err) {
    log("error", "❌ Maintenance failed", { error: err.message });
    return res.status(500).json({
      error: String(err.message || err),
      timestamp,
    });
  }
}
