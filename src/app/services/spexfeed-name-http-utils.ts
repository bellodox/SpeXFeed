/** Reads and validates a JSON response body, guarding against non-JSON backend replies (e.g. HTML fallback pages). */
export async function readJsonResponse<T>(response: Response, operationLabel: string): Promise<T> {
  const responseContentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  const responseText = await response.text();

  if (!responseContentType.includes('application/json')) {
    throw new Error(createBackendConfigurationErrorMessage(operationLabel, response.status, responseContentType, responseText));
  }

  try {
    return JSON.parse(responseText) as T;
  } catch {
    throw new Error(createBackendConfigurationErrorMessage(operationLabel, response.status, responseContentType, responseText));
  }
}

/** Reads a backend error response and prefers a JSON `message` field when available. */
export async function readErrorResponseMessage(response: Response, fallbackMessage: string): Promise<string> {
  const responseContentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  const responseText = await response.text();

  if (responseContentType.includes('application/json')) {
    try {
      const parsedResponse = JSON.parse(responseText) as { message?: unknown };

      if (typeof parsedResponse?.message === 'string' && parsedResponse.message.trim()) {
        return parsedResponse.message.trim();
      }
    } catch {
      // Fall through to the raw-text and fallback handling below.
    }
  }

  const trimmedResponseText = responseText.trim();
  return trimmedResponseText || fallbackMessage;
}

function createBackendConfigurationErrorMessage(operationLabel: string, responseStatus: number, responseContentType: string, responseText: string): string {
  const trimmedResponseText = responseText.trim();
  const looksLikeHtml = trimmedResponseText.startsWith('<!DOCTYPE') || trimmedResponseText.startsWith('<html');
  const detectedResponseType = looksLikeHtml ? 'HTML' : responseContentType || 'unknown content type';
  return `${operationLabel} backend/API configuration error: expected JSON but received ${detectedResponseType} (HTTP ${responseStatus}). Check the configured ROD helper endpoint.`;
}
