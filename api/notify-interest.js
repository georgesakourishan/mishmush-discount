// api/notify-interest.js
// Receives client-initiated POST from Shopify storefront with payload:
// { variantId: string | number (GID or numeric), email: string }
// Fetches variant + product info and emails the customer a confirmation.

const API_VERSION = "2025-10";
const SHOP = process.env.SHOP;               // e.g. "1dkprr-fx.myshopify.com"
const ADMIN_TOKEN = process.env.ADMIN_TOKEN; // Admin API access token
const RESEND_API_KEY = process.env.RESEND_API_KEY; // Email API key (Resend free tier)

// ---------- utils ----------
async function shopifyFetch(path, init = {}) {
  const method = init.method || "GET";
  const startedAt = Date.now();
  console.log("notify-interest: Shopify request", { path, method });
  const url = `https://${SHOP}/admin/api/${API_VERSION}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": ADMIN_TOKEN,
      ...(init.headers || {}),
    },
  });
  const durationMs = Date.now() - startedAt;
  console.log("notify-interest: Shopify response", {
    path,
    status: res.status,
    statusText: res.statusText,
    durationMs,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Shopify API ${res.status} ${res.statusText}: ${text}`);
  }
  return res.json();
}

function safeParse(body) {
  try { return JSON.parse(body); } catch { return null; }
}

// ---------- handler ----------
export default async function handler(req, res) {
  // --- Strict CORS: allow only mishmushkids.com ---
  const origin = req.headers.origin || "";
  const allowedOrigins = new Set([
    "https://mishmushkids.com",
    "https://www.mishmushkids.com",
  ]);
  const originAllowed = origin && allowedOrigins.has(origin);

  // Handle CORS preflight early
  if (req.method === "OPTIONS") {
    if (originAllowed) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, X-Shopify-Topic, X-Shopify-Hmac-Sha256, X-Shopify-Shop-Domain, Authorization"
      );
      res.setHeader("Access-Control-Max-Age", "600");
      return res.status(204).end();
    }
    return res.status(403).end();
  }

  // For non-preflight requests from browsers, enforce allowed origin
  if (origin) {
    if (!originAllowed) {
      return res.status(403).json({ error: "CORS origin not allowed" });
    }
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!SHOP || !ADMIN_TOKEN || !RESEND_API_KEY)
    return res.status(500).json({ error: "Missing required env vars: SHOP, ADMIN_TOKEN, RESEND_API_KEY" });

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
  const payload = safeParse(raw) || {};
  const { variantId: rawVariantId, email } = payload;
  if (!rawVariantId || !email) {
    return res.status(400).json({ error: "Missing required fields: variantId, email" });
  }
  console.log("notify-interest: request received", {
    method: req.method,
    shop: SHOP,
    hasEmail: Boolean(email),
    hasVariantId: Boolean(rawVariantId),
  });

  // Normalize variant GID
  const variantGid = String(rawVariantId).startsWith("gid://")
    ? String(rawVariantId)
    : `gid://shopify/ProductVariant/${rawVariantId}`;
  console.log("notify-interest: normalized variant id", { variantGid });

  try {
    // 1️⃣ Fetch product + variant details
    const variantRes = await shopifyFetch("/graphql.json", {
      method: "POST",
      body: JSON.stringify({
        query: `
          {
            productVariant(id: "${variantGid}") {
              id
              title
              image { url altText }
              product {
                title
                handle
                onlineStoreUrl
              }
            }
          }
        `,
      }),
    });
    if (variantRes?.errors?.length) {
      console.warn(
        "notify-interest: variant query errors",
        variantRes.errors.map((e) => e?.message || String(e))
      );
    }
    const variant = variantRes.data?.productVariant;
    if (!variant) return res.status(404).json({ error: "Variant not found" });

    // 2️⃣ Build email HTML
    const html = buildEmailHtml({
      firstName: 'there',
      product: variant.product,
      variant,
    });

    // 3️⃣ Send via Resend
    console.time("notify-interest: sendEmail");
    const emailPayload = {
      from: "Mish Mush Kids <support@em.mishmushkids.com>",
      to: email,
      subject: "You're on the list — we'll notify you when it's back!",
      html,
    };
    console.log("notify-interest: sending email", { to: email, subject: emailPayload.subject });
    const send = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });
    const sendText = await send.text().catch(() => "");
    console.timeEnd("notify-interest: sendEmail");
    console.log("notify-interest: Resend response", {
      status: send.status,
      ok: send.ok,
      bodyPreview: sendText.slice(0, 500),
    });

    if (!send.ok) {
      console.error("notify-interest: Resend send failed");
    }

    console.log(`Confirmation email sent to ${email}`);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("notify-interest error:", err);
    return res.status(500).json({ error: String(err.message || err) });
  }
}

// ---------- helpers ----------
function buildEmailHtml({ firstName, product, variant }) {
  const name = firstName || "there";
  const productUrl =
    product.onlineStoreUrl || `https://${SHOP}/products/${product.handle}`;
  const imgSrc = variant.image?.url || "";
  const price = variant.price ? `$${variant.price}` : "";

  return `
  <div style="font-family: DM Sans, Arial, sans-serif; background:#f8f7f5; padding:32px;">
    <div style="max-width:640px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden;">
      <div style="padding:24px; text-align:center;">
        <img src="https://cdn.shopify.com/s/files/1/your_logo_path/logo.png"
             alt="Mish Mush Kids" width="160" style="display:block; margin:0 auto;" />
      </div>

      <h2 style="text-align:center; color:#856734; margin:0;">You're on the list ✨</h2>
      <p style="text-align:center; color:#444; font-size:15px; line-height:1.6; margin:16px 0 0;">
        Hi ${name},<br>
        We’ve noted your interest in the item below and will email you as soon as it’s back in stock.
      </p>

      <div style="margin:24px auto; max-width:400px; border:1px solid #eee; border-radius:12px; overflow:hidden;">
        <a href="${productUrl}" style="text-decoration:none;">
          ${
            imgSrc
              ? `<img src="${imgSrc}" alt="${variant.image?.altText || product.title}" style="width:100%; display:block;" />`
              : ""
          }
          <div style="padding:16px;">
            <h3 style="margin:0 0 8px; color:#222;">${product.title}</h3>
            <p style="margin:0 0 8px; color:#666;">${variant.title}</p>
            <p style="margin:0; color:#333; font-weight:600;">${price}</p>
          </div>
        </a>
      </div>

      <div style="text-align:center; padding-bottom:16px;">
        <a href="${productUrl}"
           style="display:inline-block; background:#856734; color:#fff; text-decoration:none; padding:12px 24px; border-radius:8px; font-weight:600;">
          View Item
        </a>
      </div>

      <hr style="border:none; border-top:1px solid #eaeaea; margin:24px 0;">

      <div style="text-align:center; padding:0 24px 24px;">
        <p style="font-size:12px; color:#777; line-height:1.6; margin:0 0 8px;">
          You’re receiving this because you asked us to notify you when an item is back in stock.
        </p>
        <p style="font-size:12px; color:#777; line-height:1.6; margin:0;">
          Mish Mush Kids • Los Angeles, CA •
          <a href="https://mishmushkids.com" style="color:#777;">mishmushkids.com</a>
        </p>
        <p style="font-size:12px; color:#777; line-height:1.6; margin:8px 0 0;">
          <a href="https://mishmushkids.com/pages/manage-notifications" style="color:#777; text-decoration:underline;">Manage notifications</a> • 
          <a href="https://mishmushkids.com/pages/contact" style="color:#777; text-decoration:underline;">Contact us</a> • 
          <a href="{{ unsubscribe_url }}" style="color:#777; text-decoration:underline;">Unsubscribe</a>
        </p>
      </div>
    </div>
  </div>`;
}