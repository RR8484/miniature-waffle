import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

async function captureFullPageScreenshot() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.goto('https://creditcardgenius.ca', { waitUntil: 'networkidle0' });

  // Set viewport to a large size
  await page.setViewport({ width: 1920, height: 1080 });

  // Get the full height of the page
  const bodyHandle = await page.$('body');
  const { height } = await bodyHandle.boundingBox();
  await bodyHandle.dispose();

  // Scroll through the page to trigger lazy loading
  const viewportHeight = page.viewport().height;
  let viewportIncr = 0;
  while (viewportIncr + viewportHeight < height) {
    await page.evaluate(_viewportHeight => {
      window.scrollBy(0, _viewportHeight);
    }, viewportHeight);
    
    // Replace waitForTimeout with a delay using evaluate
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 200)));
    
    viewportIncr = viewportIncr + viewportHeight;
  }

  // Scroll back to top
  await page.evaluate(_ => {
    window.scrollTo(0, 0);
  });

  // Ensure baseline folder exists
  const baselineFolder = 'baseline';
  await fs.mkdir(baselineFolder, { recursive: true });

  // Take the full page screenshot and save in baseline folder
  const screenshotPath = path.join(baselineFolder, 'screenshot1.png');
  await page.screenshot({
    path: screenshotPath,
    fullPage: true
  });

  await browser.close();
  console.log(`Full page screenshot captured: ${screenshotPath}`);
}

captureFullPageScreenshot();
