// email/confirm-subscription.js
// buildConfirmSubscriptionEmail: assembles the confirmation email HTML using reusable components

import { renderLayout, renderHeader, renderHeading, renderIntro, renderProductCard, renderButton, renderHr, renderFooter } from "./components.js";

export function buildConfirmSubscriptionEmail({ firstName, product, variant, shopDomain }) {
  const name = firstName || "there";
  const productUrl = product?.onlineStoreUrl || `https://${shopDomain}/products/${product?.handle || ""}`;
  const imgSrc = variant?.image?.url || product?.featuredImage?.url || "";

  const header = renderHeader({
    logoUrl: "https://mishmushkids.com/cdn/shop/files/mishmush.webp",
    alt: "Mish Mush Kids",
    width: 160,
  });

  const heading = renderHeading({ text: "You're on the list ✨" });
  const intro = renderIntro({
    lines: [
      `Hi ${name},`,
      "We’ve noted your interest in the item below and will email you as soon as it’s back in stock.",
    ],
  });

  const productCard = renderProductCard({
    productUrl,
    imgSrc,
    imgAlt: variant?.image?.altText || product?.featuredImage?.altText || product?.title || "",
    title: product?.title || "",
    variantTitle: variant?.title || ""
  });

  const cta = renderButton({ href: productUrl, label: "View Item" });

  const body = `
    ${header}
    ${renderHr()}
    ${heading}
    ${intro}
    ${productCard}
    ${cta}
    ${renderFooter()}
  `;

  return renderLayout({ children: body });
}


