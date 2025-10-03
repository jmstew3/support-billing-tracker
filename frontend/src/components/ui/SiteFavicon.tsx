import { useState } from 'react';
import { Globe } from 'lucide-react';

interface SiteFaviconProps {
  websiteUrl: string | null;
  size?: number;
}

/**
 * SiteFavicon Component
 *
 * Displays a website's favicon using Google's favicon service.
 * Falls back to a globe icon if URL is missing or image fails to load.
 */
export function SiteFavicon({ websiteUrl, size = 16 }: SiteFaviconProps) {
  const [imageError, setImageError] = useState(false);

  // Extract domain from URL
  const getDomain = (url: string): string => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return '';
    }
  };

  // If no URL or image failed to load, show fallback globe icon
  if (!websiteUrl || imageError) {
    return (
      <Globe
        className="text-muted-foreground flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }

  const domain = getDomain(websiteUrl);

  if (!domain) {
    return (
      <Globe
        className="text-muted-foreground flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }

  // Use Google's favicon service (doubled size for better quality on retina displays)
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=${size * 2}`;

  return (
    <img
      src={faviconUrl}
      alt={`${domain} icon`}
      className="flex-shrink-0 border border-border/30"
      style={{
        width: size,
        height: size,
        borderRadius: '2px',
      }}
      onError={() => setImageError(true)}
    />
  );
}
