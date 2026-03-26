import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BLOCKED_HOST_PATTERNS = [
  /^localhost$/,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^\[::1\]$/,
  /^metadata\./,
];

export async function GET(req: NextRequest) {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const target = searchParams.get('url');
  const mode = (searchParams.get('mode') ?? 'view') as 'view' | 'download';
  const filename = searchParams.get('filename') ?? undefined;

  if (!target) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }

  // SSRF guard: protocol + private IP blocking
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(target);
    if (!/^https?:$/.test(parsedUrl.protocol)) {
      return NextResponse.json(
        { error: 'Only http/https allowed' },
        { status: 400 },
      );
    }
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  if (BLOCKED_HOST_PATTERNS.some((p) => p.test(hostname))) {
    return NextResponse.json({ error: 'Blocked host' }, { status: 403 });
  }

  try {
    const upstream = await fetch(target, {
      cache: 'no-store',
      redirect: 'follow',
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: `Upstream error: ${upstream.status}` },
        { status: upstream.status || 502 },
      );
    }

    const contentType =
      upstream.headers.get('content-type') ?? 'application/octet-stream';
    const guessed = guessNameFromUrl(target, contentType);
    const name = filename || guessed;
    const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '_');

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Cache-Control', 'private, no-store');

    if (mode === 'download') {
      headers.set('Content-Disposition', `attachment; filename="${safeName}"`);
    } else {
      headers.set('Content-Disposition', 'inline');
    }

    return new NextResponse(upstream.body, { status: 200, headers });
  } catch (e: any) {
    return NextResponse.json(
      { error: String(e?.message || e) },
      { status: 500 },
    );
  }
}

function extFromMime(type?: string) {
  if (!type) return 'bin';
  const t = type.toLowerCase();
  if (t.includes('png')) return 'png';
  if (t.includes('jpeg') || t.includes('jpg')) return 'jpg';
  if (t.includes('webp')) return 'webp';
  if (t.includes('gif')) return 'gif';
  if (t.includes('mp4')) return 'mp4';
  if (t.includes('webm')) return 'webm';
  if (t.includes('quicktime') || t.includes('mov')) return 'mov';
  return 'bin';
}

function guessNameFromUrl(raw: string, contentType: string) {
  try {
    const u = new URL(raw);
    const last = u.pathname.split('/').filter(Boolean).pop() || 'file';
    if (last.includes('.')) return last;
    const ext = extFromMime(contentType);
    return `${last}.${ext}`;
  } catch {
    const ext = extFromMime(contentType);
    return `file.${ext}`;
  }
}
