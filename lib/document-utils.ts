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
