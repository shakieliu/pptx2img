'use client';

import { useState, useRef, useCallback, DragEvent, ChangeEvent } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type Cols = 1 | 2 | 3;
type Fmt = 'png' | 'jpg';
type Gap = 8 | 16 | 32;

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [cols, setCols] = useState<Cols>(1);
  const [fmt, setFmt] = useState<Fmt>('png');
  const [gap, setGap] = useState<Gap>(16);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const reset = () => {
    setFile(null);
    setPreview('');
    setStatus('');
    setError('');
    setLoading(false);
    canvasRef.current = null;
    if (inputRef.current) inputRef.current.value = '';
  };

  const onFile = (f: File | null) => {
    if (f && !f.name.toLowerCase().endsWith('.pptx')) {
      setError('Please upload a .pptx file');
      return;
    }
    setFile(f);
    setError('');
    setPreview('');
  };

  const onDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    onFile(e.dataTransfer.files?.[0] || null);
  }, []);

  const generate = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    setStatus('Uploading & converting…');
    setPreview('');

    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API}/api/convert`, { method: 'POST', body: form });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(j.error || 'Conversion failed');
      }
      const { images } = await res.json() as { images: string[]; count: number };
      if (!images.length) throw new Error('No slides found');

      setStatus(`Got ${images.length} slides. Stitching…`);

      // Load all images
      const imgs = await Promise.all(
        images.map(
          (b64) =>
            new Promise<HTMLImageElement>((resolve, reject) => {
              const img = new Image();
              img.onload = () => resolve(img);
              img.onerror = reject;
              img.src = `data:image/png;base64,${b64}`;
            })
        )
      );

      // Calculate canvas size
      const slideW = imgs[0].width;
      const slideH = imgs[0].height;
      const rows = Math.ceil(imgs.length / cols);
      const cellW = slideW;
      const totalW = cellW * cols + gap * (cols - 1);
      const totalH = slideH * rows + gap * (rows - 1);

      const canvas = document.createElement('canvas');
      canvas.width = totalW;
      canvas.height = totalH;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, totalW, totalH);

      imgs.forEach((img, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = col * (cellW + gap);
        const y = row * (slideH + gap);
        ctx.drawImage(img, x, y, cellW, slideH);
      });

      canvasRef.current = canvas;
      const mimeType = fmt === 'jpg' ? 'image/jpeg' : 'image/png';
      setPreview(canvas.toDataURL(mimeType, 0.92));
      setStatus(`Done! ${images.length} slides stitched.`);
    } catch (e: any) {
      setError(e.message);
      setStatus('');
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    if (!canvasRef.current) return;
    const mimeType = fmt === 'jpg' ? 'image/jpeg' : 'image/png';
    const ext = fmt === 'jpg' ? 'jpg' : 'png';
    const link = document.createElement('a');
    link.download = `slides.${ext}`;
    link.href = canvasRef.current.toDataURL(mimeType, 0.92);
    link.click();
  };

  const Toggle = <T extends string | number>({
    label,
    options,
    value,
    onChange,
    display,
  }: {
    label: string;
    options: T[];
    value: T;
    onChange: (v: T) => void;
    display?: (v: T) => string;
  }) => (
    <div className="control-group">
      <label>{label}</label>
      <div className="toggle-row">
        {options.map((o) => (
          <button
            key={String(o)}
            className={`toggle-btn ${value === o ? 'selected' : ''}`}
            onClick={() => onChange(o)}
          >
            {display ? display(o) : String(o)}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <h1>PPTX → Long Image</h1>
      <p className="subtitle">Upload a PowerPoint, get a single stitched image</p>

      <div className="card">
        <div
          className={`dropzone ${dragActive ? 'active' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          <p>{file ? '📄' : '📂'} {file ? 'File selected' : 'Drop .pptx here or click to browse'}</p>
          {file && <p className="filename">{file.name}</p>}
          <input
            ref={inputRef}
            type="file"
            accept=".pptx"
            hidden
            onChange={(e: ChangeEvent<HTMLInputElement>) => onFile(e.target.files?.[0] || null)}
          />
        </div>

        <div className="controls">
          <Toggle label="Columns" options={[1, 2, 3] as Cols[]} value={cols} onChange={setCols} />
          <Toggle label="Format" options={['png', 'jpg'] as Fmt[]} value={fmt} onChange={setFmt} display={(v) => v.toUpperCase()} />
          <Toggle
            label="Gap"
            options={[8, 16, 32] as Gap[]}
            value={gap}
            onChange={setGap}
            display={(v) => ({ 8: 'S', 16: 'M', 32: 'L' }[v] || String(v))}
          />
        </div>

        <button className="btn-primary" disabled={!file || loading} onClick={generate}>
          {loading ? 'Converting…' : 'Generate'}
        </button>

        {preview && (
          <>
            <button className="btn-download" onClick={download}>
              Download {fmt.toUpperCase()}
            </button>
            <button className="btn-reset" onClick={reset}>
              ↩ New Upload
            </button>
          </>
        )}

        {status && <p className="status">{status}</p>}
        {error && <p className="status error">❌ {error}</p>}

        {preview && (
          <div className="preview">
            <img src={preview} alt="Preview" />
          </div>
        )}
      </div>
    </>
  );
}
