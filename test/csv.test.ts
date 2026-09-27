import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv } from '../server/csv.ts';

test('parses a CSV with header row', () => {
  const { rows, skipped } = parseCsv('website,name,city\nexample.com,Example Co,Lagos\nfoo.com,Foo Ltd,Accra\n');
  assert.equal(rows.length, 2);
  assert.equal(rows[0].website, 'example.com');
  assert.equal(rows[0].businessName, 'Example Co');
  assert.equal(rows[0].city, 'Lagos');
  assert.equal(skipped, 0);
});

test('accepts "url" as an alias for "website"', () => {
  const { rows } = parseCsv('url,name\nexample.com,Example\n');
  assert.equal(rows[0].website, 'example.com');
});

test('falls back to treating each line as a bare URL when there is no recognizable header', () => {
  const { rows } = parseCsv('example.com\nfoo.com\n');
  assert.equal(rows.length, 2);
  assert.equal(rows[0].website, 'example.com');
});

test('skips rows missing a website', () => {
  const { rows, skipped } = parseCsv('website,name\n,No Site\nexample.com,Has Site\n');
  assert.equal(rows.length, 1);
  assert.equal(skipped, 1);
});
