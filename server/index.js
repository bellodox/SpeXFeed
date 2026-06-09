require('dotenv').config();

// Start Angular development with: ng serve --proxy-config server/proxy.conf.json
const express = require('express');
const cors = require('cors');
const { callRodRpc } = require('./rod-rpc');

const app = express();
const PORT = process.env.SERVER_PORT || 3000;
const pendingRequests = new Map();
const recentNamesCache = new Map();
const relaySeedsCache = new Map();

const spexfeedNamespace = 'sf/';
const relaySeedsPrefix = `${spexfeedNamespace}relays-`;
const handlePattern = /^[a-z0-9]([a-z0-9-]{0,30}[a-z0-9])?$/;
const relayScopePattern = /^[a-z0-9-]{1,50}$/;
const lowercaseHexPublicKeyPattern = /^[0-9a-f]{64}$/;
const maxValueSizeBytes = 2048;
const pendingStatus = 'pending';
const confirmedStatus = 'verified';
const failedStatus = 'failed';
const recentNamesCacheTtlMs = 30_000;
const relaySeedsCacheTtlMs = 300_000;
const defaultRecentNamesLimit = 25;
const maxRecentNamesLimit = 100;
const maxRelaySeedEntries = 20;

app.use(
  cors({
    origin: 'http://localhost:4200',
  })
);
app.use(express.json({ limit: '16kb' }));

app.get('/api/rod/status', async (request, response) => {
  try {
    const [blockHeight, networkInfo] = await Promise.allSettled([
      callRodRpc('getblockcount'),
      callRodRpc('getnetworkinfo'),
    ]);

    if (blockHeight.status === 'rejected') {
      throw blockHeight.reason;
    }

    const network = networkInfo.status === 'fulfilled'
      ? inferNetworkName(networkInfo.value)
      : 'mainnet';

    response.json({
      connected: true,
      blockHeight: blockHeight.value,
      network,
    });
  } catch (error) {
    response.status(503).json({
      connected: false,
      error: 'rpc_unavailable',
      message: toPublicErrorMessage(error, 'ROD node is unavailable.'),
    });
  }
});

app.get('/api/rod/name/:namespace/:handle/availability', async (request, response) => {
  const rodName = `${decodeURIComponent(request.params.namespace || '')}/${decodeURIComponent(request.params.handle || '')}`;
  const validationErrors = validateRodName(rodName);

  if (validationErrors.length > 0) {
    response.status(400).json({
      error: 'invalid_name',
      message: validationErrors[0],
      details: validationErrors,
    });
    return;
  }

  try {
    const nameRecord = await callRodRpc('name_show', [rodName]);
    response.json({
      available: false,
      owner: nameRecord.txid || 'registered',
    });
  } catch (error) {
    if (isNameNotFoundError(error)) {
      response.json({ available: true });
      return;
    }

    response.status(500).json({
      error: 'rpc_error',
      message: toPublicErrorMessage(error, 'Failed to check name availability.'),
    });
  }
});

app.get('/api/rod/name/:namespace/:handle', async (request, response) => {
  const rodName = `${decodeURIComponent(request.params.namespace || '')}/${decodeURIComponent(request.params.handle || '')}`;

  try {
    const nameRecord = await callRodRpc('name_show', [rodName]);
    response.json({
      found: true,
      name: nameRecord.name,
      value: nameRecord.value ?? null,
      txid: nameRecord.txid,
      height: nameRecord.height,
      expires_in: nameRecord.expires_in,
    });
  } catch (error) {
    if (isNameNotFoundError(error)) {
      response.status(404).json({
        error: 'not_found',
        message: 'Name not registered',
      });
      return;
    }

    response.status(500).json({
      error: 'rpc_error',
      message: toPublicErrorMessage(error, 'Failed to look up name.'),
    });
  }
});

app.get('/api/rod/relay-seeds', async (request, response) => {
  await handleRelaySeedsLookup('global', response);
});

app.get('/api/rod/relay-seeds/:scope', async (request, response) => {
  const scope = decodeURIComponent(request.params.scope || '');
  await handleRelaySeedsLookup(scope, response);
});

app.post('/api/rod/relay-seeds/:scope', async (request, response) => {
  const scope = decodeURIComponent(request.params.scope || '');
  const validationErrors = validateRelaySeedWriteRequest(request.body, scope);

  if (validationErrors.length > 0) {
    response.status(400).json({
      status: 'invalid',
      errors: validationErrors,
    });
    return;
  }

  const normalizedRelays = request.body.relays
    .map(normalizeRelaySeedEntry)
    .filter(Boolean)
    .slice(0, maxRelaySeedEntries);
  const record = {
    type: 'sf.relays.v1',
    version: 1,
    updatedAt: Math.floor(Date.now() / 1000),
    scope,
    relays: normalizedRelays,
    sources: ['rod'],
  };
  const rodName = `${relaySeedsPrefix}${scope}`;
  const jsonValue = JSON.stringify(record);

  try {
    let operationStatus = 'registered';

    try {
      await callRodRpc('name_show', [rodName]);
      await callRodRpc('name_update', [rodName, jsonValue]);
      operationStatus = 'updated';
    } catch (error) {
      if (!isNameNotFoundError(error)) {
        throw error;
      }

      await callRodRpc('name_register', [rodName, jsonValue]);
    }

    clearCachedRelaySeeds(scope);
    response.json({
      status: operationStatus,
      scope,
      rodName,
      record,
    });
  } catch (error) {
    response.status(500).json({
      status: 'error',
      message: toPublicErrorMessage(error, 'Failed to write relay seeds.'),
    });
  }
});

app.post('/api/rod/spexfeed-name/requests', async (request, response) => {
  const validationErrors = validateSubmissionRequest(request.body);

  if (validationErrors.length > 0) {
    response.status(400).json({
      error: 'validation_error',
      message: validationErrors[0],
      details: validationErrors,
    });
    return;
  }

  const { action, rodName, value } = request.body;

  try {
    const rpcMethod = action === 'register' ? 'name_register' : 'name_update';
    const [rpcResult, blockHeight] = await Promise.all([
      callRodRpc(rpcMethod, [rodName, value]),
      callRodRpc('getblockcount'),
    ]);

    const txid = extractTransactionId(rpcResult);

    if (!txid) {
      throw new Error('ROD RPC did not return a transaction id.');
    }

    pendingRequests.set(txid, {
      id: txid,
      action,
      rodName,
      value,
      createdAt: Date.now(),
      status: pendingStatus,
      blockHeight,
      txid,
    });

    response.status(202).json({
      id: txid,
      requestId: txid,
      status: pendingStatus,
      txid,
      blockHeight,
    });
  } catch (error) {
    if (isNameAlreadyExistsError(error)) {
      response.status(409).json({
        error: 'name_exists',
        message: 'This SpeXFeed Name is already registered.',
      });
      return;
    }

    if (isWalletNotLoadedError(error)) {
      response.status(503).json({
        error: 'wallet_unavailable',
        message: 'ROD RPC wallet `spexfeed` is not loaded. Start the local node on localhost:11999, then run `createwallet spexfeed` once and `loadwallet spexfeed` before retrying.',
      });
      return;
    }

    if (isRpcUnavailableError(error)) {
      response.status(503).json({
        error: 'rpc_unavailable',
        message: 'ROD RPC is unavailable. Start the local node on localhost:11999, then create or load the `spexfeed` wallet before retrying.',
      });
      return;
    }

    response.status(500).json({
      error: 'rpc_error',
      message: toPublicErrorMessage(error, 'Failed to submit name request.'),
    });
  }
});

app.get('/api/rod/spexfeed-name/requests/:id', async (request, response) => {
  const requestId = decodeURIComponent(request.params.id || '');
  const trackedRequest = pendingRequests.get(requestId);

  if (!trackedRequest) {
    response.status(404).json({
      error: 'not_found',
      message: 'Request id not tracked.',
    });
    return;
  }

  try {
    const [blockHeight, transactionResult] = await Promise.all([
      callRodRpc('getblockcount'),
      callRodRpc('gettransaction', [trackedRequest.txid]),
    ]);

    const confirmations = Number.isInteger(transactionResult?.confirmations)
      ? transactionResult.confirmations
      : 0;

    const status = confirmations > 0 ? confirmedStatus : pendingStatus;
    trackedRequest.status = status;
    trackedRequest.blockHeight = blockHeight;
    trackedRequest.confirmations = confirmations;

    response.json({
      id: trackedRequest.id,
      requestId: trackedRequest.id,
      status,
      confirmations,
      blockHeight,
      txid: trackedRequest.txid,
      message: status === confirmedStatus ? 'Request confirmed.' : 'Request is pending confirmation.',
    });
  } catch (error) {
    trackedRequest.status = failedStatus;
    trackedRequest.lastError = toPublicErrorMessage(error, 'Failed to read request status.');

    response.status(500).json({
      id: trackedRequest.id,
      requestId: trackedRequest.id,
      status: failedStatus,
      message: trackedRequest.lastError,
    });
  }
});

app.get('/api/rod/names/recent', async (request, response) => {
  const requestedLimit = Number.parseInt(String(request.query.limit ?? defaultRecentNamesLimit), 10);
  const limit = Number.isNaN(requestedLimit)
    ? defaultRecentNamesLimit
    : Math.min(Math.max(requestedLimit, 1), maxRecentNamesLimit);

  const cacheKey = `recent:${limit}`;
  const cachedResponse = getCachedRecentNames(cacheKey);

  if (cachedResponse) {
    response.json(cachedResponse);
    return;
  }

  try {
    const rpcItems = await callRodRpc('name_scan', [spexfeedNamespace, maxRecentNamesLimit]);
    const items = Array.isArray(rpcItems)
      ? rpcItems
          .filter((item) => typeof item?.name === 'string' && item.name.startsWith(spexfeedNamespace))
          .map(toRecentNameItem)
          .filter(Boolean)
          .sort((leftItem, rightItem) => rightItem.height - leftItem.height)
          .slice(0, limit)
      : [];

    const payload = {
      items,
      total: items.length,
    };

    setCachedRecentNames(cacheKey, payload);
    response.json(payload);
  } catch (error) {
    response.status(500).json({
      error: 'rpc_error',
      message: toPublicErrorMessage(error, 'Failed to load recent SpeXFeed names.'),
    });
  }
});

app.use((request, response) => {
  response.status(404).json({
    error: 'not_found',
    message: 'Endpoint not found.',
  });
});

app.use((error, request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  response.status(500).json({
    error: 'internal_error',
    message: error instanceof Error ? error.message : 'Internal server error.',
  });
});

const server = app.listen(PORT, () => {
  console.log(`SpeXFeed ROD helper listening on http://localhost:${PORT}`);
});

server.on('error', (error) => {
  console.error(`SpeXFeed ROD helper failed: ${error.message}`);
});

function validateSubmissionRequest(body) {
  const errors = [];

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return ['Request body must be a JSON object.'];
  }

  const { action, rodName, handle, value, nostrPubkey } = body;

  if (action !== 'register' && action !== 'update') {
    errors.push('Action must be register or update.');
  }

  errors.push(...validateRodName(rodName));
  errors.push(...validateHandle(handle));
  errors.push(...validatePublicKey(nostrPubkey));
  errors.push(...validateValueJson(value));

  if (typeof rodName === 'string' && typeof handle === 'string') {
    const expectedRodName = `${spexfeedNamespace}${handle}`;
    if (rodName !== expectedRodName) {
      errors.push('rodName must match the canonical sf/<handle> form.');
    }
  }

  if (typeof value === 'string') {
    try {
      const parsedValue = JSON.parse(value);
      if (parsedValue?.n !== handle) {
        errors.push('Record handle must match the submitted handle.');
      }
      if (parsedValue?.p !== nostrPubkey) {
        errors.push('Record public key must match the submitted nostrPubkey.');
      }
    } catch {
      // Covered by validateValueJson.
    }
  }

  return deduplicateErrors(errors);
}

function validateRodName(rodName) {
  if (typeof rodName !== 'string') {
    return ['rodName must be a string.'];
  }

  if (!rodName.startsWith(spexfeedNamespace)) {
    return ['rodName must use the sf/ namespace.'];
  }

  return validateHandle(rodName.slice(spexfeedNamespace.length));
}

function validateHandle(handle) {
  if (typeof handle !== 'string') {
    return ['Handle must be a string.'];
  }

  if (!handlePattern.test(handle)) {
    return ['Handle must match ^[a-z0-9]([a-z0-9-]{0,30}[a-z0-9])?$'];
  }

  return [];
}

function validatePublicKey(nostrPubkey) {
  if (typeof nostrPubkey !== 'string') {
    return ['nostrPubkey must be a string.'];
  }

  if (!lowercaseHexPublicKeyPattern.test(nostrPubkey)) {
    return ['nostrPubkey must be 64 lowercase hex characters.'];
  }

  return [];
}

async function handleRelaySeedsLookup(scope, response) {
  const validationErrors = validateRelayScope(scope);

  if (validationErrors.length > 0) {
    response.status(400).json({
      status: 'invalid',
      scope,
      errors: validationErrors,
    });
    return;
  }

  const cachedResponse = getCachedRelaySeeds(scope);
  if (cachedResponse) {
    response.json(cachedResponse);
    return;
  }

  const rodName = `${relaySeedsPrefix}${scope}`;

  try {
    const nameRecord = await callRodRpc('name_show', [rodName]);
    const parsedValue = parseJsonObject(nameRecord?.value);
    const { record, errors } = validateRelaySeedRecord(parsedValue, scope);

    if (!record) {
      response.json({
        status: 'invalid',
        scope,
        errors,
      });
      return;
    }

    const payload = {
      status: 'found',
      scope,
      record,
    };

    setCachedRelaySeeds(scope, payload);
    response.json(payload);
  } catch (error) {
    if (isNameNotFoundError(error)) {
      response.json({
        status: 'not-found',
        scope,
      });
      return;
    }

    response.status(500).json({
      status: 'error',
      message: toPublicErrorMessage(error, 'Failed to load relay seeds.'),
    });
  }
}

function validateRelayScope(scope) {
  if (typeof scope !== 'string' || scope.length === 0) {
    return ['Scope must be a non-empty string.'];
  }

  if (!relayScopePattern.test(scope)) {
    return ['Scope must contain only lowercase letters, numbers, and hyphens, with a maximum length of 50 characters.'];
  }

  return [];
}

function validateRelaySeedWriteRequest(body, scope) {
  const errors = [...validateRelayScope(scope)];

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return ['Request body must be a JSON object.'];
  }

  if (!Array.isArray(body.relays)) {
    errors.push('relays must be an array.');
    return deduplicateErrors(errors);
  }

  if (body.relays.length === 0) {
    errors.push('relays must contain at least one relay.');
  }

  if (body.relays.length > maxRelaySeedEntries) {
    errors.push(`relays must contain no more than ${maxRelaySeedEntries} entries.`);
  }

  body.relays.forEach((relayItem, index) => {
    if (!relayItem || typeof relayItem !== 'object' || Array.isArray(relayItem)) {
      errors.push(`relays[${index}] must be an object.`);
      return;
    }

    if (!isValidRelayUrl(relayItem.url)) {
      errors.push(`relays[${index}].url must be a valid ws:// or wss:// URL.`);
    }
  });

  const normalizedRelays = body.relays
    .filter((relayItem) => relayItem && typeof relayItem === 'object' && !Array.isArray(relayItem))
    .map(normalizeRelaySeedEntry)
    .filter(Boolean)
    .slice(0, maxRelaySeedEntries);

  if (body.relays.length > 0 && normalizedRelays.length === 0) {
    errors.push('relays must include at least one valid ws:// or wss:// URL.');
  }

  const recordValue = JSON.stringify({
    type: 'sf.relays.v1',
    version: 1,
    updatedAt: Math.floor(Date.now() / 1000),
    scope,
    relays: normalizedRelays,
    sources: ['rod'],
  });

  errors.push(...validateValueJson(recordValue));

  return deduplicateErrors(errors);
}

function validateRelaySeedRecord(parsedValue, expectedScope) {
  if (!parsedValue) {
    return {
      record: null,
      errors: ['Record value must be a valid JSON object.'],
    };
  }

  const errors = [];

  if (parsedValue.type !== 'sf.relays.v1') {
    errors.push('Record type must be sf.relays.v1.');
  }

  if (!Number.isInteger(parsedValue.version) || parsedValue.version <= 0) {
    errors.push('Record version must be a positive integer.');
  }

  if (!Array.isArray(parsedValue.relays) || parsedValue.relays.length === 0) {
    errors.push('Record relays must be a non-empty array.');
  }

  const normalizedRelays = Array.isArray(parsedValue.relays)
    ? parsedValue.relays
        .filter((relayItem) => relayItem && typeof relayItem === 'object' && !Array.isArray(relayItem))
        .map(normalizeRelaySeedEntry)
        .filter(Boolean)
        .slice(0, maxRelaySeedEntries)
    : [];

  if (Array.isArray(parsedValue.relays) && normalizedRelays.length === 0) {
    errors.push('Record relays must include at least one valid ws:// or wss:// URL.');
  }

  if (errors.length > 0) {
    return {
      record: null,
      errors: deduplicateErrors(errors),
    };
  }

  return {
    record: {
      type: parsedValue.type,
      version: parsedValue.version,
      updatedAt: Number.isInteger(parsedValue.updatedAt) ? parsedValue.updatedAt : null,
      scope: typeof parsedValue.scope === 'string' ? parsedValue.scope : expectedScope,
      relays: normalizedRelays,
      sources: Array.isArray(parsedValue.sources)
        ? parsedValue.sources.filter((source) => typeof source === 'string')
        : [],
      signature: typeof parsedValue.signature === 'string' ? parsedValue.signature : null,
    },
    errors: [],
  };
}

function normalizeRelaySeedEntry(relayItem) {
  if (!isValidRelayUrl(relayItem.url)) {
    return null;
  }

  return {
    url: relayItem.url,
    role: typeof relayItem.role === 'string' ? relayItem.role : null,
    read: typeof relayItem.read === 'boolean' ? relayItem.read : false,
    write: typeof relayItem.write === 'boolean' ? relayItem.write : false,
    priority: Number.isFinite(relayItem.priority) ? relayItem.priority : null,
  };
}

function isValidRelayUrl(value) {
  if (typeof value !== 'string' || (!value.startsWith('wss://') && !value.startsWith('ws://'))) {
    return false;
  }

  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === 'wss:' || parsedUrl.protocol === 'ws:';
  } catch {
    return false;
  }
}

function validateValueJson(value) {
  if (typeof value !== 'string') {
    return ['value must be a JSON string.'];
  }

  const byteSize = Buffer.byteLength(value, 'utf8');
  if (byteSize > maxValueSizeBytes) {
    return [`value must be ${maxValueSizeBytes} bytes or smaller.`];
  }

  try {
    const parsedValue = JSON.parse(value);

    if (!parsedValue || typeof parsedValue !== 'object' || Array.isArray(parsedValue)) {
      return ['value must be a JSON object string.'];
    }
  } catch {
    return ['value must be valid JSON.'];
  }

  return [];
}

function extractTransactionId(rpcResult) {
  if (typeof rpcResult === 'string') {
    return rpcResult;
  }

  if (rpcResult && typeof rpcResult === 'object') {
    if (typeof rpcResult.txid === 'string') {
      return rpcResult.txid;
    }

    if (typeof rpcResult.hash === 'string') {
      return rpcResult.hash;
    }

    if (Array.isArray(rpcResult) && typeof rpcResult[0] === 'string') {
      return rpcResult[0];
    }
  }

  return null;
}

function inferNetworkName(networkInfo) {
  if (networkInfo && typeof networkInfo.subversion === 'string') {
    if (networkInfo.subversion.toLowerCase().includes('test')) {
      return 'testnet';
    }
  }

  return 'mainnet';
}

function getCachedRecentNames(cacheKey) {
  const cachedEntry = recentNamesCache.get(cacheKey);

  if (!cachedEntry) {
    return null;
  }

  if (cachedEntry.expiresAt <= Date.now()) {
    recentNamesCache.delete(cacheKey);
    return null;
  }

  return cachedEntry.payload;
}

function setCachedRecentNames(cacheKey, payload) {
  recentNamesCache.set(cacheKey, {
    payload,
    expiresAt: Date.now() + recentNamesCacheTtlMs,
  });
}

function getCachedRelaySeeds(scope) {
  const cachedEntry = relaySeedsCache.get(scope);

  if (!cachedEntry) {
    return null;
  }

  if (cachedEntry.expiresAt <= Date.now()) {
    relaySeedsCache.delete(scope);
    return null;
  }

  return cachedEntry.payload;
}

function setCachedRelaySeeds(scope, payload) {
  relaySeedsCache.set(scope, {
    payload,
    expiresAt: Date.now() + relaySeedsCacheTtlMs,
  });
}

function clearCachedRelaySeeds(scope) {
  relaySeedsCache.delete(scope);
}

function toRecentNameItem(nameRecord) {
  const parsedValue = parseJsonObject(nameRecord?.value);

  if (!parsedValue || parsedValue.t !== 'sf.profile') {
    return null;
  }

  const handle = nameRecord.name.slice(spexfeedNamespace.length);
  const blockHeight = Number.isInteger(nameRecord.height) ? nameRecord.height : Number(nameRecord.height) || 0;

  return {
    name: nameRecord.name,
    handle,
    height: blockHeight,
    txid: typeof nameRecord.txid === 'string' ? nameRecord.txid : null,
    pubkey: typeof parsedValue.p === 'string' ? parsedValue.p : null,
    displayName: typeof parsedValue.d === 'string' ? parsedValue.d : null,
    valid: true,
  };
}

function parseJsonObject(value) {
  if (typeof value !== 'string') {
    return null;
  }

  try {
    const parsedValue = JSON.parse(value);
    if (!parsedValue || typeof parsedValue !== 'object' || Array.isArray(parsedValue)) {
      return null;
    }

    return parsedValue;
  } catch {
    return null;
  }
}

function isNameNotFoundError(error) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes('name not found') || message.includes('not found') || Number(error.code) === -4;
}

function isNameAlreadyExistsError(error) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes('name exists already') || message.includes('already exists');
}

function isWalletNotLoadedError(error) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes('wallet') && (message.includes('not found') || message.includes('not loaded') || message.includes('does not exist'));
}

function isRpcUnavailableError(error) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes('connect') || message.includes('econnrefused') || message.includes('timeout') || message.includes('rpc server');
}

function toPublicErrorMessage(error, fallbackMessage) {
  if (!(error instanceof Error) || !error.message) {
    return fallbackMessage;
  }

  return error.message.replace(/xuser1|xpass1/gi, '[redacted]');
}

function deduplicateErrors(errors) {
  return [...new Set(errors.filter(Boolean))];
}
