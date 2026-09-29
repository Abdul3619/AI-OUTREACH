import { test } from 'node:test';
import assert from 'node:assert/strict';
import type http from 'node:http';
import { Auth, isPublicPath } from '../server/auth.ts';

const req = (cookie = '', ip = '1.2.3.4') =>
  ({ headers: { cookie, 'x-forwarded-for': ip }, socket: { remoteAddress: ip } }) as unknown as http.IncomingMessage;

const cookieValue = (setCookie: string) => setCookie.split(';')[0];

test('refuses to configure with a short or missing password', () => {
  assert.equal(new Auth({ password: 'short' }).configured, false);
  assert.equal(new Auth({}).configured, false);
  assert.equal(new Auth({ password: 'long-enough-password' }).configured, true);
});

test('accepts the right password and rejects others', () => {
  const auth = new Auth({ password: 'long-enough-password' });
  assert.equal(auth.checkPassword(req(), 'long-enough-password'), true);
  assert.equal(auth.checkPassword(req(), 'wrong'), false);
  assert.equal(auth.checkPassword(req(), undefined), false);
});

test('session cookie is accepted, tampering is rejected', () => {
  const auth = new Auth({ password: 'long-enough-password', sessionSecret: 'x'.repeat(32) });
  const cookie = cookieValue(auth.sessionCookie());
  assert.equal(auth.isAuthenticated(req(cookie)), true);
  assert.equal(auth.isAuthenticated(req(cookie + 'a')), false);
  assert.equal(auth.isAuthenticated(req('ao_session=123.abc.def')), false);
  assert.equal(auth.isAuthenticated(req('')), false);
  // A cookie signed with another secret is not accepted
  const other = new Auth({ password: 'long-enough-password', sessionSecret: 'y'.repeat(32) });
  assert.equal(other.isAuthenticated(req(cookie)), false);
});

test('cookie is Secure and HttpOnly by default', () => {
  const set = new Auth({ password: 'long-enough-password' }).sessionCookie();
  assert.match(set, /HttpOnly/);
  assert.match(set, /Secure/);
  assert.match(set, /SameSite=Strict/);
});

test('rate limits after five failures per address', () => {
  const auth = new Auth({ password: 'long-enough-password' });
  for (let i = 0; i < 5; i++) auth.checkPassword(req('', '5.5.5.5'), 'bad');
  assert.equal(auth.isRateLimited(req('', '5.5.5.5')), true);
  assert.equal(auth.isRateLimited(req('', '6.6.6.6')), false);
});

test('only the login page, its assets and health are public', () => {
  for (const p of ['/login', '/api/login', '/health', '/style.css']) assert.equal(isPublicPath(p), true, p);
  for (const p of ['/', '/index.html', '/app.js', '/api/leads', '/api/optouts']) assert.equal(isPublicPath(p), false, p);
});
