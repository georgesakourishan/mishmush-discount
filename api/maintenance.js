// api/maintenance.js
// Vercel cron job for periodic maintenance tasks
// Runs daily at 09:00 UTC (configured in vercel.json)

const API_VERSION = "2025-10";
const SHOP = process.env.SHOP;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const PRICE_RULE_ID = process.env.PRICE_RULE_ID;

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

async function getDiscountCodeStats() {
  // Get all discount codes for the price rule
  try {
    const data = await shopifyFetch(`/price_rules/${PRICE_RULE_ID}/discount_codes.json?limit=250`);
    const codes = data.discount_codes || [];
    
    // Count usage
    const used = codes.filter(c => c.usage_count > 0).length;
    const unused = codes.filter(c => c.usage_count === 0).length;
    
    return {
      total: codes.length,
      used,
      unused,
      samples: codes.slice(0, 5).map(c => ({
        code: c.code,
        usage_count: c.usage_count,
        created_at: c.created_at
      }))
    };
  } catch (err) {
    console.error("Error fetching discount codes:", err);
    return { error: err.message };
  }
}

export default async function handler(req, res) {
  // Security: Verify this is coming from Vercel Cron
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!SHOP || !ADMIN_TOKEN || !PRICE_RULE_ID) {
    return res.status(500).json({ 
      error: "Missing required env vars: SHOP, ADMIN_TOKEN, PRICE_RULE_ID" 
    });
  }

  const timestamp = new Date().toISOString();
  console.log("🧹 Maintenance job running:", timestamp);

  try {
    // Get stats about discount codes
    const stats = await getDiscountCodeStats();
    
    console.log("📊 Discount code stats:", stats);

    // You can add more maintenance tasks here, such as:
    // - Delete unused codes older than X days
    // - Send a summary email
    // - Clean up orphaned metafields
    // - etc.

    return res.status(200).json({
      success: true,
      timestamp,
      stats,
      message: "Maintenance completed successfully"
    });
  } catch (err) {
    console.error("❌ Maintenance error:", err);
    return res.status(500).json({
      error: String(err.message || err),
      timestamp
    });
  }
}

