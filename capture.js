import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

const viewportWidth = 1920;
const viewportHeight = 1080;

// Configuration object for pages to test
const pagesToTest = [
  { name: 'home', url: 'https://creditcardgenius.ca' },
  { name: 'about', url: 'https://creditcardgenius.ca/about' },
  { name: 'offers', url: 'https://creditcardgenius.ca/offers' },
  { name: 'compare', url: 'https://creditcardgenius.ca/credit-cards' },
  { name: 'contact', url: 'https://creditcardgenius.ca/contact' },
  { name: 'blog', url: 'https://creditcardgenius.ca/blog' },
  { name: 'faq', url: 'https://creditcardgenius.ca/faq' },
  { name: 'terms', url: 'https://creditcardgenius.ca/terms' },
  { name: 'privacy', url: 'https://creditcardgenius.ca/privacy' },
  { name: 'credit-score', url: 'https://creditcardgenius.ca/blog/credit-score-canada'}
];

async function captureScreenshot(url, filePath) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.setViewport({ width: viewportWidth, height: viewportHeight });
  await page.goto(url, { waitUntil: 'networkidle0' });

  // Scroll through the page to trigger lazy loading
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if(totalHeight >= scrollHeight){
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });

  // Scroll back to top
  await page.evaluate(_ => {
    window.scrollTo(0, 0);
  });

  await page.screenshot({ path: filePath, fullPage: true });
  await browser.close();
  console.log(`Screenshot captured: ${filePath}`);
}

async function captureBaselines() {
  const baselineFolder = 'baseline';

  // Ensure baseline folder exists
  await fs.mkdir(baselineFolder, { recursive: true });

  for (const page of pagesToTest) {
    const baselineScreenshotPath = path.join(baselineFolder, `${page.name}.png`);
    await captureScreenshot(page.url, baselineScreenshotPath);
    console.log(`Baseline screenshot captured for ${page.name}: ${baselineScreenshotPath}`);
  }
}

captureBaselines();
