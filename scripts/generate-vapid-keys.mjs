/**
 * Run once to generate VAPID keys:
 *   node scripts/generate-vapid-keys.mjs
 *
 * Then add the output to your .env.local
 */

import crypto from "crypto";

function base64url(buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

const { privateKey, publicKey } = crypto.generateKeyPairSync("ec", {
  namedCurve: "prime256v1",
  publicKeyEncoding: { type: "spki", format: "der" },
  privateKeyEncoding: { type: "pkcs8", format: "der" },
});

// Extract raw 65-byte uncompressed public key (skip DER header)
const rawPublic = base64url(publicKey.slice(publicKey.length - 65));

// Extract raw 32-byte private key (last 32 bytes of DER)
const rawPrivate = base64url(privateKey.slice(privateKey.length - 32));

console.log("\n✅ VAPID Keys Generated — add to your .env.local:\n");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${rawPublic}`);
console.log(`VAPID_PRIVATE_KEY=${rawPrivate}`);
console.log(`VAPID_SUBJECT=mailto:your@email.com\n`);
