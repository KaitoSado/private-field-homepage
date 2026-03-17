import { sanitizeMediaUrl } from "@/lib/url";

export function PostMediaGallery({ mediaItems = [], coverImageUrl = "", title = "" }) {
  const cover = sanitizeMediaUrl(coverImageUrl);
  const items = Array.isArray(mediaItems) ? mediaItems : [];
  const normalized = items
    .map((item) => ({
      kind: item?.kind === "video" ? "video" : "image",
      url: sanitizeMediaUrl(item?.url),
      alt: `${item?.alt || title || "post media"}`.trim()
    }))
    .filter((item) => item.url);

  if (!normalized.length && !cover) {
    return null;
  }

  const galleryItems = normalized.length ? normalized : [{ kind: "image", url: cover, alt: title || "cover image" }];

  return (
    <div className={`media-gallery ${galleryItems.length > 1 ? "has-grid" : ""}`}>
      {galleryItems.map((item, index) =>
        item.kind === "video" ? (
          <video key={`${item.url}-${index}`} src={item.url} controls playsInline className="media-tile" />
        ) : (
          <img key={`${item.url}-${index}`} src={item.url} alt={item.alt} className="media-tile" />
        )
      )}
    </div>
  );
}
