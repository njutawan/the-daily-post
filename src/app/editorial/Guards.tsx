import { ClerkSignIn } from "@/components/clerk-sign-in";
import { ShieldAlert, FileQuestion } from "lucide-react";

/**
 * Article not found guard — shown when an article lookup returns null
 * (deleted, wrong ID, or not authored by the current editor).
 */
export function ArticleNotFound({ reason }: { reason: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-stone-950 px-4">
      <div className="w-full max-w-md rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-8 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
          <FileQuestion className="h-6 w-6 text-stone-500" strokeWidth={2.2} />
        </div>
        <h1 className="mt-5 font-headline text-2xl font-bold text-stone-900 dark:text-stone-50">
          Article not found
        </h1>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">{reason}</p>
      </div>
    </div>
  );
}

/**
 * Defensive guard: rendered when `getSessionUser()` returns null.
 * Shows Clerk's <SignIn> inline so the user can authenticate without
 * being redirected away from the page they tried to access.
 */
export function SignInRequired({ redirect = "/editorial" }: { redirect?: string }) {
  return <ClerkSignIn redirectUrl={redirect} />;
}

/**
 * Defensive guard: rendered when the signed-in user does not have the
 * `editor` or `admin` role required for the `/editorial` area.
 */
export function ForbiddenRole() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-stone-950 px-4">
      <div className="w-full max-w-md rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-8 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
          <ShieldAlert className="h-6 w-6 text-red-700" strokeWidth={2.2} />
        </div>
        <h1 className="mt-5 font-headline text-2xl font-bold text-stone-900 dark:text-stone-50">
          Access denied
        </h1>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
          Your account doesn&apos;t have editor or admin privileges.
          Contact your administrator if you believe this is an error.
        </p>
      </div>
    </div>
  );
}
