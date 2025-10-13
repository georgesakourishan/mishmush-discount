// email/preview-email.js
// Preview script to generate and view email templates without sending

import { buildConfirmSubscriptionEmail } from "./confirm-subscription.js";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Sample data for preview
const sampleData = {
  firstName: "Alex",
  product: {
    title: "Clementines Art Print",
    handle: "clementines-art-print",
    onlineStoreUrl: "https://mishmushkids.com/products/clementines-art-print"
  },
  variant: {
    title: "8x10 Print",
    price: "25.00",
    image: {
      url: "https://cdn.shopify.com/shopify-email/example-image.jpg",
      altText: "Clementines Art Print"
    }
  },
  shopDomain: "mishmushkids.com"
};

// Mock new arrivals grid items
sampleData.newArrivalsProducts = [
  {
    title: "New Arrival One",
    handle: "new-arrival-one",
    featuredImage: { url: "https://cdn.shopify.com/shopify-email/example-image.jpg", altText: "New Arrival One" }
  },
  {
    title: "New Arrival Two",
    handle: "new-arrival-two",
    featuredImage: { url: "https://cdn.shopify.com/shopify-email/example-image.jpg", altText: "New Arrival Two" }
  },
  {
    title: "New Arrival Three",
    handle: "new-arrival-three",
    featuredImage: { url: "https://cdn.shopify.com/shopify-email/example-image.jpg", altText: "New Arrival Three" }
  },
  {
    title: "New Arrival Four",
    handle: "new-arrival-four",
    featuredImage: { url: "https://cdn.shopify.com/shopify-email/example-image.jpg", altText: "New Arrival Four" }
  }
];

// Generate the email HTML (now returns a full HTML document)
const emailHtml = buildConfirmSubscriptionEmail(sampleData);

// Save the preview file (write the generated HTML directly)
const previewPath = join(__dirname, "email-preview.html");
writeFileSync(previewPath, emailHtml, "utf8");

console.log("✅ Email preview generated!");
console.log(`📄 File saved to: ${previewPath}`);
console.log("");
console.log("📋 Next steps:");
console.log("1. Open email-preview.html in your browser");
console.log("2. Test by sending via your ESP or tools like Litmus/Email on Acid");
console.log("");
console.log("🔧 To customize the preview data, edit the sampleData object above.");
