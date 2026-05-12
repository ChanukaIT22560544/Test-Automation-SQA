const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

const CROP_URL = 'https://www.pixelssuite.com/crop-png';
const SAMPLE_IMAGE_PATH = path.resolve(__dirname, '../test-data/sample.jpg');
const LARGE_IMAGE_PATH = path.resolve(__dirname, '../test-data/large-image-over-20mb.jpg');

async function openCropTool(page) {
  await page.goto(CROP_URL, { waitUntil: 'networkidle' });
  await expect(page).toHaveURL(/\/crop-png$/);
}

async function uploadSampleImage(page) {
  await page.locator('input[type="file"]').setInputFiles(SAMPLE_IMAGE_PATH);
  await expect(page.locator('label:has-text("X") input[type="number"]')).toBeVisible();
}

function axisInput(page, labelText) {
  return page.locator(`label:has-text("${labelText}") input[type="number"]`);
}

async function downloadCroppedImage(page) {
  const downloadButton = page.getByRole('button', { name: 'Download' });
  await expect(downloadButton).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    downloadButton.click(),
  ]);
  const filePath = await download.path();
  expect(filePath).toBeTruthy();
  return {
    filePath,
    suggestedFilename: download.suggestedFilename(),
  };
}

function readPngDimensions(filePath) {
  const data = fs.readFileSync(filePath);
  const pngSignature = '89504e470d0a1a0a';
  expect(data.subarray(0, 8).toString('hex')).toBe(pngSignature);
  return {
    width: data.readUInt32BE(16),
    height: data.readUInt32BE(20),
  };
}

const testCases = [
  { id: 'TC019', title: 'Crop image with custom dimensions' },
  { id: 'TC020', title: 'Crop using selected width and height' },
  { id: 'TC021', title: 'Crop entire image (full area selected)' },
  { id: 'TC022', title: 'Crop without uploading image' },
  { id: 'TC023', title: 'Download cropped image' },
  { id: 'TC024', title: 'UI / Responsiveness check' },
  
];

test(`${testCases[0].id} - ${testCases[0].title}`, async ({ page }) => {
  await openCropTool(page);
  await uploadSampleImage(page);

  await axisInput(page, 'X').fill('80');
  await axisInput(page, 'Y').fill('40');
  await axisInput(page, 'Width').fill('220');
  await axisInput(page, 'Height').fill('160');

  const { filePath } = await downloadCroppedImage(page);
  const { width, height } = readPngDimensions(filePath);
  expect(width).toBe(220);
  expect(height).toBe(160);
});

test(`${testCases[1].id} - ${testCases[1].title}`, async ({ page }) => {
  await openCropTool(page);
  await uploadSampleImage(page);

  await axisInput(page, 'Width').fill('300');
  await axisInput(page, 'Height').fill('200');

  const { filePath } = await downloadCroppedImage(page);
  const { width, height } = readPngDimensions(filePath);
  expect(width).toBe(300);
  expect(height).toBe(200);
});

test(`${testCases[2].id} - ${testCases[2].title}`, async ({ page }) => {
  await openCropTool(page);
  await uploadSampleImage(page);

  const originalWidth = await axisInput(page, 'Width').inputValue();
  const originalHeight = await axisInput(page, 'Height').inputValue();
  await axisInput(page, 'X').fill('0');
  await axisInput(page, 'Y').fill('0');
  await axisInput(page, 'Width').fill(originalWidth);
  await axisInput(page, 'Height').fill(originalHeight);

  const { filePath } = await downloadCroppedImage(page);
  const { width, height } = readPngDimensions(filePath);
  expect(width).toBe(Number(originalWidth));
  expect(height).toBe(Number(originalHeight));
});

test(`${testCases[3].id} - ${testCases[3].title}`, async ({ page }) => {
  await openCropTool(page);

  await expect(page.getByRole('button', { name: 'Download' })).toBeHidden();
  await expect(page.locator('input[type="number"]')).toHaveCount(0);
});

test(`${testCases[4].id} - ${testCases[4].title}`, async ({ page }) => {
  await openCropTool(page);
  await uploadSampleImage(page);
  await axisInput(page, 'Width').fill('180');
  await axisInput(page, 'Height').fill('120');

  const { filePath, suggestedFilename } = await downloadCroppedImage(page);
  expect(fs.existsSync(filePath)).toBeTruthy();
  expect(suggestedFilename.toLowerCase()).toMatch(/\.png$/);
});

test(`${testCases[5].id} - ${testCases[5].title}`, async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await context.newPage();

  await openCropTool(page);
  await uploadSampleImage(page);
  await expect(page.getByRole('button', { name: 'Select files' })).toBeVisible();
  await expect(axisInput(page, 'X')).toBeVisible();
  await expect(axisInput(page, 'Y')).toBeVisible();
  await expect(axisInput(page, 'Width')).toBeVisible();
  await expect(axisInput(page, 'Height')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download' })).toBeVisible();

  await context.close();
});


// TC026 - Crop large file validation
test('TC026 - Crop image large file validation', async ({ page }) => {
  if (!fs.existsSync(LARGE_IMAGE_PATH)) {
    test.skip(`Large test image (>20MB) not found at ${LARGE_IMAGE_PATH}`);
  }

  await openCropTool(page);
  await page.locator('input[type="file"]').setInputFiles(LARGE_IMAGE_PATH);

  // Wait for either an error message or the tool to process the image
  const errorMessage = page.locator('text=/file too large|size limit|max 20MB|exceeds limit|too big/i').first();
  const uploadingSpinner = page.locator('[data-testid="loading"], .spinner, [role="status"]').first();

  try {
    // Check if an error message appears immediately
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
    // If we get here, validation is working correctly
    return;
  } catch {
    // No immediate error, check if image is being processed
  }

  // If image was processed, wait a moment and check again for error
  await page.waitForTimeout(2000);
  
  // Check if download button is visible (which would mean file was processed incorrectly)
  const downloadButton = page.getByRole('button', { name: 'Download' });
  const isDownloadVisible = await downloadButton.isVisible().catch(() => false);

  if (isDownloadVisible) {
    throw new Error('Large image file was processed without validation error. Site should reject files over 20MB');
  }

  // Verify that an error message is shown for large file
  await expect(errorMessage).toBeVisible({ timeout: 10000 });
}, { timeout: 120000 });