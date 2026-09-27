import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkUrlIsSafeToFetch, isPrivateIp } from '../server/security.ts';

test('isPrivateIp flags all private/loopback/link-local IPv4 ranges', () => {
  assert.equal(isPrivateIp('127.0.0.1'), true);
  assert.equal(isPrivateIp('10.0.0.5'), true);
  assert.equal(isPrivateIp('172.16.0.1'), true);
  assert.equal(isPrivateIp('172.31.255.255'), true);
  assert.equal(isPrivateIp('192.168.1.1'), true);
  assert.equal(isPrivateIp('169.254.1.1'), true);
  assert.equal(isPrivateIp('0.0.0.0'), true);
  assert.equal(isPrivateIp('100.64.0.1'), true);
});

test('isPrivateIp allows ordinary public IPv4 addresses', () => {
  assert.equal(isPrivateIp('8.8.8.8'), false);
  assert.equal(isPrivateIp('93.184.216.34'), false);
});

test('isPrivateIp flags IPv6 loopback and unique-local ranges', () => {
  assert.equal(isPrivateIp('::1'), true);
  assert.equal(isPrivateIp('fc00::1'), true);
  assert.equal(isPrivateIp('fe80::1'), true);
});

test('checkUrlIsSafeToFetch rejects localhost by hostname without needing DNS', async () => {
  const result = await checkUrlIsSafeToFetch('http://localhost:3000/');
  assert.equal(result.safe, false);
});

test('checkUrlIsSafeToFetch rejects a literal private IP immediately', async () => {
  const result = await checkUrlIsSafeToFetch('http://127.0.0.1:8080/');
  assert.equal(result.safe, false);
  const result2 = await checkUrlIsSafeToFetch('http://192.168.1.50/');
  assert.equal(result2.safe, false);
});

test('checkUrlIsSafeToFetch allows a literal public IP', async () => {
  const result = await checkUrlIsSafeToFetch('http://8.8.8.8/');
  assert.equal(result.safe, true);
});

test('checkUrlIsSafeToFetch rejects non-http(s) protocols', async () => {
  const result = await checkUrlIsSafeToFetch('file:///etc/passwd');
  assert.equal(result.safe, false);
});
