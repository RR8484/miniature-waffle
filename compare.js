import resemble from 'resemblejs';
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

async function compareScreenshots(baselinePath, comparePath) {
  const screenshot1 = await fs.readFile(baselinePath);
  const screenshot2 = await fs.readFile(comparePath);

  return new Promise((resolve) => {
    resemble(screenshot1)
      .compareTo(screenshot2)
      .ignoreColors()
      .onComplete(result => resolve(result));
  });
}

async function generateHTMLReport(results) {
  const html = `
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .different { background-color: #ffcccb; }
        img { max-width: 300px; }
      </style>
    </head>
    <body>
      <h1>Visual Regression Test Report</h1>
      <table>
        <tr>
          <th>Page</th>
          <th>Mismatch %</th>
          <th>Diff Image</th>
        </tr>
        ${results.map(result => `
          <tr class="${result.misMatchPercentage > 0 ? 'different' : ''}">
            <td>${result.name}</td>
            <td>${parseFloat(result.misMatchPercentage).toFixed(2)}%</td>
            <td><img src="${result.diffPath}" alt="Diff for ${result.name}"></td>
          </tr>
        `).join('')}
      </table>
    </body>
    </html>
  `;

  await fs.writeFile('visual_regression_report.html', html);
  console.log('HTML report generated: visual_regression_report.html');
}

async function processPage(page) {
  const baselineFolder = 'baseline';
  const currentFolder = 'current';
  const diffFolder = 'diff';

  const baselineScreenshotPath = path.join(baselineFolder, `${page.name}.png`);
  const compareScreenshotPath = path.join(currentFolder, `${page.name}.png`);
  const diffPath = path.join(diffFolder, `${page.name}.png`);

  // Ensure folders exist
  await fs.mkdir(baselineFolder, { recursive: true });
  await fs.mkdir(currentFolder, { recursive: true });
  await fs.mkdir(diffFolder, { recursive: true });

  // Capture comparison screenshot
  await captureScreenshot(page.url, compareScreenshotPath);
  console.log(`Screenshot captured for ${page.name}: ${compareScreenshotPath}`);

  try {
    const comparison = await compareScreenshots(baselineScreenshotPath, compareScreenshotPath);

    // Save diff image
    await fs.writeFile(diffPath, comparison.getBuffer());

    console.log(`Comparison result for ${page.name}:`, comparison);
    console.log(`Diff image saved: ${diffPath}`);
    console.log(`Mismatch percentage: ${comparison.misMatchPercentage}%`);

    return {
      name: page.name,
      misMatchPercentage: comparison.misMatchPercentage,
      diffPath: diffPath
    };
  } catch (error) {
    console.error(`Error during image comparison for ${page.name}:`, error);
    return {
      name: page.name,
      misMatchPercentage: 100,
      diffPath: ''
    };
  }
}

async function runVisualTests() {
  const results = [];
  for (const page of pagesToTest) {
    const result = await processPage(page);
    results.push(result);
  }
  await generateHTMLReport(results);
}

runVisualTests();

