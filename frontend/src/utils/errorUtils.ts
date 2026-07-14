/**
 * Formats error objects into user-friendly messages.
 * Catches generic browser network failures (e.g. Chrome's "Failed to fetch",
 * Safari's "Load failed", Firefox's "NetworkError") and translates them
 * into actionable instructions for the user.
 */
export const cleanErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) {
    const msg = error.message.trim();
    const isNetworkError = 
      /fail(ed)? to fetch/i.test(msg) ||
      /load failed/i.test(msg) ||
      /networkerror/i.test(msg) ||
      /network error/i.test(msg) ||
      /failed to connect/i.test(msg) ||
      /unreachable/i.test(msg) ||
      msg === 'TypeError: Load failed' ||
      msg === 'TypeError: Failed to fetch';
      
    if (isNetworkError) {
      return 'Connection refused: The backend server is unreachable. Please verify that the backend is running and your internet connection is active.';
    }
    return msg;
  }
  
  if (typeof error === 'string') {
    const isNetworkStr = 
      /fail(ed)? to fetch/i.test(error) ||
      /load failed/i.test(error) ||
      /networkerror/i.test(error) ||
      /network error/i.test(error) ||
      /failed to connect/i.test(error) ||
      /unreachable/i.test(error);
      
    if (isNetworkStr) {
      return 'Connection refused: The backend server is unreachable. Please verify that the backend is running and your internet connection is active.';
    }
    return error;
  }
  
  return fallback;
};
