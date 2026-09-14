"use client";

import * as React from "react";
import {
  Facebook,
  Twitter,
  Linkedin,
  Link as LinkIcon,
  Printer,
  Check,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type ShareBarProps = {
  slug: string;
  title: string;
  className?: string;
};

export function ShareBar({ slug, title, className }: ShareBarProps) {
  const [copied, setCopied] = React.useState(false);
  const [origin, setOrigin] = React.useState("");
  const { toast } = useToast();

  // Get the origin on the client only (after mount) to avoid hydration mismatch
  React.useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const url = origin ? `${origin}/article/${slug}` : `/article/${slug}`;
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const shareLinks = [
    {
      icon: <Facebook className="h-4 w-4" />,
      label: "Share on Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      icon: <Twitter className="h-4 w-4" />,
      label: "Share on Twitter",
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    },
    {
      icon: <Linkedin className="h-4 w-4" />,
      label: "Share on LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      icon: <Mail className="h-4 w-4" />,
      label: "Share via email",
      href: `mailto:?subject=${encodedTitle}&body=I%20thought%20you%20might%20find%20this%20interesting%3A%0A%0A${encodedUrl}`,
    },
  ];

  async function handleCopy() {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for older browsers
        const ta = document.createElement("textarea");
        ta.value = url;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      toast({ title: "Link copied", description: "The article link is in your clipboard." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Couldn't copy", description: "Please copy the URL from your browser bar.", variant: "destructive" });
    }
  }

  function handlePrint() {
    window.print();
  }

  const btnClass =
    "flex h-9 w-9 items-center justify-center rounded-full border border-stone-300 text-stone-600 transition hover:border-black hover:bg-black hover:text-white dark:border-stone-700 dark:text-stone-400 dark:hover:border-white dark:hover:bg-white dark:hover:text-black";

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {shareLinks.map((s) => (
        <a
          key={s.label}
          href={s.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={s.label}
          title={s.label}
          className={btnClass}
        >
          {s.icon}
        </a>
      ))}
      <button
        onClick={handleCopy}
        aria-label="Copy link"
        title="Copy link"
        className={cn(
          btnClass,
          copied && "border-green-700 bg-green-700 text-white hover:bg-green-700 hover:border-green-700"
        )}
      >
        {copied ? <Check className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
      </button>
      <button
        onClick={handlePrint}
        aria-label="Print article"
        title="Print"
        className={btnClass}
      >
        <Printer className="h-4 w-4" />
      </button>
    </div>
  );
}

export default ShareBar;
