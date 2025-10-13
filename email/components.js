// email/components.js
// Small, reusable HTML string components for transactional emails

const FONT_FAMILY = "'Lucida Grande', 'Lucida Sans Unicode', 'Lucida Sans', Lucida, Helvetica, Arial, sans-serif";
const COLOR_PRIMARY = "#432f0b";
const COLOR_ACCENT = "#f0a76f";
const COLOR_BG_OUTER = "#ffffff";
const COLOR_TEXT_LIGHT = "#555555";

export function renderLayout({ children }) {
  return `
<!DOCTYPE html>
<html lang="en">
        <head>
        <meta charset="utf-8">
        <meta http-equiv="x-ua-compatible" content="ie=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
        <meta name="x-apple-disable-message-reformatting">
        <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
        <title></title>
    </head>
    <body style="margin:0;padding:0;background-color:${COLOR_BG_OUTER};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0;padding:0;background-color:${COLOR_BG_OUTER};">
            <tr>
                <td align="center" style="padding:0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;width:100%;max-width:600px;background-color:#ffffff;">
                        <tr>
                            <td>
                                ${children}
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
</html>`;
}

export function renderHeader({ logoUrl, alt = "Mish Mush Kids", width = 129 }) {
  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="center" style="padding:30px 60px 10px;">
      <a href="https://mishmushkids.com" style="color:${COLOR_PRIMARY};text-decoration:none;">
        <img src="${logoUrl}" alt="${alt}" width="${width}" style="display:block;max-width:100%;height:auto;border:0;" />
      </a>
    </td>
  </tr>
</table>`;
}

export function renderHeading({ text, size = "24px" }) {
  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="center" style="padding:10px 60px;">
      <h2 style="font-size:${size};line-height:1.2;color:${COLOR_PRIMARY};font-family:${FONT_FAMILY};font-weight:400;margin:0;">${text}</h2>
    </td>
  </tr>
</table>`;
}

export function renderIntro({ lines }) {
  const items = Array.isArray(lines) ? lines : [String(lines || "")];
  const paragraphs = items
    .filter((x) => x != null && String(x).trim() !== "")
    .map((text, idx) => {
      const marginBottom = idx === items.length - 1 ? 0 : 12; // extra space between lines
      return `<p style="font-size:16px;line-height:1.5;color:${COLOR_TEXT_LIGHT};font-family:${FONT_FAMILY};margin:${idx === 0 ? 0 : 0}px 0 ${marginBottom}px 0;">${String(text)}</p>`;
    })
    .join("");
  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="left" style="padding:0 60px 24px;">
      ${paragraphs}
    </td>
  </tr>
</table>`;
}

export function renderProductCard({ productUrl, imgSrc, imgAlt, title, variantTitle, priceHtml }) {
  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="center" style="padding:20px 0;">
      <table width="240" cellpadding="0" cellspacing="0" border="0">
        ${imgSrc ? `
        <tr>
          <td align="center" style="padding:0 10px;">
            <a href="${productUrl}" style="text-decoration:none;">
              <img src="${imgSrc}" alt="${imgAlt || title}" width="220" height="220" style="display:block;max-width:100%;height:auto;border:0;" />
            </a>
          </td>
        </tr>
        <tr><td height="16"></td></tr>` : ''}
        <tr>
          <td align="center" style="padding:0 15px;">
            <h3 style="font-size:20px;line-height:1.2;color:${COLOR_PRIMARY};font-family:${FONT_FAMILY};font-weight:400;margin:0 0 10px;">
              <a href="${productUrl}" style="color:${COLOR_PRIMARY};text-decoration:none;">${title}</a>
            </h3>
            ${variantTitle ? `<p style="font-size:14px;color:#666;margin:0 0 8px;">${variantTitle}</p>` : ''}
            ${priceHtml ? `<p style="font-size:16px;line-height:1.2;color:${COLOR_PRIMARY};font-family:${FONT_FAMILY};margin:0;">${priceHtml}</p>` : ''}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

export function renderButton({ href, label }) {
  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="center" style="padding:0 60px 30px;">
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="border-radius:12px;background-color:${COLOR_ACCENT};">
            <a href="${href}" style="font-size:16px;font-family:${FONT_FAMILY};font-weight:700;color:${COLOR_PRIMARY};text-decoration:none;border-radius:12px;background-color:${COLOR_ACCENT};border:3px solid ${COLOR_ACCENT};display:inline-block;padding:14px 28px;min-width:80px;">${label}</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

export function renderHr() {
  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="center" style="padding:0 60px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td height="10"></td></tr>
        <tr>
          <td style="border-top:1px solid ${COLOR_PRIMARY};"></td>
        </tr>
        <tr><td height="30"></td></tr>
      </table>
    </td>
  </tr>
</table>`;
}

export function renderFooter({ unsubscribeUrl = "#" } = {}) {
  const currentYear = new Date().getFullYear();
  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLOR_ACCENT};padding:24px 60px;">
  <tr>
    <td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="font-size:12px;line-height:1.5;color:${COLOR_PRIMARY};font-family:${FONT_FAMILY};padding-bottom:8px;">
            Mish Mush Kids
          </td>
        </tr>
        </tr>
        <tr>
          <td style="font-size:12px;line-height:1.5;color:${COLOR_PRIMARY};font-family:${FONT_FAMILY};padding-top:4px;">
            © ${currentYear} Mish Mush Kids
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}


export function renderProductGrid({ items = [], shopDomain }) {
  if (!Array.isArray(items) || items.length === 0) return "";
  const products = items.slice(0, 4).map((p) => ({
    title: p?.title || "",
    handle: p?.handle || "",
    featuredImage: p?.featuredImage || {},
  }));

  function renderCell(product) {
    if (!product) {
      return `
      <td align="center" valign="top" width="50%" style="padding:10px 10px;">
        
      </td>`;
    }
    const productUrl = `https://${shopDomain}/products/${product.handle}`;
    const imgSrc = product.featuredImage?.url || "";
    const imgAlt = product.featuredImage?.altText || product.title || "";
    return `
      <td align="center" valign="top" width="50%" style="padding:10px 10px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          ${imgSrc ? `
          <tr>
            <td align="center" style="padding:0 0 10px;">
              <a href="${productUrl}" style="text-decoration:none;">
                <img src="${imgSrc}" alt="${imgAlt}" width="240" style="display:block;max-width:100%;height:auto;border:0;" />
              </a>
            </td>
          </tr>` : ""}
          <tr>
            <td align="center" style="padding:0 5px;">
              <h3 style="font-size:16px;line-height:1.2;color:${COLOR_PRIMARY};font-family:${FONT_FAMILY};font-weight:400;margin:0 0 6px;">
                <a href="${productUrl}" style="color:${COLOR_PRIMARY};text-decoration:none;">${product.title}</a>
              </h3>
            </td>
          </tr>
        </table>
      </td>`;
  }

  const row1 = [products[0], products[1]];
  const row2 = [products[2], products[3]];

  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    ${renderCell(row1[0])}
    ${renderCell(row1[1])}
  </tr>
  <tr>
    ${renderCell(row2[0])}
    ${renderCell(row2[1])}
  </tr>
</table>`;
}


