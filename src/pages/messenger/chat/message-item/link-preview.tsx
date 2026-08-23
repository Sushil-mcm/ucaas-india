import { useEffect, useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';

const LinkPreview = ({ url }: { url: string }) => {
  const [preview, setPreview] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const fallbackMeta = useMemo(() => {
    try {
      const urlObj = new URL(url);
      return {
        title: urlObj.hostname,
        description: '',
        image: '',
        url,
      };
    } catch {
      return { title: url, description: '', image: '', url };
    }
  }, [url]);

  useEffect(() => {
    let isMounted = true;

    const fetchLinkPreview = async () => {
      try {
        setIsLoading(true);

        const isTenorUrl = /tenor\.com\/(?:[a-z]{2}-[A-Z]{2}\/)?view\/.+/i.test(url);
        if (isTenorUrl) {
          const tenorCanonical = url.replace(
            /tenor\.com\/[a-z]{2}-[A-Z]{2}(\/view\/)/i,
            'tenor.com$1',
          );
          const response = await fetch(
            `https://tenor.com/oembed?url=${encodeURIComponent(tenorCanonical)}`,
          );
          if (response.ok) {
            const data = await response.json();
            if (isMounted && data?.thumbnail_url) {
              setPreview({
                title: data.title || data.author_name || fallbackMeta.title,
                description: '',
                image: data.thumbnail_url,
                url,
              });
              return;
            }
          }
        }

        if (isMounted) setPreview(fallbackMeta);
      } catch (error) {
        console.error('Link preview error:', error);
        if (isMounted) setPreview(fallbackMeta);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchLinkPreview();
    return () => {
      isMounted = false;
    };
  }, [url, fallbackMeta]);

  if (isLoading) {
    return (
      <div className="border rounded-lg p-3 bg-gray-50 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (!preview) return null;

  return (
    <button
      type="button"
      onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
      className="w-full text-left border rounded-lg overflow-hidden bg-white hover:bg-gray-50 transition-colors cursor-pointer group"
    >
      {preview.image && !imageError ? (
        <div className="relative w-full h-44 bg-gray-100">
          <img
            src={preview.image}
            alt={preview.title}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
            <ExternalLink className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      ) : null}
      <div className="p-3">
        <h4 className="font-semibold text-sm mb-1 line-clamp-2 group-hover:text-primary transition-colors">
          {preview.title}
        </h4>
        {preview.description ? (
          <p className="text-xs text-gray-600 line-clamp-2 mb-2">{preview.description}</p>
        ) : null}
        <p className="text-xs text-gray-400 truncate">{url}</p>
      </div>
    </button>
  );
};

export default LinkPreview;
