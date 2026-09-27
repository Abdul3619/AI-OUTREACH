import { test } from 'node:test';
import assert from 'node:assert/strict';
import { domainKey, normalizeUrl } from '../server/domain.ts';

test('domainKey treats www and bare hostnames as the same business', () => {
  assert.equal(domainKey('example.com'), 'example.com');
  assert.equal(domainKey('www.example.com'), 'example.com');
  assert.equal(domainKey('https://www.example.com/contact'), 'example.com');
  assert.equal(domainKey('http://example.com'), 'example.com');
});

test('normalizeUrl adds https:// when no scheme is given', () => {
  assert.equal(normalizeUrl('example.com'), 'https://example.com');
  assert.equal(normalizeUrl('http://example.com'), 'http://example.com');
});
