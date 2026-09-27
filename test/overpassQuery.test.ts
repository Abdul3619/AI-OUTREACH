import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildOverpassQuery } from '../server/overpass.ts';

const bbox = { south: 6.4, west: 3.1, north: 6.7, east: 3.5 };

test('maps a known category to real OSM tags and requires a website tag', () => {
  const q = buildOverpassQuery('plumbers', bbox);
  assert.ok(q.includes('"shop"="plumber"'));
  assert.ok(q.includes('"website"'));
  assert.ok(q.includes('6.4,3.1,6.7,3.5'));
});

test('falls back to a case-insensitive name search for an unknown category', () => {
  const q = buildOverpassQuery('artisanal soap makers', bbox);
  assert.ok(q.includes('"name"~"artisanal soap makers",i'));
  assert.ok(q.includes('"website"'));
});
