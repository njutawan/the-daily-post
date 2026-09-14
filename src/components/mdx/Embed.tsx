export function Embed({
  type,
  id,
  caption,
}: {
  type: "youtube" | "twitter";
  id: string;
  caption?: string;
}) {
  if (type === "youtube") {
    return (
      <figure className="my-8">
        <div className="relative aspect-video w-full overflow-hidden rounded-sm border border-stone-200 dark:border-stone-800">
          <iframe
            src={`https://www.youtube.com/embed/${id}`}
            title={caption || "Embedded video"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
        {caption && (
          <figcaption className="mt-2 border-l-2 border-stone-300 pl-3 font-sans text-xs text-stone-500 dark:border-stone-700">
            {caption}
          </figcaption>
        )}
      </figure>
    );
  }

  if (type === "twitter") {
    return (
      <figure className="my-8">
        <blockquote className="twitter-tweet" data-conversation="none">
          <a href={`https://twitter.com/i/web/status/${id}`}>View tweet</a>
        </blockquote>
        {caption && (
          <figcaption className="mt-2 border-l-2 border-stone-300 pl-3 font-sans text-xs text-stone-500 dark:border-stone-700">
            {caption}
          </figcaption>
        )}
      </figure>
    );
  }

  return null;
}

export default Embed;
