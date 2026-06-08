// Start Angular development with: ng serve --proxy-config server/proxy.conf.json
const express = require('express');
const cors = require('cors');
const { callRodRpc } = require('./rod-rpc');

const app = express();
const port = 3000;
const pendingRequests = new Map();

const spexfeedNamespace = 'sf/';
const handlePattern = /^[a-z0-9]([a-z0-9-]{0,30}[a-z0-9])?$/;
const lowercaseHexPublicKeyPattern = /^[0-9a-f]{64}$/;
const maxValueSizeBytes = 2048;
const pendingStatus = 'pending';
const confirmedStatus = 'verified';
const failedStatus = 'failed';

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

const server = app.listen(port, () => {
  console.log(`SpeXFeed ROD helper listening on http://localhost:${port}`);
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

function toPublicErrorMessage(error, fallbackMessage) {
  if (!(error instanceof Error) || !error.message) {
    return fallbackMessage;
  }

  return error.message.replace(/xuser1|xpass1/gi, '[redacted]');
}

function deduplicateErrors(errors) {
  return [...new Set(errors.filter(Boolean))];
}
