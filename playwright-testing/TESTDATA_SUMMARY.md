# Test-Data Files Summary

## Code Changes Made

Updated `tests/pixelssuite_FullSystem.spec.js` to use actual test-data files instead of creating temporary files on-the-fly.

### New Resolver Functions Added:
- `resolveSamplePdfPath(browser)` - Uses `test-data/sample.pdf`, falls back to creating via Playwright
- `resolveSamplePngPath(name)` - Uses `test-data/sample.png`, falls back to creating minimal PNG
- `resolveSamplePngWidePath(name)` - Uses `test-data/sample-wide.png`, falls back to creating 2x1 PNG
- `resolveSampleJpgPath(name)` - Uses `test-data/sample.jpg`, falls back to creating minimal JPG
- `resolveSampleWebpPath(name)` - Uses `test-data/sample.webp`, falls back to PNG
- `resolveWordFixturePath()` - Prefers `test-data/sample.docx` or `test-data/sample.doc`

### All Tests Updated:
- 55 test cases now use the resolver functions instead of creating temporary files
- Creates temporary files only as fallback when test-data files don't exist
- Maintains graceful degradation for large file tests

---

## Existing Test-Data Files ✓ (11 files)

| File | Size | Required | Purpose |
|------|------|----------|---------|
| `sample.jpg` | ✓ | YES | Image to PDF, Crop, Compress, Image Conversion tests |
| `sample.png` | ✓ | YES | Image to PDF, Crop, Resize, Bulk Resize, Compress, Converters, Meme, OCR, Tools |
| `sample.webp` | ✓ | Optional | WebP conversion tests (graceful fallback to PNG) |
| `sample.pdf` | ✓ | YES | PDF Editor, PDF to Word conversion tests |
| `sample.docx` | ✓ | YES | Word to PDF conversion tests (primary) |
| `sample.doc` | ✓ | Optional | Word to PDF conversion tests (fallback) |
| `large-image-over-20mb.jpg` | ✓ | YES | Large file validation tests (>20MB) |
| `large-over-20mb.pdf` | ✓ | YES | Large PDF validation tests (>20MB) |
| `large-word-over-20mb.docx` | ✓ | YES | Large Word file validation tests (>20MB) |
| `large.jpg` | ✓ | No | Not used by tests (orphan file) |
| `tmp-sample.pdf` | ✓ | No | Auto-generated, can be ignored |

---

## MUST ADD to test-data folder

### 1. **sample-wide.png** (HIGH PRIORITY)
   - **Purpose**: Used for image ratio/aspect ratio tests (TC003, TC024)
   - **Specification**: 
     - Format: PNG
     - Dimensions: Recommend 2x1 (e.g., 200x100 pixels)
     - Should be a valid, readable PNG image
   - **Tests using this**:
     - TC003: Image→PDF - Order check (verifies image file order)
     - TC024: Resize - Maintain ratio (tests aspect ratio preservation)
   - **Note**: Currently creates temporary 2x1 pixel PNG if file missing, but actual image is better

---

## Summary

### ✓ All Required Files Present
The boilerplate test-data files are complete. The updated code will:
- **Use existing files** when available (primary strategy)
- **Create temporary files** only if test-data files are missing (graceful fallback)

### Files to Add for Best Performance
- **sample-wide.png**: Add a real 2x1 (or wider aspect ratio) PNG image, ~2-5KB

### Files to Remove (Optional)
- `large.jpg` - Not used by any tests
- `tmp-sample.pdf` - Auto-generated, not needed

### Test Coverage
- **Total tests using test-data**: 55+ test cases
- **Core conversions supported**: Image→PDF, PDF→Word, Word→PDF, Image tools
- **Edge cases covered**: Large file handling, format validation, UI responsiveness

---

## Code Structure

All resolver functions follow this pattern:
```javascript
function resolve[Sample](name = 'default.ext') {
  const testDataPath = path.resolve(__dirname, '../test-data/sample.ext');
  if (fs.existsSync(testDataPath)) return testDataPath;
  // fallback: create temporary file
  return writeFile(tmpPath(name), BUFFER_DATA);
}
```

This ensures:
1. Tests prefer checked-in test-data files
2. Tests work even if files are missing (creates on-the-fly)
3. Easy maintenance and updates

---

## Updated Test Functions (Examples)

### Before:
```javascript
test('TC001 - Image→PDF - Single image convert', async ({ page }) => {
  const img = createSampleJpg('tc001.jpg');  // Always creates temp file
  // ...
});
```

### After:
```javascript
test('TC001 - Image→PDF - Single image convert', async ({ page }) => {
  const img = resolveSampleJpgPath();  // Uses test-data/sample.jpg, or creates if missing
  // ...
});
```

---

## Next Steps

1. ✓ Code updated to use test-data files
2. **ADD: sample-wide.png** to test-data folder
3. (Optional) Remove unused `large.jpg` and `tmp-sample.pdf`
4. Run full test suite: `npx playwright test tests/pixelssuite_FullSystem.spec.js`
