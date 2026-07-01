const API_BASE = 'http://localhost:5000/api';

export interface ApiRequestInit extends Omit<RequestInit, 'body'> {
  body?: any; // Allow object literals for body, which will be stringified
}

/**
 * Custom fetch wrapper that includes credentials (httpOnly cookie)
 * and formats request/response bodies as JSON.
 */
export async function apiFetch<T = any>(endpoint: string, options: ApiRequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  options.credentials = 'include';
  
  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    options.body = JSON.stringify(options.body);
    options.headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
  }

  // Cast options to RequestInit for native fetch compatibility
  const response = await fetch(url, options as RequestInit);

  if (!response.ok) {
    let errorMessage = 'An error occurred during the request.';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch (_) {}
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return null as any;
  }

  return response.json();
}
