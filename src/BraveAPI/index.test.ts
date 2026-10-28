import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import config from '../config.js';
import API from './index.js';

const extraWithHeaders = (headers: Record<string, string>) => ({ requestInfo: { headers } });

describe('getApiKey', () => {
  const originalApiKey = config.braveApiKey;
  const originalAllowClientKeys = config.allowClientKeys;

  beforeEach(() => {
    config.braveApiKey = 'server-key';
    config.allowClientKeys = true;
  });

  afterEach(() => {
    config.braveApiKey = originalApiKey;
    config.allowClientKeys = originalAllowClientKeys;
  });

  it('ignores client keys unless --allow-client-keys is set', () => {
    config.allowClientKeys = false;

    const extra = extraWithHeaders({
      'x-subscription-token': 'token-key',
      authorization: 'Bearer bearer-key',
    });
    assert.equal(API.getApiKey(extra), 'server-key');
  });

  it('reads X-Subscription-Token', () => {
    assert.equal(
      API.getApiKey(extraWithHeaders({ 'x-subscription-token': ' token-key ' })),
      'token-key'
    );
  });

  it('reads Authorization: Bearer, ignoring other schemes', () => {
    const withAuth = (authorization: string) => API.getApiKey(extraWithHeaders({ authorization }));

    assert.equal(withAuth('bearer  bearer-key '), 'bearer-key');
    assert.equal(withAuth('Basic dXNlcjpwYXNz'), 'server-key');
  });

  it('prefers X-Subscription-Token over Authorization: Bearer', () => {
    const extra = extraWithHeaders({
      'x-subscription-token': 'token-key',
      authorization: 'Bearer bearer-key',
    });
    assert.equal(API.getApiKey(extra), 'token-key');
  });

  it('falls back to the server key when the client sends none', () => {
    assert.equal(API.getApiKey(), 'server-key');
    assert.equal(API.getApiKey(extraWithHeaders({ 'x-subscription-token': '  ' })), 'server-key');
  });
});
