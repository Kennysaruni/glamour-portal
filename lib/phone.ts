/**
 * US Phone Number Formatting and Normalization Utilities
 * Standard format: (XXX) XXX-XXXX
 */

/**
 * Formats a phone string into standard US representation: (XXX) XXX-XXXX.
 * Supports partial inputs for interactive form inputs.
 */
export function formatPhoneNumber(value: string | null | undefined): string {
  if (!value) return "";

  // Strip all non-digits
  let digits = value.replace(/\D/g, "");

  // If starts with US country code '1' and has 11 digits, strip the leading 1
  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }

  // Cap at 10 digits (standard US area code + exchange + line)
  digits = digits.slice(0, 10);

  if (digits.length === 0) return "";
  if (digits.length <= 3) {
    return `(${digits}`;
  }
  if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/**
 * Normalizes a phone string for storage in the database.
 * If 10 valid digits are provided, returns `(XXX) XXX-XXXX`.
 * If empty or only whitespace, returns `null`.
 * If partial or non-standard, preserves formatted digits or returns null.
 */
export function normalizePhoneNumber(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  let digits = trimmed.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }

  if (digits.length === 0) return null;

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  // If someone entered a partial or different length, format what is available
  return formatPhoneNumber(digits);
}

/**
 * Validates whether an input represents a complete 10-digit US phone number.
 */
export function isValidUSPhoneNumber(value: string | null | undefined): boolean {
  if (!value) return false;
  let digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }
  return digits.length === 10;
}
