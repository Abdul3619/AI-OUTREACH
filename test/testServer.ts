// A tiny local HTTP server used only by tests, so the crawler can be
// exercised against real HTTP traffic without needing the public internet
// (which this sandbox does not have access to). Routes are registered by
// each test file as needed.

import http from 'node:http';
import fs from 'node:fs';

export interface TestServerHandle {
  url: string;
  close: () => Promise<void>;
}

export type RouteMap = Record<string, { file?: string; text?: string; status?: number; contentType?: string }>;

export function startFixtureServer(routes: RouteMap): Promise<TestServerHandle> {
  const server = http.createServer((req, res) => {
    const route = routes[req.url || '/'];
    if (!route) {
      res.writeHead(404).end('not found');
      return;
    }
    const body = route.file ? fs.readFileSync(route.file, 'utf8') : route.text || '';
    res.writeHead(route.status || 200, { 'Content-Type': route.contentType || 'text/html' });
    res.end(body);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}
