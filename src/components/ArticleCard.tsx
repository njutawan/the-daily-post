import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Clock, MessageSquare, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Article } from "@/data/articles";

type ArticleCardProps = {
  article: Article;
  layout?: "hero" | "standard" | "compact" | "opinion";
  className?: string;
  showImage?: boolean;
  showSummary?: boolean;
  showByline?: boolean;
  index?: number;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
}

export function ArticleCard({
  article,
  layout = "standard",
  className,
  showImage = true,
  showSummary = true,
  showByline = true,
  index,
}: ArticleCardProps) {
  const href = `/article/${article.slug}`;

  if (layout === "hero") {
    return (
      <article className={cn("group flex flex-col", className)}>
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-stone-100">
          {showImage && (
            <Link href={href} className="relative block h-full w-full">
              <Image
                src={article.imageUrl}
                alt={article.title}
                fill
                sizes="(max-width: 768px) 100vw, 66vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                priority
              />
            </Link>
          )}
          {article.breaking && (
            <span className="absolute left-3 top-3 flex items-center gap-1.5 bg-red-700 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              Breaking
            </span>
          )}
        </div>
        <div className="mt-4 flex flex-col">
          <Link href={`/article/${article.category.toLowerCase()}`}>
            <div className="mb-3 flex items-center gap-2">
              <Badge variant="outline" className="rounded-none border-black px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-black hover:bg-black hover:text-white">
                {article.category}
              </Badge>
              {article.premium && (
                <span className="flex items-center gap-1 rounded-sm bg-stone-900 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-400 dark:bg-stone-800">
                  <Lock className="h-2.5 w-2.5" />
                  Subscriber Exclusive
                </span>
              )}
            </div>
          </Link>
          <Link href={href} className="font-headline text-3xl font-black leading-[1.08] text-black sm:text-4xl lg:text-[2.75rem]">
            <span className="headline-link decoration-stone-900">{article.title}</span>
          </Link>
          {showSummary && article.deck && (
            <p className="mt-3 font-body text-lg leading-relaxed text-stone-700">
              {article.deck}
            </p>
          )}
          {showByline && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-stone-200 pt-3 text-xs font-sans text-stone-600">
              <Byline article={article} />
            </div>
          )}
        </div>
      </article>
    );
  }

  if (layout === "opinion") {
    return (
      <article className={cn("group flex flex-col", className)}>
        {showImage && (
          <Link href={href} className="relative mb-3 block aspect-[16/10] w-full overflow-hidden bg-stone-100">
            <Image
              src={article.imageUrl}
              alt={article.title}
              fill
              sizes="(max-width: 768px) 100vw, 25vw"
              className="object-cover grayscale transition duration-500 group-hover:grayscale-0"
            />
          </Link>
        )}
        <Link href={`/article/${article.category.toLowerCase()}`}>
          <span className="text-[11px] font-bold uppercase tracking-wider text-red-700">
            Opinion
          </span>
        </Link>
        <Link href={href} className="mt-2 block">
          <h3 className="font-headline text-xl font-bold italic leading-snug text-black">
            <span className="headline-link decoration-stone-900">{article.title}</span>
          </h3>
        </Link>
        {showSummary && article.deck && (
          <p className="mt-2 font-body text-[15px] italic leading-relaxed text-stone-700">
            {article.deck}
          </p>
        )}
        {showByline && (
          <div className="mt-3 flex items-center gap-2 text-xs font-sans text-stone-600">
            <Avatar name={article.author} />
            <span className="font-semibold text-stone-800">{article.author}</span>
            {article.authorTitle && <span className="text-stone-500">· {article.authorTitle}</span>}
          </div>
        )}
      </article>
    );
  }

  if (layout === "compact") {
    return (
      <article className={cn("group flex gap-3", className)}>
        {showImage && (
          <Link href={href} className="relative block h-16 w-16 shrink-0 overflow-hidden bg-stone-100 sm:h-20 sm:w-20">
            <Image
              src={article.imageUrl}
              alt={article.title}
              fill
              sizes="80px"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </Link>
        )}
        <div className="flex min-w-0 flex-col">
          {index !== undefined && (
            <span className="font-headline text-2xl font-black leading-none text-stone-300">
              {String(index).padStart(2, "0")}
            </span>
          )}
          <Link href={href} className="mt-1 block">
            <h4 className="font-headline text-[15px] font-bold leading-snug text-black">
              <span className="headline-link decoration-stone-900">{article.title}</span>
            </h4>
          </Link>
          <div className="mt-1.5 flex items-center gap-2 text-[11px] font-sans text-stone-500">
            <span className="font-semibold uppercase tracking-wider text-stone-600">
              {article.category}
            </span>
            <span>·</span>
            <span>{article.time}</span>
          </div>
        </div>
      </article>
    );
  }

  // standard
  return (
    <article className={cn("group flex flex-col", className)}>
      {showImage && (
        <Link href={href} className="relative mb-3 block aspect-[16/10] w-full overflow-hidden bg-stone-100">
          <Image
            src={article.imageUrl}
            alt={article.title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </Link>
      )}
      <Link href={`/article/${article.category.toLowerCase()}`}>
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="outline" className="rounded-none border-stone-400 px-2 py-0 text-[10px] font-bold uppercase tracking-wider text-stone-700 hover:border-black hover:text-black">
            {article.category}
          </Badge>
          {article.premium && (
            <span className="flex items-center gap-0.5 rounded-sm bg-stone-900 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-amber-400 dark:bg-stone-800">
              <Lock className="h-2 w-2" />
              Premium
            </span>
          )}
        </div>
      </Link>
      <Link href={href} className="group/headline block">
        <h3 className="font-headline text-xl font-bold leading-tight text-black">
          <span className="headline-link decoration-stone-900">{article.title}</span>
        </h3>
      </Link>
      {/* Hover preview: snippet appears on hover, replaces summary */}
      <div className="mt-2">
        {showSummary && article.deck && (
          <p className={cn(
            "font-body text-[15px] leading-relaxed text-stone-600 transition-all duration-200",
            "line-clamp-2 group-hover:line-clamp-3 dark:text-stone-400"
          )}>
            {article.deck}
          </p>
        )}
        {/* Author snippet on hover */}
        <p className="mt-1 font-sans text-[11px] text-stone-400 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          By {article.author} · {article.readTime} min read
        </p>
      </div>
      {showByline && (
        <div className="mt-3 flex items-center gap-2 text-[11px] font-sans text-stone-500">
          <span className="font-semibold text-stone-700">{article.author}</span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {article.readTime} min
          </span>
        </div>
      )}
    </article>
  );
}

function Byline({ article }: { article: Article }) {
  return (
    <>
      <span className="font-semibold text-stone-800">{article.author}</span>
      {article.authorTitle && (
        <span className="text-stone-500">, {article.authorTitle}</span>
      )}
      <span className="text-stone-400">·</span>
      <span>{article.time}</span>
      <span className="text-stone-400">·</span>
      <span className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {article.readTime} min read
      </span>
    </>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-800 text-[10px] font-bold uppercase text-white">
      {initials(name)}
    </span>
  );
}

export default ArticleCard;
