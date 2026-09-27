// A tiny router + static file server built on node:http. No Express — this
// app has a handful of JSON endpoints and one static frontend, which does
// not need a framework, and skipping it means the whole server runs on
// zero npm dependencies (only @google/genai, used solely for drafting).

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type Handler = (req: http.IncomingMessage, res: http.ServerResponse, params: Record<string, string>, body: any) => void | Promise<void>;

interface Route {
  method: string;
  pattern: RegExp;
  paramNames: string[];
  handler: Handler;
}

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

export class App {
  private routes: Route[] = [];
  private staticDir: string | null = null;

  route(method: string, path: string, handler: Handler) {
    const paramNames: string[] = [];
    const patternStr = path
      .split('/')
      .map((segment) => {
        if (segment.startsWith(':')) {
          paramNames.push(segment.slice(1));
          return '([^/]+)';
        }
        return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      })
      .join('/');
    this.routes.push({ method, pattern: new RegExp(`^${patternStr}/?$`), paramNames, handler });
  }

  get(path: string, handler: Handler) {
    this.route('GET', path, handler);
  }
  post(path: string, handler: Handler) {
    this.route('POST', path, handler);
  }
  patch(path: string, handler: Handler) {
    this.route('PATCH', path, handler);
  }
  delete(path: string, handler: Handler) {
    this.route('DELETE', path, handler);
  }

  serveStatic(dir: string) {
    this.staticDir = dir;
  }

  private async readBody(req: http.IncomingMessage): Promise<any> {
    if (req.method === 'GET' || req.method === 'DELETE') return undefined;
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const raw = Buffer.concat(chunks).toString('utf8');
    if (!raw) return undefined;
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('application/json')) {
      try {
        return JSON.parse(raw);
      } catch {
        return undefined;
      }
    }
    return raw; // text/plain (used for CSV upload)
  }

  private async tryStatic(urlPath: string, res: http.ServerResponse): Promise<boolean> {
    if (!this.staticDir) return false;
    const safePath = path.normalize(urlPath === '/' ? '/index.html' : urlPath).replace(/^(\.\.[/\\])+/, '');
    const filePath = path.join(this.staticDir, safePath);
    if (!filePath.startsWith(this.staticDir)) return false;
    try {
      const data = await fs.promises.readFile(filePath);
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': CONTENT_TYPES[ext] || 'application/octet-stream' });
      res.end(data);
      return true;
    } catch {
      return false;
    }
  }

  listen(port: number, cb?: () => void) {
    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url || '/', 'http://localhost');
        const method = req.method || 'GET';

        for (const route of this.routes) {
          if (route.method !== method) continue;
          const match = route.pattern.exec(url.pathname);
          if (!match) continue;
          const params: Record<string, string> = {};
          route.paramNames.forEach((name, i) => (params[name] = decodeURIComponent(match[i + 1])));
          const body = await this.readBody(req);
          (req as any).query = Object.fromEntries(url.searchParams.entries());
          await route.handler(req, res, params, body);
          return;
        }

        if (method === 'GET' && (await this.tryStatic(url.pathname, res))) return;

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      } catch (e: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message || 'Internal server error' }));
      }
    });
    server.listen(port, cb);
    return server;
  }
}

export function json(res: http.ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

export function dirnameOf(importMetaUrl: string): string {
  return path.dirname(fileURLToPath(importMetaUrl));
}
