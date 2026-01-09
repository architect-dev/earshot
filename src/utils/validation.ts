/**
 * Validation utilities for user input
 */

/**
 * Validates username format
 * - Max 24 characters
 * - Alphanumeric and underscore only
 * - No spaces
 */
export function validateUsername(username: string): string | null {
  if (!username.trim()) {
    return 'Username is required';
  }

  if (username.length > 24) {
    return 'Username must be 24 characters or less';
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return 'Username can only contain letters, numbers, and underscores';
  }

  return null;
}

/**
 * Validates email format
 */
export function validateEmail(email: string): string | null {
  if (!email.trim()) {
    return 'Email is required';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }

  return null;
}

/**
 * Validates password strength
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 */
export function validatePassword(password: string): string | null {
  if (!password) {
    return 'Password is required';
  }

  if (password.length < 8) {
    return 'Password must be at least 8 characters';
  }

  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }

  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }

  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number';
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return 'Password must contain at least one special character';
  }

  return null;
}

/**
 * Validates full name
 * - Max 32 characters
 * - Not empty
 */
export function validateFullName(fullName: string): string | null {
  if (!fullName.trim()) {
    return 'Full name is required';
  }

  if (fullName.length > 32) {
    return 'Full name must be 32 characters or less';
  }

  return null;
}
