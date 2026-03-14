import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

const WEBFLOW_ROOT = path.join(process.cwd(), 'posties.webflow');

const MIME_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.html': 'text/html; charset=utf-8',
};

function isSafePath(targetPath: string) {
  const normalized = path.normalize(targetPath);
  return normalized.startsWith(WEBFLOW_ROOT);
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: requestedParts } = await params;
    const targetPath = path.join(WEBFLOW_ROOT, ...requestedParts);

    if (!isSafePath(targetPath)) {
      return NextResponse.json({ error: 'Invalid asset path' }, { status: 400 });
    }

    const file = await fs.readFile(targetPath);
    const extension = path.extname(targetPath).toLowerCase();

    return new NextResponse(file, {
      headers: {
        'Content-Type': MIME_TYPES[extension] || 'application/octet-stream',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Failed to serve Webflow asset:', error);
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  }
}
