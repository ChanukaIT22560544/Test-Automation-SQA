const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

const IMAGE_TO_PDF_URL = 'https://www.pixelssuite.com/image-to-pdf';

const SAMPLE_JPG = path.resolve(__dirname, '../test-data/sample.jpg');
const SAMPLE_PNG = path.resolve(__dirname, '../test-data/sample.png');
const SAMPLE_WEBP = path.resolve(__dirname, '../test-data/sample.webp');
const LARGE_IMAGE = path.resolve(__dirname, '../test-data/large-image-over-20mb.jpg');

function requireFileOrSkip(filePath, description) {
  if (!fs.existsSync(filePath)) {
    test.skip(`${description} file not found at ${filePath}`);
  }
}

async function openImageToPdf(page) {
  await page.goto(IMAGE_TO_PDF_URL, { waitUntil: 'networkidle' });
  await expect(page).toHaveURL(/\/image-to-pdf$/);
}

async function selectImages(page, files) {
  const fileInput = page.locator('input[type="file"][accept="image/*"]');
  await expect(fileInput).toHaveAttribute('accept', /image\/\*/);
  await fileInput.setInputFiles(files);
}

async function clickCreatePdfAndWaitForDownload(page) {
  const createButton = page.getByRole('button', { name: /Create PDF/i });
  await expect(createButton).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    createButton.click(),
  ]);
  const filePath = await download.path();
  expect(filePath).toBeTruthy();
  return {
    filePath,
    suggestedFilename: download.suggestedFilename(),
  };
}

// TC026 - Image to PDF conversion (single image)
test('TC026 - Image to PDF conversion (single image)', async ({ page }) => {
  requireFileOrSkip(SAMPLE_JPG, 'Sample JPG');

  await openImageToPdf(page);
  await selectImages(page, SAMPLE_JPG);

  const { filePath, suggestedFilename } = await clickCreatePdfAndWaitForDownload(page);
  expect(fs.existsSync(filePath)).toBeTruthy();
  expect(suggestedFilename.toLowerCase()).toMatch(/\.pdf$/);
});

// TC027 - Image to PDF conversion (multiple images)
test('TC027 - Image to PDF conversion (multiple images)', async ({ page }) => {
  requireFileOrSkip(SAMPLE_JPG, 'Sample JPG');

  await openImageToPdf(page);
  await selectImages(page, [SAMPLE_JPG, SAMPLE_JPG]);

  const { filePath, suggestedFilename } = await clickCreatePdfAndWaitForDownload(page);
  expect(fs.existsSync(filePath)).toBeTruthy();
  expect(suggestedFilename.toLowerCase()).toMatch(/\.pdf$/);
});

// TC028 - Image to PDF without upload
test('TC028 - Image to PDF without upload', async ({ page }) => {
  await openImageToPdf(page);

  const createButton = page.getByRole('button', { name: /Create PDF/i });
  await expect(createButton).toBeVisible();
  await expect(createButton).toBeDisabled();

  await expect(page.getByText('Drag and drop your file here')).toBeVisible();
});

// TC029 - Image to PDF download
test('TC029 - Image to PDF download', async ({ page }) => {
  requireFileOrSkip(SAMPLE_JPG, 'Sample JPG');

  await openImageToPdf(page);
  await selectImages(page, SAMPLE_JPG);

  const { filePath, suggestedFilename } = await clickCreatePdfAndWaitForDownload(page);
  expect(fs.existsSync(filePath)).toBeTruthy();
  expect(suggestedFilename.toLowerCase()).toMatch(/\.pdf$/);
});

// TC030 - Image to PDF format support
test('TC030 - Image to PDF format support', async ({ page }) => {
  requireFileOrSkip(SAMPLE_JPG, 'Sample JPG');

  await openImageToPdf(page);

  const availableFiles = [];
  if (fs.existsSync(SAMPLE_JPG)) availableFiles.push(SAMPLE_JPG);
  if (fs.existsSync(SAMPLE_PNG)) availableFiles.push(SAMPLE_PNG);
  if (fs.existsSync(SAMPLE_WEBP)) availableFiles.push(SAMPLE_WEBP);

  if (availableFiles.length === 0) {
    test.skip('No sample JPG/PNG/WEBP images found in test-data');
  }

  await selectImages(page, availableFiles);

  const { filePath, suggestedFilename } = await clickCreatePdfAndWaitForDownload(page);
  expect(fs.existsSync(filePath)).toBeTruthy();
  expect(suggestedFilename.toLowerCase()).toMatch(/\.pdf$/);
});

// TC031 - Image to PDF large file
test('TC031 - Image to PDF large file validation', async ({ page }) => {
  if (!fs.existsSync(LARGE_IMAGE)) {
    test.skip(`Large test image (>20MB) not found at ${LARGE_IMAGE}`);
  }

  await openImageToPdf(page);
  await selectImages(page, LARGE_IMAGE);

  const createButton = page.getByRole('button', { name: /Create PDF/i });
  await expect(createButton).toBeVisible();

  // Start waiting for download, but expect it to fail due to size limit
  const downloadPromise = page.waitForEvent('download', { timeout: 120000 }).catch(() => null);
  await createButton.click();

  const download = await downloadPromise;
  if (download) {
    // If download happens, fail the test because large files should be rejected
    throw new Error('Large file was converted to PDF, but site should reject files over 20MB');
  }

  // Expect an error message indicating file size limit
  const errorMessage = page.locator('text=/file too large|size limit|max 20MB|exceeds limit|too big/i').first();
  await expect(errorMessage).toBeVisible({ timeout: 120000 });
}, { timeout: 120000 });

// TC032 - UI / Responsiveness check
test('TC032 - Image to PDF UI / Responsiveness check', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await context.newPage();

  await openImageToPdf(page);

  await expect(page.getByRole('button', { name: /Select Images/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Create PDF/i })).toBeVisible();

  await context.close();
});

