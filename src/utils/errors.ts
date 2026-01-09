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
