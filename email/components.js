// email/components.js
// Small, reusable HTML string components for transactional emails

const FONT_FAMILY = "'Lucida Grande', 'Lucida Sans Unicode', 'Lucida Sans', Lucida, Helvetica, Arial, sans-serif";
const COLOR_PRIMARY = "#432f0b";
const COLOR_ACCENT = "#f0a76f";
const COLOR_BG_OUTER = "#fafafa";
const COLOR_TEXT_LIGHT = "#555555";

export function renderLayout({ children }) {
  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLOR_BG_OUTER};margin:0;padding:0;">
  <tr>
    <td align="center" style="padding:32px 0;">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;margin:0 auto;">
        <tr>
          <td>
            ${children}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
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
  const html = Array.isArray(lines) ? lines.join("<br>") : String(lines || "");
  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="left" style="padding:0 60px 20px;">
      <p style="font-size:16px;line-height:1.5;color:${COLOR_TEXT_LIGHT};font-family:${FONT_FAMILY};margin:0;">${html}</p>
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
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLOR_ACCENT};">
  <tr>
    <td align="center" style="padding:24px 60px;">
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


