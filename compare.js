import resemble from 'resemblejs';
import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

const viewportWidth = 1920;
const viewportHeight = 1080;

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

async function captureAndCompareScreenshot() {
  const baselineScreenshotPath = path.join('baseline', 'screenshot1.png');
  const currentFolder = 'current';
  const compareScreenshotPath = path.join(currentFolder, 'screenshot2.png');

  // Ensure the 'current' folder exists
  await fs.mkdir(currentFolder, { recursive: true });

  // Capture comparison screenshot
  await captureScreenshot('https://creditcardgenius.ca', compareScreenshotPath);
  console.log(`Second screenshot captured: ${compareScreenshotPath}`);

  // Compare screenshots
  const screenshot1 = await fs.readFile(baselineScreenshotPath);
  const screenshot2 = await fs.readFile(compareScreenshotPath);

  try {
    const comparison = await new Promise((resolve) => {
      resemble(screenshot1)
        .compareTo(screenshot2)
        .ignoreColors()
        .onComplete(result => resolve(result));
    });

    // Ensure diff folder exists
    const diffFolder = 'diff';
    await fs.mkdir(diffFolder, { recursive: true });

    // Save diff image
    const diffPath = path.join(diffFolder, 'diff.png');
    await fs.writeFile(diffPath, comparison.getBuffer());

    console.log('Comparison result:', comparison);
    console.log(`Diff image saved: ${diffPath}`);
    console.log(`Mismatch percentage: ${comparison.misMatchPercentage}%`);
  } catch (error) {
    console.error('Error during image comparison:', error);
  }
}

captureAndCompareScreenshot();

