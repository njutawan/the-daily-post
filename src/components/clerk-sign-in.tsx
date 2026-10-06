"use client";
import { SignIn } from "@clerk/nextjs";

export function ClerkSignIn({ redirectUrl = "/member" }: { redirectUrl?: string }) {
  // Without a publishable key there is no <ClerkProvider> in the tree
  // (see auth-provider.tsx) and <SignIn> would throw. Show a clear,
  // styled notice instead of a client-side crash.
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
        <div className="mx-auto max-w-md rounded-lg border border-stone-200 bg-white p-8 text-center shadow-lg dark:border-stone-800 dark:bg-stone-900">
          <h2 className="font-headline text-2xl font-bold text-stone-900 dark:text-stone-50">
            Sign-in unavailable
          </h2>
          <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">
            Authentication is not configured on this deployment. Set{" "}
            <code className="rounded bg-stone-100 px-1 py-0.5 text-xs dark:bg-stone-800">
              NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
            </code>{" "}
            and{" "}
            <code className="rounded bg-stone-100 px-1 py-0.5 text-xs dark:bg-stone-800">
              CLERK_SECRET_KEY
            </code>{" "}
            to enable member sign-in.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <SignIn
        fallbackRedirectUrl={redirectUrl}
        appearance={{
          elements: {
            rootBox: "mx-auto",
            cardBox: "shadow-lg rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900",
            headerTitle: "font-headline text-2xl font-bold text-stone-900 dark:text-stone-50",
            headerSubtitle: "text-sm text-stone-600 dark:text-stone-400",
            formButtonPrimary: "bg-stone-900 hover:bg-stone-800 text-sm font-semibold normal-case dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200",
            formFieldInput: "rounded-md border-stone-300 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-50",
            footerActionLink: "text-red-700 hover:text-red-800",
          },
        }}
      />
    </div>
  );
}
