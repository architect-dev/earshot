/**
 * Firebase error code to user-friendly message mapping
 * Using lorem ipsum placeholders as per requirements
 */

export function getAuthErrorMessage(errorCode: string): string {
  switch (errorCode) {
    // Sign in errors
    case 'auth/invalid-email':
      return 'Lorem ipsum invalid email';
    case 'auth/user-disabled':
      return 'Lorem ipsum disabled';
    case 'auth/user-not-found':
      return 'Lorem ipsum not found';
    case 'auth/wrong-password':
      return 'Lorem ipsum wrong password';
    case 'auth/invalid-credential':
      return 'Lorem ipsum invalid credentials';

    // Sign up errors
    case 'auth/email-already-in-use':
      return 'Lorem ipsum already exists';
    case 'auth/operation-not-allowed':
      return 'Lorem ipsum not allowed';
    case 'auth/weak-password':
      return 'Lorem ipsum weak password';

    // General errors
    case 'auth/network-request-failed':
      return 'Lorem ipsum network error';
    case 'auth/too-many-requests':
      return 'Lorem ipsum too many requests';
    case 'auth/requires-recent-login':
      return 'Lorem ipsum re-login required';

    default:
      return 'Lorem ipsum error';
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
