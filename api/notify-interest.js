// api/notify-interest.js
// Handles Shopify "customer_tags_added" webhook.
// When a tag like "notify-variant-123456789" is added to a customer,
// fetches variant + product info and emails the customer a confirmation.

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
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const missingEnv = [
    !SHOP ? "SHOP" : null,
    !ADMIN_TOKEN ? "ADMIN_TOKEN" : null,
    !RESEND_API_KEY ? "RESEND_API_KEY" : null,
  ].filter(Boolean);
  if (missingEnv.length) {
    console.error("notify-interest: Missing env vars", missingEnv);
    return res.status(500).json({ error: "Missing required env vars: SHOP, ADMIN_TOKEN, RESEND_API_KEY" });
  }

  const topic = req.headers["x-shopify-topic"];
  const contentLength = req.headers["content-length"]; // might be undefined
  console.log("notify-interest: request received", {
    method: req.method,
    topic,
    shop: SHOP,
    contentLength,
  });

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
  console.log("notify-interest: raw body", raw);
  console.log("notify-interest: raw body received", { length: raw?.length || 0 });

  const payload = safeParse(raw);
  if (!payload) {
    console.warn("notify-interest: failed to parse JSON body");
  }
  console.log("notify-interest: payload keys", Object.keys(payload || {}));

  // Support both shapes: { data: { customer, added_tags } } and flat webhooks { email, customer_id, added_tags }
  const addedTags = payload?.data?.added_tags || payload?.added_tags || [];
  console.log("notify-interest: added tags", addedTags);
  const notifyTag = addedTags.find((t) => t.startsWith("notify-variant-"));
  if (!notifyTag) {
    console.log("notify-interest: exiting — no notify-variant-* tag found");
    return res.status(200).json({ message: "No notify tag found" });
  }

  const variantId = notifyTag.replace("notify-variant-", "").trim();

  // Resolve customer info from various webhook shapes; fetch by customer_id if needed
  let customer = payload?.data?.customer || payload?.customer || null;
  if (!customer?.email && payload?.email) {
    customer = {
      ...(customer || {}),
      email: payload.email,
      first_name: payload.first_name || payload.firstName,
    };
  }
  if (!customer?.email) {
    const customerId = payload?.customer_id || payload?.customerId || payload?.id;
    if (customerId) {
      console.log("notify-interest: fetching customer by id", { customerId: String(customerId) });
      try {
        const custRes = await shopifyFetch("/graphql.json", {
          method: "POST",
          body: JSON.stringify({
            query: `{
              customer(id: "gid://shopify/Customer/${customerId}") {
                id
                email
                firstName
              }
            }`,
          }),
        });
        const c = custRes.data?.customer;
        if (c?.email) {
          customer = { email: c.email, first_name: c.firstName };
        }
        console.log("notify-interest: fetched customer", { hasEmail: Boolean(customer?.email) });
      } catch (e) {
        console.warn("notify-interest: failed to fetch customer by id", String(e?.message || e));
      }
    }
  }
  if (!customer?.email) {
    console.log("notify-interest: exiting — no customer email available");
    return res.status(200).json({ message: "No customer email" });
  }
  console.log(`notify-interest: variant ${variantId} for ${customer.email}`);

  try {
    // 1️⃣ Fetch product + variant details
    console.time("notify-interest: fetchVariant");
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
    console.timeEnd("notify-interest: fetchVariant");
    const variant = variantRes.data?.productVariant;
    if (!variant) {
      console.warn("notify-interest: exiting — variant not found", { variantId });
      return res.status(200).json({ message: "Variant not found" });
    }

    // 2️⃣ Build email HTML
    const html = buildEmailHtml({
      firstName: customer.first_name,
      product: variant.product,
      variant,
    });
    console.log("notify-interest: email HTML generated", { length: html.length });

    // 3️⃣ Send via Resend
    console.time("notify-interest: sendEmail");
    const emailPayload = {
      from: "Mish Mush Kids <support@mishmushkids.com>",
      to: customer.email,
      subject: "You're on the list — we'll notify you when it's back!",
      html,
    };
    console.log("notify-interest: sending email", {
      to: customer.email,
      subject: emailPayload.subject,
    });
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

    console.log(`Confirmation email sent to ${customer.email}`);
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
  const imgSrc = variant.image?.src || "";
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