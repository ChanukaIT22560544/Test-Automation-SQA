# Files to Add to test-data Folder

## Status: ✓ Code Updated Successfully

All 55+ tests in `pixelssuite_FullSystem.spec.js` have been updated to use actual test-data files.

---

## Current Files in test-data/ (ALL PRESENT ✓)

```
large-image-over-20mb.jpg      ✓ (Required for TC007, TC045)
large-over-20mb.pdf            ✓ (Required for TC011, TC021)  
large-word-over-20mb.docx      ✓ (Required for large Word tests)
sample.jpg                     ✓ (Required for image tests)
sample.png                     ✓ (Required for most image tests)
sample.webp                    ✓ (Optional - fallback to PNG works)
sample.pdf                     ✓ (Required for PDF tests)
sample.docx                    ✓ (Required for Word→PDF tests)
sample.doc                     ✓ (Optional fallback for Word tests)
```

---

## FILES TO ADD (MUST HAVE)

### 📌 sample-wide.png
- **What**: A wide aspect-ratio PNG image (recommend 200x100 or similar)
- **Why**: Tests TC003 and TC024 specifically test image aspect ratio handling
- **Used by**: 
  - TC024: `test('TC024 - Resize - Maintain ratio')`
  - TC003: `test('TC003 - Image→PDF - Order check')`
- **Specifications**:
  - Format: PNG (8-bit or 24-bit)
  - Dimensions: 2:1 or wider (e.g., 200x100, 300x100)
  - File size: 1-5 KB ideal
  - Must be a valid readable PNG image

---

## FILES TO REMOVE (OPTIONAL)

These files exist but aren't used by any tests:
- `large.jpg` - Orphaned file, safe to delete
- `tmp-sample.pdf` - Auto-generated temporary file, safe to delete

---

## How to Add sample-wide.png

### Option 1: Use ImageMagick (fastest)
```bash
magick convert -size 200x100 xc:blue sample-wide.png
```

### Option 2: Use Python Pillow
```python
from PIL import Image
img = Image.new('RGB', (200, 100), color='blue')
img.save('sample-wide.png')
```

### Option 3: Use online PNG generator
- Visit: https://www.pixelize.me/ or similar
- Create a 200x100 PNG image
- Save as `sample-wide.png` in `test-data/` folder

---

## Verification Commands

After adding files, verify with:

```bash
# List all test-data files
dir test-data /B

# Run tests with test-data files
npx playwright test tests/pixelssuite_FullSystem.spec.js --headed
```

---

## Code Changes Summary

### Old Approach (Before)
```javascript
// Always creates temporary files
test('TC003', async ({ page }) => {
  const img1 = createSamplePng('tc003-1.png');  // Creates temp file
  const img2 = createSamplePngWide('tc003-2.png');  // Creates temp file
```

### New Approach (After)
```javascript
// Uses test-data files, creates temp only if missing
test('TC003', async ({ page }) => {
  const img1 = resolveSamplePngPath('tc003-1.png');  // Uses test-data/sample.png
  const img2 = resolveSamplePngWidePath('tc003-2.png');  // Uses test-data/sample-wide.png
```

### Benefits
✓ Faster test execution (no file creation per test)
✓ Consistent test data across runs  
✓ Better for CI/CD pipelines
✓ Easier to troubleshoot test failures
✓ Graceful fallback if files missing

---

## Test Coverage After Update

| Category | Count | Using test-data |
|----------|-------|-----------------|
| Image→PDF | 7 | ✓ sample.jpg, sample.png, sample-wide.png |
| PDF→Word | 4 | ✓ sample.pdf |
| Word→PDF | 4 | ✓ sample.docx, sample.doc |
| Resize | 5 | ✓ sample.png, sample-wide.png |
| Crop | 8 | ✓ sample.png |
| Compress | 6 | ✓ sample.png |
| Convert | 5 | ✓ sample.png |
| PDF Editor | 7 | ✓ sample.pdf |
| Others | 12 | ✓ various files |
| **TOTAL** | **58** | **✓ All Updated** |

---

**Status**: Ready to run tests after adding `sample-wide.png` ✓
