/**
 * Firebase error code to user-friendly message mapping
 */

export function getAuthErrorMessage(errorCode: string): string {
  switch (errorCode) {
    // Sign in errors
    case 'auth/invalid-email':
      return 'Please enter a valid email address';
    case 'auth/user-disabled':
      return 'This account has been disabled';
    case 'auth/user-not-found':
      return 'No account found with this email';
    case 'auth/wrong-password':
      return 'Incorrect password';
    case 'auth/invalid-credential':
      return 'Invalid email or password';

    // Sign up errors
    case 'auth/email-already-in-use':
      return 'An account with this email already exists';
    case 'auth/operation-not-allowed':
      return 'This operation is not allowed';
    case 'auth/weak-password':
      return 'Please choose a stronger password';

    // General errors
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later';
    case 'auth/requires-recent-login':
      return 'Please sign in again to continue';

    default:
      return 'An error occurred. Please try again';
  }
}

/**
 * Extract error code from Firebase error
 */
export function getFirebaseErrorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    return (error as { code: string }).code;
  }
  return 'unknown';
}

/**
 * Get a user-friendly error message from any error type.
 * - For Firebase errors (with code), uses the auth error mapping
 * - For regular Error objects, returns the error message
 * - For unknown types, returns a default message
 */
export function getErrorMessage(error: unknown, fallback = 'An error occurred. Please try again'): string {
  // Check for Firebase error with code
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: string }).code;
    // If it's an auth error, use the auth error mapping
    if (code.startsWith('auth/')) {
      return getAuthErrorMessage(code);
    }
    // For other Firebase errors, check for a message
    if ('message' in error && typeof (error as { message: unknown }).message === 'string') {
      return (error as { message: string }).message;
    }
    return fallback;
  }

  // Check for standard Error object
  if (error instanceof Error) {
    return error.message;
  }

  // Check for string
  if (typeof error === 'string') {
    return error;
  }

  return fallback;
}
