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

// Generate the email HTML
const emailHtml = buildConfirmSubscriptionEmail(sampleData);

// Create a complete HTML document for preview
const previewHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Preview - Mish Mush Kids</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
            font-family: Arial, sans-serif;
        }
        .email-container {
            background: white;
            max-width: 600px;
            margin: 0 auto;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .email-header {
            background: #fafafa;
            padding: 20px;
            text-align: center;
            border-bottom: 1px solid #ddd;
        }
        .email-header h1 {
            margin: 0;
            color: #666;
            font-size: 18px;
        }
        .email-content {
            padding: 20px;
            background: #f9f9f9;
        }
        .note {
            background: #e7f3ff;
            border: 1px solid #b3d9ff;
            border-radius: 4px;
            padding: 15px;
            margin-bottom: 20px;
            font-size: 14px;
            color: #0066cc;
        }
        .note strong {
            color: #0052a3;
        }
    </style>
</head>
<body>
    <div class="email-header">
        <h1>📧 Email Preview</h1>
    </div>
    <div class="email-content">
        <div class="note">
            <strong>Note:</strong> This is a preview of how your email will look in email clients.
            Copy the HTML below or save this file to test in different email clients like Gmail, Outlook, etc.
        </div>
        <div class="email-container">
            ${emailHtml}
        </div>
    </div>
</body>
</html>`;

// Save the preview file
const previewPath = join(__dirname, "email-preview.html");
writeFileSync(previewPath, previewHtml, "utf8");

console.log("✅ Email preview generated!");
console.log(`📄 File saved to: ${previewPath}`);
console.log("");
console.log("📋 Next steps:");
console.log("1. Open email-preview.html in your browser");
console.log("2. Test in email clients (Gmail, Outlook, etc.)");
console.log("3. Use online tools like:");
console.log("   - Litmus (litmus.com)");
console.log("   - Email on Acid (emailonacid.com)");
console.log("   - Putsmail (putsmail.com)");
console.log("");
console.log("🔧 To customize the preview data, edit the sampleData object above.");
