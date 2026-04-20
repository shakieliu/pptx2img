# PPTX → Long Image

Monorepo: converts PowerPoint slides into a single stitched long image.

## Quick Start

### Backend
```bash
cd backend
npm install
# Requires: libreoffice, poppler-utils (pdftoppm) on system
npm start        # http://localhost:3001
```

### Frontend
```bash
cd frontend
npm install
npm run dev      # http://localhost:3000
```

### Docker (backend)
```bash
cd backend
docker build -t pptx2img-backend .
docker run -p 3001:3001 pptx2img-backend
```

## Deploy
- **Backend** → Railway (Dockerfile included + railway.json)
- **Frontend** → Vercel (set `NEXT_PUBLIC_API_URL` to your Railway backend URL)

## Architecture
1. Upload .pptx → backend converts via LibreOffice headless → PDF → PNG (pdftoppm)
2. Returns base64 PNG array
3. Frontend stitches slides on Canvas with configurable columns/gap/format
4. Download as PNG or JPG
