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

function createBackendConfigurationErrorMessage(operationLabel: string, responseStatus: number, responseContentType: string, responseText: string): string {
  const trimmedResponseText = responseText.trim();
  const looksLikeHtml = trimmedResponseText.startsWith('<!DOCTYPE') || trimmedResponseText.startsWith('<html');
  const detectedResponseType = looksLikeHtml ? 'HTML' : responseContentType || 'unknown content type';
  return `${operationLabel} backend/API configuration error: expected JSON but received ${detectedResponseType} (HTTP ${responseStatus}). Check the configured ROD helper endpoint.`;
}
