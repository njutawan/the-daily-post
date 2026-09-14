import { ClerkSignIn } from "@/components/clerk-sign-in";

/**
 * Server-rendered guard shown when getSessionUser() is null.
 * Used by all member pages. Renders Clerk's <SignIn> inline so the
 * user can authenticate without leaving the page.
 */
export function SignInRequiredCard() {
  return <ClerkSignIn redirectUrl="/member" />;
}
