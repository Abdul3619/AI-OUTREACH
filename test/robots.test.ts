import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRobotsTxt, isAllowed } from '../server/robots.ts';

test('disallows a path blocked for our user agent', () => {
  const rules = parseRobotsTxt('User-agent: *\nDisallow: /private/\n', 'AIOutreachBot/1.0');
  assert.equal(isAllowed(rules, '/private/page'), false);
  assert.equal(isAllowed(rules, '/public/page'), true);
});

test('an explicit Allow overrides a shorter Disallow (longest match wins)', () => {
  const rules = parseRobotsTxt('User-agent: *\nDisallow: /\nAllow: /public/\n', 'AIOutreachBot/1.0');
  assert.equal(isAllowed(rules, '/public/page'), true);
  assert.equal(isAllowed(rules, '/private/page'), false);
});

test('reads a Crawl-delay directive', () => {
  const rules = parseRobotsTxt('User-agent: *\nCrawl-delay: 2\n', 'AIOutreachBot/1.0');
  assert.equal(rules.crawlDelaySeconds, 2);
});

test('with no robots.txt content, everything is allowed', () => {
  const rules = parseRobotsTxt('', 'AIOutreachBot/1.0');
  assert.equal(isAllowed(rules, '/anything'), true);
});
