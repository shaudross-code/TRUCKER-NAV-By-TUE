const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://heremaps.github.io/maps-api-for-javascript-examples/change-harp-style-at-load/index.html');
  const html = await page.content();
  console.log(html);
  await browser.close();
})();
