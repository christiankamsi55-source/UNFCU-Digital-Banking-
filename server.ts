import 'dotenv/config';
import fs from 'fs';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { initDatabase } from './server/db';
import { apiRouter } from './server/routes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PRIVATE_ROBOTS_PATHS = new Set([
  '/admin',
  '/admin-portal',
  '/dashboard',
  '/account-details',
  '/transfers',
  '/transfer',
  '/withdrawal',
  '/history',
  '/notifications',
  '/profile',
  '/login',
  '/register',
  '/reset-password',
  '/welcome',
  '/digital-banking',
]);

const PREFERRED_PUBLIC_URL = 'https://unfcudigital.org';

function resolvePublicOrigin(req: express.Request): string {
  const explicitPreferred = (process.env.PREFERRED_PUBLIC_URL || '').trim().replace(/\/+$/, '');
  if (explicitPreferred) {
    return explicitPreferred;
  }
  const envUrl = (process.env.APP_URL || '').trim().replace(/\/+$/, '');
  if (
    envUrl &&
    envUrl !== 'MY_APP_URL' &&
    !envUrl.includes('ais-dev-') &&
    !envUrl.includes('ais-pre-') &&
    !envUrl.endsWith('.run.app')
  ) {
    return envUrl;
  }
  const host = (req.get('x-forwarded-host') || req.get('host') || '').trim();
  if (
    host &&
    !host.startsWith('localhost') &&
    !host.startsWith('127.0.0.1') &&
    !host.startsWith('0.0.0.0') &&
    !host.includes('ais-dev-') &&
    !host.includes('ais-pre-') &&
    !host.endsWith('.run.app')
  ) {
    const rawProto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0].trim();
    const proto = rawProto === 'http' && !host.includes('localhost') ? 'https' : rawProto;
    return `${proto}://${host}`;
  }
  return PREFERRED_PUBLIC_URL;
}

async function startServer() {
  // Initialize persistent database
  initDatabase();

  const app = express();
  app.set('trust proxy', 1);

  const server = http.createServer(app);
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Baseline production security & indexing protection headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    const reqPath = req.path.toLowerCase();
    if (reqPath.startsWith('/api/') || PRIVATE_ROBOTS_PATHS.has(reqPath)) {
      res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    }
    if (reqPath.startsWith('/api/')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    }
    if (
      reqPath === '/sw.js' ||
      reqPath === '/dev-sw.js' ||
      reqPath === '/manifest.webmanifest' ||
      reqPath === '/registerSW.js' ||
      reqPath === '/index.html'
    ) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    } else if (
      req.method === 'GET' &&
      !reqPath.startsWith('/assets/') &&
      !path.extname(reqPath) &&
      String(req.headers.accept || '').includes('text/html')
    ) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    }
    next();
  });

  // Dynamic robots.txt & sitemap.xml resolved to live deployment origin / custom domain
  app.get('/robots.txt', (req, res) => {
    const origin = resolvePublicOrigin(req);
    const body = [
      'User-agent: *',
      'Allow: /',
      'Allow: /credit-cards',
      'Allow: /financial-readiness',
      'Allow: /favicon.ico',
      'Allow: /favicon.png',
      'Allow: /apple-touch-icon.png',
      'Allow: /pwa-192x192.png',
      'Allow: /pwa-512x512.png',
      'Allow: /pwa-maskable-512x512.png',
      'Allow: /unfcu-logo.png',
      'Allow: /manifest.webmanifest',
      'Disallow: /api/',
      'Disallow: /admin',
      'Disallow: /admin-portal',
      'Disallow: /dashboard',
      'Disallow: /account-details',
      'Disallow: /transfers',
      'Disallow: /transfer',
      'Disallow: /withdrawal',
      'Disallow: /history',
      'Disallow: /notifications',
      'Disallow: /profile',
      'Disallow: /login',
      'Disallow: /register',
      'Disallow: /reset-password',
      'Disallow: /welcome',
      'Disallow: /digital-banking',
      '',
      `Sitemap: ${origin}/sitemap.xml`,
      '',
    ].join('\n');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(body);
  });

  app.get('/sitemap.xml', (req, res) => {
    const origin = resolvePublicOrigin(req);
    const today = new Date().toISOString().slice(0, 10);
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${origin}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${origin}/credit-cards</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${origin}/financial-readiness</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
`;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.send(xml);
  });

  // JSON Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // API Router
  app.use('/api', apiRouter);

  const isProduction = process.env.NODE_ENV === 'production';
  const distDir = path.resolve(__dirname, 'dist');
  const hasDist = fs.existsSync(path.join(distDir, 'index.html'));

  if (isProduction && hasDist) {
    console.log('🚀 Serving compiled production build from /dist (No Vite dev client or WebSockets)');
    app.use(express.static(distDir, {
      setHeaders: (res, filePath) => {
        if (
          filePath.endsWith('.html') ||
          filePath.endsWith('sw.js') ||
          filePath.endsWith('manifest.webmanifest') ||
          filePath.endsWith('registerSW.js')
        ) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        }
      },
    }));
    app.use(express.static(path.resolve(__dirname, 'public')));
    app.use('/assets', express.static(path.resolve(__dirname, 'public/assets')));
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    // Serve static assets from public and public/assets
    app.use(express.static(path.resolve(__dirname, 'public')));
    app.use('/assets', express.static(path.resolve(__dirname, 'public/assets')));

    // In dev, attach Vite middleware with HMR/WebSockets disabled for Cloud Run iframe stability
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });

    // Intercept /@vite/client so browser never attempts failing WebSocket connection in Cloud Run proxy
    app.get('/@vite/client', async (_req, res, next) => {
      try {
        const transformed = await vite.transformRequest('/@vite/client');
        if (transformed && transformed.code) {
          const noOpSocketCode =
            'class __ViteNoOpSocket { constructor() { this.OPEN = 1; this.readyState = 1; } addEventListener(e, f) { if (e === "open") setTimeout(() => f({}), 0); } removeEventListener() {} close() {} send() {} }\n' +
            transformed.code.replace(/new WebSocket\(/g, 'new __ViteNoOpSocket(');
          res.setHeader('Content-Type', 'application/javascript');
          res.setHeader('Cache-Control', 'no-cache');
          return res.send(noOpSocketCode);
        }
      } catch (err) {
        return next(err);
      }
      next();
    });

    app.use(vite.middlewares);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🏦 UNITED NATION GOLD CHASE BANK server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
