/**
 * Form validation utilities for consistent validation across the app
 */

export const validatePhone = (phone: string): boolean => {
  // Accept 10-digit Indian mobile numbers
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/\D/g, ''));
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): string | null => {
  if (password.length < 8) {
    return 'Password must be at least 8 characters';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain an uppercase letter';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain a lowercase letter';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain a number';
  }
  return null;
};

export const validateDateOfBirth = (dob: string): string | null => {
  const date = new Date(dob);
  const today = new Date();
  const age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    return 'Invalid date of birth';
  }
  
  if (age < 0 || age > 150) {
    return 'Please enter a valid age (0-150 years)';
  }
  
  if (date > today) {
    return 'Date of birth cannot be in the future';
  }
  
  return null;
};

export const validateMRN = (mrn: string): boolean => {
  return /^[A-Z0-9]{6,12}$/.test(mrn);
};

export const validateAadhar = (aadhar: string): boolean => {
  return /^[0-9]{12}$/.test(aadhar.replace(/\D/g, ''));
};

export const validatePincode = (pincode: string): boolean => {
  return /^[0-9]{6}$/.test(pincode.replace(/\D/g, ''));
};

export const getPhoneError = (phone: string): string | null => {
  if (!phone) return 'Phone number is required';
  if (!validatePhone(phone)) {
    return 'Please enter a valid 10-digit mobile number starting with 6-9';
  }
  return null;
};

export const getEmailError = (email: string): string | null => {
  if (!email) return 'Email is required';
  if (!validateEmail(email)) {
    return 'Please enter a valid email address';
  }
  return null;
};

export const getPasswordError = (password: string): string | null => {
  if (!password) return 'Password is required';
  return validatePassword(password);
};
