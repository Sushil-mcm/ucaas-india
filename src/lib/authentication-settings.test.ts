import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import {
  invalidDomains,
  isAllowedEmail,
  isIdleMinutesValid,
  normaliseDomains,
  readAuthSettings,
  scimTokenFor,
  sha256Hex,
  generateScimSecret,
  withAuthSettings,
} from './authentication-settings';

test('reads the security section whatever shape it is in', () => {
  const a = readAuthSettings('{"idle_timeout":{"enabled":true,"seconds":1800},"sso":{"enabled":true},"allowed_domains":["MCMBPO.com"," @example.com "],"provisioning":{"scim":{"enabled":true,"token_hash":"ab","token_hint":"8f2a"}}}');
  assert.equal(a.idleEnabled, true); assert.equal(a.idleSeconds, 1800); assert.equal(a.ssoEnabled, true);
  assert.deepEqual(a.allowedDomains, ['mcmbpo.com', 'example.com']); assert.equal(a.scimEnabled, true); assert.equal(a.scimTokenHint, '8f2a');
  const b = readAuthSettings(null);
  assert.equal(b.idleEnabled, false); assert.equal(b.idleSeconds, null); assert.deepEqual(b.allowedDomains, []); assert.equal(b.scimEnabled, false);
  assert.equal(readAuthSettings({ provisioning: { scim: { enabled: true } } }).scimEnabled, false, 'enabled without a hash is not enabled');
});

test('domains are normalised and checked', () => {
  assert.deepEqual(normaliseDomains('Example.com, @other.org other.org\nbad domain not-a-domain'), ['example.com', 'other.org']);
  assert.deepEqual(invalidDomains('example.com, bad_domain, x'), ['bad_domain', 'x']);
  assert.equal(isAllowedEmail('a@Example.com', ['example.com']), true);
  assert.equal(isAllowedEmail('a@else.com', ['example.com']), false);
  assert.equal(isAllowedEmail('nobody', ['example.com']), false);
  assert.equal(isAllowedEmail('a@else.com', []), true, 'no list means no rule');
});

test('merge keeps what Security wrote and only changes what was asked', () => {
  const existing = { version: 1, mfa: { required: true }, idle_timeout: { enabled: true, seconds: 900 }, sso: { enabled: false }, ip_allowlist: { allow: { enabled: false, entries: [] } } };
  const next = withAuthSettings(existing, { allowedDomains: ['x.com'], scim: { enabled: true, token_hash: 'h', token_hint: 'abcd', created_at: 't' } });
  assert.deepEqual(next.mfa, { required: true }); assert.deepEqual(next.idle_timeout, { enabled: true, seconds: 900 }); assert.deepEqual(next.allowed_domains, ['x.com']);
  assert.equal(next.provisioning.scim.token_hash, 'h');
  const idle = withAuthSettings(next, { idleEnabled: true, idleMinutes: 45 });
  assert.deepEqual(idle.idle_timeout, { enabled: true, seconds: 2700 }); assert.equal(idle.provisioning.scim.token_hash, 'h', 'untouched keys survive');
  const off = withAuthSettings(idle, { scim: null });
  assert.deepEqual(off.provisioning.scim, { enabled: false });
  assert.deepEqual(withAuthSettings(idle, { idleEnabled: false }).idle_timeout, { enabled: false, seconds: null });
});

test('tokens: 32 url-safe characters, hashed the way the gateway hashes', async () => {
  const secret = generateScimSecret(webcrypto as unknown as Crypto);
  assert.match(secret, /^[A-Za-z0-9_-]{32}$/);
  assert.equal(scimTokenFor('D3E6C538-8A0C-4AFD-A17B-579C279AE5F2', secret), `d3e6c538-8a0c-4afd-a17b-579c279ae5f2.${secret}`);
  assert.equal(await sha256Hex('abc', webcrypto as unknown as Crypto), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('idle minutes range', () => {
  assert.equal(isIdleMinutesValid('30'), true); assert.equal(isIdleMinutesValid(4), false); assert.equal(isIdleMinutesValid(1441), false); assert.equal(isIdleMinutesValid('x'), false);
});
