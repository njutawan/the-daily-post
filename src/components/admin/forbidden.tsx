import Link from "next/link";
import { ShieldAlert, ArrowRight } from "lucide-react";

/**
 * 403 — Admin only page. Used defensively if `getSessionUser()` returns null
 * or the user is not an admin (proxy.ts normally handles redirects, but
 * being defensive avoids any window where an unauthorized request could
 * reach a server component).
 */
export function AdminForbidden({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 dark:bg-stone-950 px-6 text-center">
      <div className="h-14 w-14 rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center mb-5">
        <ShieldAlert className="h-7 w-7 text-rose-700 dark:text-rose-400" strokeWidth={2.2} />
      </div>
      <h1 className="font-headline text-3xl md:text-4xl font-bold text-stone-900 dark:text-stone-50">
        403 — Admin only
      </h1>
      <p className="mt-3 max-w-md text-stone-600 dark:text-stone-400 font-body">
        {signedIn
          ? "Your account does not have permission to view this page. Only administrators can access the admin console."
          : "You must be signed in as an administrator to view this page."}
      </p>
      <Link
        href="/member"
        className="mt-6 inline-flex items-center gap-2 rounded-md bg-rose-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-800 transition-colors"
      >
        Sign in as admin
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
