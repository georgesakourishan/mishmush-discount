// email/confirm-subscription.js
// buildConfirmSubscriptionEmail: assembles the confirmation email HTML using reusable components

import { renderLayout, renderHeader, renderHeading, renderIntro, renderHr, renderFooter, renderProductGrid, renderButton } from "./components.js";

export function buildConfirmSubscriptionEmail({ firstName, product, shopDomain, newArrivalsProducts = [] }) {
  const name = firstName || "there";
  const productName = product?.title || "this item";

  const header = renderHeader({
    logoUrl: "https://mishmushkids.com/cdn/shop/files/mishmush.webp",
    alt: "Mish Mush Kids",
    width: 160,
  });

  const heading = renderHeading({ text: "You're on the list ✨" });
  const intro = renderIntro({
    lines: [
      `Hi ${name},`,
      `Thank you for signing up to be notified when ${productName} is back.`,
      'As soon as it’s restocked, we’ll send you a note so you can be first to grab it.',
      'While you wait, take a peek at our other playful favorites inspired by Arabic traditions and childhood magic.'
    ],
  });

  const gridHeading = renderHeading({ text: "New arrivals you might like", size: "20px" });
  const grid = renderProductGrid({ items: newArrivalsProducts, shopDomain });
  const shopAllCta = renderButton({ href: `https://${shopDomain}`, label: "Shop all" });

  const body = `
    ${header}
    ${renderHr()}
    ${heading}
    ${intro}
    ${gridHeading}
    ${grid}
    ${shopAllCta}
    ${renderFooter()}
  `;

  return renderLayout({ children: body });
}


