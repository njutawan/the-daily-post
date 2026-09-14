export function PullQuote({
  children,
  author,
}: {
  children: React.ReactNode;
  author?: string;
}) {
  return (
    <blockquote className="my-8 border-y-2 border-black py-6 text-center dark:border-white">
      <div className="font-headline text-2xl font-bold italic leading-snug text-black sm:text-3xl dark:text-white">
        {children}
      </div>
      {author && (
        <footer className="mt-3 font-sans text-xs font-bold uppercase tracking-wider text-stone-500">
          — {author}
        </footer>
      )}
    </blockquote>
  );
}

export default PullQuote;
