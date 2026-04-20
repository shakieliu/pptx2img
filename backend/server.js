const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { execSync } = require('child_process');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const upload = multer({ dest: os.tmpdir(), limits: { fileSize: 100 * 1024 * 1024 } });

app.use(cors());
app.use(express.json({ limit: '200mb' }));

app.get('/health', (_, res) => res.json({ status: 'ok' }));

app.post('/api/convert', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pptx2img-'));
  const pptxPath = path.join(tmpDir, 'input.pptx');
  const pdfPath = path.join(tmpDir, 'input.pdf');

  try {
    fs.renameSync(req.file.path, pptxPath);

    // PPTX → PDF via LibreOffice headless
    execSync(
      `libreoffice --headless --convert-to pdf --outdir "${tmpDir}" "${pptxPath}"`,
      { timeout: 120000, stdio: 'pipe' }
    );

    if (!fs.existsSync(pdfPath)) {
      throw new Error('PDF conversion failed');
    }

    // PDF → per-page PNG via poppler's pdftoppm (installed in Docker)
    execSync(
      `pdftoppm -png -r 300 "${pdfPath}" "${path.join(tmpDir, 'slide')}"`,
      { timeout: 120000, stdio: 'pipe' }
    );

    // Collect PNGs, sort by page number
    const pngFiles = fs.readdirSync(tmpDir)
      .filter(f => f.startsWith('slide-') && f.endsWith('.png'))
      .sort();

    const images = [];
    for (const file of pngFiles) {
      const buf = await sharp(path.join(tmpDir, file))
        .png({ quality: 90 })
        .toBuffer();
      images.push(buf.toString('base64'));
    }

    res.json({ images, count: images.length });
  } catch (err) {
    console.error('Conversion error:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    // Clean multer temp file if rename failed
    if (req.file && fs.existsSync(req.file.path)) {
      fs.rmSync(req.file.path, { force: true });
    }
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend listening on :${PORT}`));
