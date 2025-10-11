// api/notify-interest.js
// Handles Shopify "customer_tags_added" webhook.
// When a tag like "notify-variant-123456789" is added to a customer,
// fetches variant + product info and emails the customer a confirmation.

const API_VERSION = "2025-10";
const SHOP = process.env.SHOP;               // e.g. "1dkprr-fx.myshopify.com"
const ADMIN_TOKEN = process.env.ADMIN_TOKEN; // Admin API access token
const RESEND_API_KEY = process.env.RESEND_API_KEY; // Email API key (Resend free tier)

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

function safeParse(body) {
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

// ----- core handler -----
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!SHOP || !ADMIN_TOKEN || !RESEND_API_KEY) {
    return res
      .status(500)
      .json({ error: "Missing required env vars: SHOP, ADMIN_TOKEN, RESEND_API_KEY" });
  }

  // Read raw body for safety (Shopify webhooks sometimes need this)
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

  const payload = safeParse(raw);
  if (!payload?.data?.customer) {
    return res.status(200).json({ message: "No customer object in webhook payload." });
  }

  const customer = payload.data.customer;
  const addedTags = payload.data.added_tags || [];
  const notifyTag = addedTags.find((t) => t.startsWith("notify-variant-"));

  if (!notifyTag) {
    return res.status(200).json({ message: "No notify-variant tag found, ignoring." });
  }

  const variantId = notifyTag.replace("notify-variant-", "").trim();
  console.log(`notify-interest: processing variant ${variantId} for ${customer.email}`);

  try {
    // 1️⃣ Fetch variant + product details
    const variantRes = await shopifyFetch("/graphql.json", {
      method: "POST",
      body: JSON.stringify({
        query: `
          {
            productVariant(id: "gid://shopify/ProductVariant/${variantId}") {
              id
              title
              price
              image { src altText }
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

    const variant = variantRes.data?.productVariant;
    if (!variant) {
      console.warn("Variant not found:", variantId);
      return res.status(200).json({ message: "Variant not found." });
    }

    // 2️⃣ Build email HTML
    const html = buildEmailHtml({
      firstName: customer.first_name,
      product: variant.product,
      variant,
    });

    // 3️⃣ Send email via Resend
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Mish Mush Kids <support@mishmushkids.com>",
        to: customer.email,
        subject: "You're on the list — we'll notify you when it's back!",
        html,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text().catch(() => "");
      console.error("Resend API error:", errText);
      throw new Error(`Resend email failed: ${emailRes.status}`);
    }

    console.log(`Confirmation email sent to ${customer.email}`);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("notify-interest error:", err);
    return res.status(500).json({ error: String(err.message || err) });
  }
}

// ----- helpers -----
function buildEmailHtml({ firstName, product, variant }) {
  const name = firstName || "there";
  const productUrl =
    product.onlineStoreUrl || `https://${SHOP}/products/${product.handle}`;
  const imgSrc = variant.image?.src || "";

  return `
    <div style="font-family: DM Sans, Arial, sans-serif; background:#f8f7f5; padding:32px;">
      <div style="max-width:640px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden;">
        <div style="padding:24px; text-align:center;">
          <img src="https://mishmushkids.com/cdn/shop/files/mishmush.webp"
               alt="Mish Mush Kids" width="160" style="display:block; margin:0 auto;" />
        </div>

        <h2 style="text-align:center; color:#856734;">You're on the list ✨</h2>
        <p style="text-align:center; color:#444; font-size:15px; line-height:1.6;">
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
              <p style="margin:0; color:#333; font-weight:600;">$${variant.price}</p>
            </div>
          </a>
        </div>

        <div style="text-align:center; padding-bottom:16px;">
          <a href="${productUrl}"
             style="display:inline-block; background:#856734; color:#fff; text-decoration:none; padding:12px 24px; border-radius:8px; font-weight:600;">
            View Item
          </a>
        </div>

        <p style="text-align:center; color:#777; font-size:12px; margin-top:32px;">
          You’re receiving this because you asked us to notify you when an item is back in stock.<br>
          Mish Mush Kids • Los Angeles, CA •
          <a href="https://mishmushkids.com" style="color:#777;">mishmushkids.com</a>
        </p>
      </div>
    </div>`;
}