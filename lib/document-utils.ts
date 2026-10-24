/**
 * Helper utility to securely resolve attachment URLs.
 * Routes private S3 documents through the authenticated /api/documents endpoint
 * ensuring HIPAA compliance and eliminating S3 AccessDenied errors.
 */
export function getDocumentUrl(url?: string | null): string {
  if (!url) return "";

  // Already an authenticated proxy document URL
  if (url.startsWith("/api/documents")) {
    return url;
  }

  // AWS S3 bucket URL or absolute HTTP/HTTPS URL
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return `/api/documents?url=${encodeURIComponent(url)}`;
  }

  // Local /uploads/ or relative path
  if (url.startsWith("/uploads/")) {
    return `/api/documents?url=${encodeURIComponent(url)}`;
  }

  // Raw S3 key like summaries/...
  if (url.startsWith("summaries/")) {
    return `/api/documents?key=${encodeURIComponent(url)}`;
  }

  return url;
}

/**
 * Calculates current age in years given a date of birth string or Date object.
 */
export function calculateAge(dob?: string | Date | null): number | null {
  if (!dob) return null;
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}
