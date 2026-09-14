"use client";
import { SignIn } from "@clerk/nextjs";

export function ClerkSignIn({ redirectUrl = "/member" }: { redirectUrl?: string }) {
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
