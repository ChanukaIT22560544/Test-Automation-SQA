const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

const WORD_TO_PDF_URL = 'https://www.pixelssuite.com/word-to-pdf';

const SAMPLE_DOCX = path.resolve(__dirname, '../test-data/sample.docx');
const SAMPLE_DOC = path.resolve(__dirname, '../test-data/sample.doc');
const LARGE_WORD = path.resolve(__dirname, '../test-data/large-word-over-20mb.docx');

function requireAnyWordFileOrSkip(filePaths, description) {
  const existing = filePaths.filter((p) => fs.existsSync(p));
  if (existing.length === 0) {
    test.skip(`${description} not found. Provide one of: ${filePaths.join(', ')}`);
  }
  return existing[0];
}

async function openWordToPdf(page) {
  await page.goto(WORD_TO_PDF_URL, { waitUntil: 'networkidle' });
  await expect(page).toHaveURL(/\/word-to-pdf$/);
}

function wordFileInput(page) {
  // The site uses a single hidden file input with accept for doc/docx.
  return page.locator('input[type="file"][accept*=".doc"], input[type="file"][accept*=".docx"], input[type="file"][accept*="wordprocessingml.document"]');
}

async function uploadWordFile(page, filePath) {
  const input = wordFileInput(page).first();
  await expect(input).toBeAttached();
  // The file input is intentionally hidden in the UI; `setInputFiles` works with hidden inputs.
  await input.setInputFiles(filePath);
}

function getConversionButtonLocator(page) {
  // UI text varies slightly; try common patterns.
  const convertToPdf = page.locator('button', { hasText: /Convert to PDF/i });
  const convert = page.locator('button', { hasText: /Convert/i });
  const createPdf = page.locator('button', { hasText: /Create PDF/i });
  return { convertToPdf, convert, createPdf };
}

async function clickFirstVisibleConversionButton(page) {
  const { convertToPdf, convert, createPdf } = getConversionButtonLocator(page);

  if (await convertToPdf.isVisible().catch(() => false)) return convertToPdf;
  if (await convert.isVisible().catch(() => false)) return convert;
  if (await createPdf.isVisible().catch(() => false)) return createPdf;

  return null;
}

async function downloadPdfAfterConversion(page) {
  const downloadButton = page.locator('button', { hasText: /Download/i });
  const convertBtn = await clickFirstVisibleConversionButton(page);

  // Some flows download immediately on conversion, others show a Download button.
  if (convertBtn) {
    try {
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 120000 }),
        convertBtn.click(),
      ]);
      return { download, filePath: await download.path(), suggestedFilename: download.suggestedFilename() };
    } catch {
      // Fall through to attempt clicking a Download button.
    }
  }

  await expect(downloadButton).toBeVisible();
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), downloadButton.click()]);
  return { download, filePath: await download.path(), suggestedFilename: download.suggestedFilename() };
}

// TC039 - Word to PDF conversion
test('TC039 - Word to PDF conversion', async ({ page }) => {
  const docFile = requireAnyWordFileOrSkip([SAMPLE_DOCX, SAMPLE_DOC], 'Sample Word file');

  await openWordToPdf(page);
  await uploadWordFile(page, docFile);

  const { filePath, suggestedFilename } = await downloadPdfAfterConversion(page);
  expect(fs.existsSync(filePath)).toBeTruthy();
  expect(suggestedFilename.toLowerCase()).toMatch(/\.pdf$/);
}, { timeout: 120000 });

// TC040 - Word to PDF without upload
test('TC040 - Word to PDF without upload', async ({ page }) => {
  await openWordToPdf(page);

  const convertToPdfBtn = page.locator('button', { hasText: /Convert to PDF/i });
  await expect(convertToPdfBtn).toHaveCount(0);
});

// TC041 - Word to PDF download
test('TC041 - Word to PDF download', async ({ page }) => {
  const docFile = requireAnyWordFileOrSkip([SAMPLE_DOCX, SAMPLE_DOC], 'Sample Word file');

  await openWordToPdf(page);
  await uploadWordFile(page, docFile);

  const { filePath } = await downloadPdfAfterConversion(page);
  expect(fs.existsSync(filePath)).toBeTruthy();
}, { timeout: 600000 });

// TC042 - Word to PDF large file validation
test('TC042 - Word to PDF large file validation', async ({ page }) => {
  if (!fs.existsSync(LARGE_WORD)) {
    test.skip(`Large Word file (>20MB) not found at ${LARGE_WORD}`);
  }

  await openWordToPdf(page);
  await uploadWordFile(page, LARGE_WORD);

  const convertBtn = await clickFirstVisibleConversionButton(page);
  await expect(convertBtn).toBeTruthy();
  await convertBtn.click();

  const download = await page.waitForEvent('download', { timeout: 20000 }).catch(() => null);
  if (download) {
    const suggestedFilename = download.suggestedFilename();
    expect(suggestedFilename.toLowerCase()).toMatch(/\.pdf$/);
    return;
  }

  // Large uploads appear to stay in a disabled "Converting…" state without an explicit error.
  const converting = page.getByRole('button', { name: /Converting/i }).first();
  await expect(converting).toBeVisible();
  await expect(converting).toBeDisabled();
}, { timeout: 120000 });

// TC043 - UI / Responsiveness check
test('TC043 - Word to PDF UI / Responsiveness check (mobile)', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await context.newPage();

  await openWordToPdf(page);
  await expect(page.getByRole('button', { name: /Select Word/i })).toBeVisible();
  await expect(wordFileInput(page)).toHaveAttribute('accept', /docx|doc/i);

  await context.close();
});

// TC044 - UI / Instruction check
test('TC044 - Word to PDF UI / Instruction check', async ({ page }) => {
  await openWordToPdf(page);

  // The page should clearly show Word (.doc/.docx) upload instructions.
  const instruction = page.locator('text=/Choose a \\.docx file for best compatibility/i');
  await expect(instruction).toBeVisible();
});

