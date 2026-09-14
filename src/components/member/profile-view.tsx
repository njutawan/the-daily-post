"use client";

/**
 * Client view for `/member/profile`.
 *
 * Renders a profile-editing form (wired to PATCH /api/member/profile) plus
 * the user's account info and a danger zone with a "Sign out" button and
 * a "Cancel subscription" button (shown only for paid subscribers). The
 * cancel button calls POST /api/subscriptions/cancel.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  User,
  Mail,
  Shield,
  CalendarDays,
  AlertTriangle,
  LogOut,
  Loader2,
  XCircle,
  Check,
} from "lucide-react";
import { format, parseISO } from "date-fns";

import { MemberShell } from "@/components/member/member-shell";
import { useUnifiedAuth } from "@/components/unified-auth-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  PLAN_BADGE_CLASS,
  STATUS_BADGE_CLASS,
  STATUS_LABELS,
  planLabel,
  type MemberUser,
} from "@/components/member/types";

interface ProfileViewProps {
  user: MemberUser;
}

export function MemberProfileView({ user }: ProfileViewProps) {
  const router = useRouter();
  const { signOut, refresh } = useUnifiedAuth();
  const isEditorOrAdmin = user.role === "editor" || user.role === "admin";
  const isPaid = user.subTier !== "free" && user.subStatus !== "canceled" && user.subStatus !== "expired";

  const [name, setName] = useState(user.name ?? "");
  const [byline, setByline] = useState(user.byline ?? "");
  const [bio, setBio] = useState(user.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");
  const [signingOut, setSigningOut] = useState(false);
  const [saving, setSaving] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [cancelImmediate, setCancelImmediate] = useState(false);

  // Track whether the form has changes.
  const hasChanges =
    name !== (user.name ?? "") ||
    byline !== (user.byline ?? "") ||
    bio !== (user.bio ?? "") ||
    avatarUrl !== (user.avatarUrl ?? "");

  async function handleSave() {
    setSaving(true);
    try {
      const payload: Record<string, string | null> = {};
      if (name !== (user.name ?? "")) payload.name = name;
      if (byline !== (user.byline ?? "")) payload.byline = byline || null;
      if (bio !== (user.bio ?? "")) payload.bio = bio || null;
      if (avatarUrl !== (user.avatarUrl ?? "")) payload.avatarUrl = avatarUrl || null;

      const res = await fetch("/api/member/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Save failed");
      }
      toast.success("Profile updated");
      await refresh();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  }

  async function handleCancelSubscription() {
    setCanceling(true);
    try {
      const res = await fetch("/api/subscriptions/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ immediate: cancelImmediate, reason: "User requested cancellation" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Cancellation failed");
      }
      toast.success(
        cancelImmediate
          ? "Subscription canceled immediately. Refund processing."
          : "Subscription canceled. You'll keep access until the end of your billing cycle."
      );
      await refresh();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel");
    } finally {
      setCanceling(false);
    }
  }

  return (
    <MemberShell user={user}>
      {/* Page header */}
      <div className="pb-6 mb-6 border-b border-stone-200 dark:border-stone-800">
        <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-700 mb-2">
          Profile
        </div>
        <h1 className="font-headline text-2xl md:text-3xl font-bold text-stone-900 dark:text-stone-50">
          Profile &amp; account
        </h1>
        <p className="mt-1.5 text-sm text-stone-600 dark:text-stone-400 max-w-2xl">
          Manage how your name appears on The Daily Post. Some fields are only
          visible to staff.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile form */}
        <section className="lg:col-span-2 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-4 w-4 text-emerald-700" />
            <h2 className="font-headline text-lg font-bold text-stone-900 dark:text-stone-50">
              Profile details
            </h2>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="name">Display name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name as it appears on bylines and comments"
              />
              <p className="text-[11px] text-stone-500">
                Shown next to your comments and saved-article shares.
              </p>
            </div>

            {isEditorOrAdmin && (
              <div className="grid gap-1.5">
                <Label htmlFor="byline">Byline</Label>
                <Input
                  id="byline"
                  value={byline}
                  onChange={(e) => setByline(e.target.value)}
                  placeholder="e.g. Eleanor Whitman"
                />
                <p className="text-[11px] text-stone-500">
                  Authors only. The name displayed at the top of your published articles.
                </p>
              </div>
            )}

            <div className="grid gap-1.5">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A short bio (max ~280 chars). Optional."
                maxLength={280}
                rows={4}
              />
              <p className="text-[11px] text-stone-500">{bio.length} / 280</p>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="avatar">Avatar URL</Label>
              <Input
                id="avatar"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://…"
                inputMode="url"
              />
              <p className="text-[11px] text-stone-500">
                Paste a URL to your profile photo. Leave blank for an initials avatar.
              </p>
            </div>

            {/* Avatar preview */}
            <div className="flex items-center gap-3 pt-1">
              <div className="h-12 w-12 rounded-full overflow-hidden bg-stone-200 dark:bg-stone-700 flex items-center justify-center text-sm font-bold text-stone-700 dark:text-stone-200">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  (name || user.email)[0]?.toUpperCase()
                )}
              </div>
              <div className="text-xs text-stone-500">Preview</div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <Button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className="bg-emerald-700 hover:bg-emerald-800 text-white"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                )}
                Save changes
              </Button>
              {hasChanges && (
                <span className="text-[11px] text-stone-500 inline-flex items-center gap-1">
                  Unsaved changes
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Account info */}
        <section className="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-4 w-4 text-emerald-700" />
            <h2 className="font-headline text-lg font-bold text-stone-900 dark:text-stone-50">
              Account info
            </h2>
          </div>
          <dl className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Mail className="h-4 w-4 text-stone-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <dt className="text-[11px] uppercase tracking-[0.18em] text-stone-500">Email</dt>
                <dd className="font-medium text-stone-900 dark:text-stone-100 truncate">{user.email}</dd>
                <p className="text-[11px] text-stone-500">Read-only — contact support to change.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <User className="h-4 w-4 text-stone-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <dt className="text-[11px] uppercase tracking-[0.18em] text-stone-500">Role</dt>
                <dd className="font-medium text-stone-900 dark:text-stone-100 capitalize">{user.role}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CalendarDays className="h-4 w-4 text-stone-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <dt className="text-[11px] uppercase tracking-[0.18em] text-stone-500">Member since</dt>
                <dd className="font-medium text-stone-900 dark:text-stone-100">
                  {format(parseISO(user.createdAt), "MMM d, yyyy")}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-3 pt-3 border-t border-stone-100 dark:border-stone-800">
              <div className="min-w-0">
                <dt className="text-[11px] uppercase tracking-[0.18em] text-stone-500 mb-1">Subscription</dt>
                <dd className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${PLAN_BADGE_CLASS[user.subTier]}`}>
                    {planLabel(user.subTier)}
                  </span>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE_CLASS[user.subStatus as keyof typeof STATUS_BADGE_CLASS]}`}>
                    {STATUS_LABELS[user.subStatus as keyof typeof STATUS_LABELS] ?? user.subStatus}
                  </span>
                </dd>
                {user.subExpiresAt && user.subTier !== "free" && (
                  <p className="mt-1 text-[11px] text-stone-500">
                    {user.subStatus === "canceled"
                      ? `Access ends ${format(parseISO(user.subExpiresAt), "MMM d, yyyy")}.`
                      : `Renews ${format(parseISO(user.subExpiresAt), "MMM d, yyyy")}.`}
                  </p>
                )}
              </div>
            </div>
          </dl>
        </section>
      </div>

      {/* Danger zone */}
      <section className="mt-6 rounded-lg border-2 border-rose-300 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/20 p-5 md:p-6">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="h-4 w-4 text-rose-700" />
          <h2 className="font-headline text-lg font-bold text-rose-700 dark:text-rose-400">
            Danger zone
          </h2>
        </div>
        <p className="text-sm text-stone-600 dark:text-stone-400 mb-4 max-w-2xl">
          Sign out clears your local session. Canceling a subscription ends your
          access at the close of the current billing cycle (or immediately, if
          you opt into a prorated refund).
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={handleSignOut}
            disabled={signingOut}
            variant="outline"
            className="border-stone-300 dark:border-stone-700 hover:border-stone-900 dark:hover:border-stone-100"
          >
            {signingOut ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <LogOut className="h-3.5 w-3.5" />
            )}
            Sign out
          </Button>

          {isPaid && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="border-rose-300 text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/40"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Cancel subscription
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You&rsquo;ll keep access until{" "}
                    <strong>
                      {user.subExpiresAt ? format(parseISO(user.subExpiresAt), "MMM d, yyyy") : "the end of your billing cycle"}
                    </strong>. You can re-subscribe anytime.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="flex items-start gap-2 py-2">
                  <Checkbox
                    id="cancel-immediate"
                    checked={cancelImmediate}
                    onCheckedChange={(v) => setCancelImmediate(v === true)}
                  />
                  <div className="text-sm">
                    <Label htmlFor="cancel-immediate" className="cursor-pointer">
                      Cancel immediately (prorated refund)
                    </Label>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      End access now and refund the unused portion of your billing cycle.
                    </p>
                  </div>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={canceling}>Keep my plan</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCancelSubscription}
                    disabled={canceling}
                    className="bg-rose-700 hover:bg-rose-800 text-white"
                  >
                    {canceling ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : null}
                    Confirm cancellation
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </section>

      {/* Subtle help footer */}
      <p className="mt-6 text-xs text-stone-500">
        Need to delete your account? Email{" "}
        <Link href="mailto:privacy@daily-post.test" className="underline hover:text-emerald-700">
          privacy@daily-post.test
        </Link>{" "}
        and we&rsquo;ll handle it within 30 days, per our privacy policy.
      </p>
    </MemberShell>
  );
}
