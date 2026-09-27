import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractSignals } from '../server/htmlExtract.ts';
import { _internal } from '../server/htmlExtract.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const messyHtml = fs.readFileSync(path.join(here, 'fixtures', 'messy-plumber-site.html'), 'utf8');
const goodHtml = fs.readFileSync(path.join(here, 'fixtures', 'good-site.html'), 'utf8');

test('fixes the glued-email bug: extracts a clean email, not "...comcopyright"', () => {
  const evidence = extractSignals(messyHtml, 'http://example.test/');
  assert.equal(evidence.emails.length, 1);
  assert.equal(evidence.emails[0], 'info@joesplumbing-test.com');
  assert.ok(!evidence.emails[0].includes('copyright'));
});

test('trimToPlausibleTld recovers a known TLD from a glued tail', () => {
  assert.equal(_internal.trimToPlausibleTld('info@joesplumbing-test.comcopyright'), 'info@joesplumbing-test.com');
  assert.equal(_internal.trimToPlausibleTld('foo@bar.com'), 'foo@bar.com');
  assert.equal(_internal.trimToPlausibleTld('not-an-email'), null);
});

test('detects missing meta description, missing viewport, missing alt text, and CMS on a messy site', () => {
  const evidence = extractSignals(messyHtml, 'http://example.test/');
  assert.equal(evidence.metaDescription, '');
  assert.equal(evidence.hasViewportMeta, false);
  assert.equal(evidence.imagesMissingAlt, 1);
  assert.equal(evidence.cms, 'WordPress');
  assert.ok(evidence.issues.some((i) => i.includes('viewport')));
  assert.ok(evidence.issues.some((i) => i.includes('meta description')));
  assert.ok(evidence.issues.some((i) => i.includes('alt text')));
});

test('a well-built site reports far fewer issues and picks up the mailto email cleanly', () => {
  const evidence = extractSignals(goodHtml, 'https://acmebakery-test.com/');
  assert.equal(evidence.emails[0], 'hello@acmebakery-test.com');
  assert.equal(evidence.hasViewportMeta, true);
  assert.ok(evidence.metaDescription.length > 50);
  assert.equal(evidence.imagesMissingAlt, 0);
  assert.equal(evidence.socialLinks.facebook, 'https://facebook.com/acmebakery');
  assert.ok(evidence.issues.length < 3);
});
