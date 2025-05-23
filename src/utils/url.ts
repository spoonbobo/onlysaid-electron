/**
 * Extracts URLs from text content
 * @param content - The content to search for URLs
 * @returns Array of unique URLs found
 */
export const extractUrls = (content: string | Record<string, any> | null | undefined): string[] => {
  if (!content) return [];

  let textContent = '';

  // Convert content to string if it's an object
  if (typeof content === 'object') {
    textContent = JSON.stringify(content, null, 2);
  } else {
    textContent = String(content);
  }

  // URL regex pattern that matches http/https URLs
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
  const matches = textContent.match(urlRegex);

  if (!matches) return [];

  // Remove duplicates and clean URLs
  const uniqueUrls = [...new Set(matches)]
    .map(url => url.trim())
    .filter(url => url.length > 0);

  return uniqueUrls;
};

/**
 * Formats a URL for display by truncating if too long
 * @param url - The URL to format
 * @param maxLength - Maximum length before truncation
 * @returns Formatted URL string
 */
export const formatUrlForDisplay = (url: string, maxLength: number = 50): string => {
  if (url.length <= maxLength) return url;

  const start = url.substring(0, Math.floor(maxLength * 0.6));
  const end = url.substring(url.length - Math.floor(maxLength * 0.3));

  return `${start}...${end}`;
};

/**
 * Extracts domain from URL for display
 * @param url - The URL to extract domain from
 * @returns Domain string or original URL if parsing fails
 */
export const extractDomain = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
};