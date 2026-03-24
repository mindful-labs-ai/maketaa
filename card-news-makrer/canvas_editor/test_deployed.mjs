import { chromium } from 'playwright';

const url = 'https://canvaseditor-mu.vercel.app';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Capture console messages
  const logs = [];
  page.on('console', msg => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
  });

  // Capture network errors
  const networkErrors = [];
  page.on('requestfailed', request => {
    networkErrors.push(`FAILED: ${request.url()} - ${request.failure()?.errorText}`);
  });

  // Capture response status for supabase calls
  const supabaseResponses = [];
  page.on('response', response => {
    if (response.url().includes('supabase')) {
      supabaseResponses.push(`${response.status()} ${response.url().substring(0, 100)}`);
    }
  });

  console.log(`\n=== Testing: ${url} ===\n`);

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // Wait for data to load
    await page.waitForTimeout(5000);

    // Check page content
    const bodyText = await page.textContent('body');
    const hasCards = bodyText.includes('봄철') || bodyText.includes('무기력');
    const hasEmpty = bodyText.includes('카드 스펙이 없습니다');
    const hasLoading = bodyText.includes('불러오는 중');
    const hasError = bodyText.includes('오류 발생') || bodyText.includes('Error');

    console.log('--- Page State ---');
    console.log(`Has card data: ${hasCards}`);
    console.log(`Shows empty state: ${hasEmpty}`);
    console.log(`Still loading: ${hasLoading}`);
    console.log(`Shows error: ${hasError}`);

    if (hasError) {
      const errorEl = await page.$('.bg-red-50');
      if (errorEl) {
        const errorText = await errorEl.textContent();
        console.log(`Error message: ${errorText}`);
      }
    }

    console.log('\n--- Console Logs ---');
    logs.forEach(l => console.log(l));

    console.log('\n--- Network Errors ---');
    networkErrors.forEach(e => console.log(e));

    console.log('\n--- Supabase Responses ---');
    supabaseResponses.forEach(r => console.log(r));

    // Take screenshot
    await page.screenshot({ path: '/tmp/deployed_site.png', fullPage: true });
    console.log('\nScreenshot saved to /tmp/deployed_site.png');

  } catch (err) {
    console.error('Test error:', err.message);
  }

  await browser.close();
})();
