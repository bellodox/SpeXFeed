const http = require('http');

const RPC_HOST = '127.0.0.1';
const RPC_PORT = 11999;
const RPC_USERNAME = 'xuser1';
const RPC_PASSWORD = 'xpass1';
const RPC_PATH = '/';
const REQUEST_TIMEOUT_MS = 10000;

function createRpcError(message, code, details) {
  const error = new Error(message);
  error.code = code;
  if (details !== undefined) {
    error.details = details;
  }
  return error;
}

function callRodRpc(method, params = []) {
  return new Promise((resolve, reject) => {
    const rpcPayload = JSON.stringify({
      jsonrpc: '1.0',
      id: `${method}-${Date.now()}`,
      method,
      params,
    });

    const request = http.request(
      {
        host: RPC_HOST,
        port: RPC_PORT,
        path: RPC_PATH,
        method: 'POST',
        timeout: REQUEST_TIMEOUT_MS,
        headers: {
          Authorization: `Basic ${Buffer.from(`${RPC_USERNAME}:${RPC_PASSWORD}`).toString('base64')}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(rpcPayload),
        },
      },
      (response) => {
        let responseBody = '';

        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          responseBody += chunk;
        });

        response.on('end', () => {
          if (!responseBody) {
            reject(createRpcError('ROD RPC returned an empty response.', 'RPC_EMPTY_RESPONSE'));
            return;
          }

          let parsedResponse;

          try {
            parsedResponse = JSON.parse(responseBody);
          } catch {
            reject(createRpcError('ROD RPC returned invalid JSON.', 'RPC_INVALID_JSON'));
            return;
          }

          if (response.statusCode && response.statusCode >= 400) {
            reject(
              createRpcError(
                parsedResponse?.error?.message || `ROD RPC HTTP ${response.statusCode}.`,
                parsedResponse?.error?.code || 'RPC_HTTP_ERROR',
                parsedResponse?.error
              )
            );
            return;
          }

          if (parsedResponse?.error) {
            reject(createRpcError(parsedResponse.error.message || 'ROD RPC error.', parsedResponse.error.code, parsedResponse.error));
            return;
          }

          resolve(parsedResponse.result);
        });
      }
    );

    request.on('timeout', () => {
      request.destroy(createRpcError('ROD RPC request timed out.', 'RPC_TIMEOUT'));
    });

    request.on('error', (error) => {
      if (error && typeof error === 'object' && 'code' in error && String(error.code).startsWith('RPC_')) {
        reject(error);
        return;
      }

      reject(createRpcError(`Unable to reach ROD RPC: ${error.message}`, 'RPC_CONNECTION_ERROR'));
    });

    request.write(rpcPayload);
    request.end();
  });
}

module.exports = {
  callRodRpc,
  createRpcError,
};
