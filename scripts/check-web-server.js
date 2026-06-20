const assert = require("node:assert/strict");

const urls = process.env.TEST_WEB_URL
  ? [process.env.TEST_WEB_URL]
  : ["http://localhost:8081/", "http://127.0.0.1:8081/", "http://localhost:19006/"];

async function main() {
  const errors = [];

  for (const url of urls) {
    try {
      const response = await fetch(url);
      assert.equal(response.ok, true, `Expected ${url} to return 2xx, got ${response.status}`);

      const html = await response.text();
      assert.match(html, /FocusRoom|root|expo/i, "Expected the web app shell in the HTML response");

      console.log(`Web smoke check passed: ${url}`);
      return;
    } catch (error) {
      errors.push(`${url}: ${error.message}`);
    }
  }

  throw new Error(
    [
      "Web smoke check failed. Start Expo web first with `npm run web`,",
      "or set TEST_WEB_URL to the address shown by Expo.",
      ...errors
    ].join("\n")
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
