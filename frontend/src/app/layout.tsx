import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PPTX → Long Image',
  description: 'Convert PowerPoint slides into a single long image',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
