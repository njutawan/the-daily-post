"use client";

/**
 * User management view.
 *
 * Lists every user with role/subTier/subStatus badges and aggregates
 * (article count, payment count). Each row opens an edit dialog that
 * submits to PATCH /api/admin/users/[userId].
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Users,
  Search,
  Loader2,
  Pencil,
} from "lucide-react";
import { DashboardPageHeader, EmptyState } from "@/components/dashboard/shell";
import { AdminShell, type AdminShellUser } from "@/components/admin/admin-shell";
import {
  formatDate,
  roleBadgeClass,
  subStatusBadgeClass,
  tierBadgeClass,
  titleCase,
} from "@/components/admin/helpers";
import type { AdminUserRow } from "@/components/admin/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ROLES = ["all", "reader", "editor", "admin"] as const;
const TIERS = ["all", "free", "digital", "allaccess"] as const;

export interface AdminUsersViewProps {
  user: AdminShellUser;
  pendingCount: number;
  users: AdminUserRow[];
  currentUserId: string;
}

export function AdminUsersView({
  user,
  pendingCount,
  users,
  currentUserId,
}: AdminUsersViewProps) {
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [query, setQuery] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (tierFilter !== "all" && u.subTier !== tierFilter) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        const haystack = `${u.name ?? ""} ${u.email}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [users, roleFilter, tierFilter, query]);

  const editing = editingId
    ? filtered.find((u) => u.id === editingId) ?? users.find((u) => u.id === editingId) ?? null
    : null;

  return (
    <AdminShell
      user={user}
      navBadge={[{ href: "/admin/reviews", count: pendingCount }]}
    >
      <DashboardPageHeader
        eyebrow="People"
        title="User Management"
        description="Manage roles, subscription tier, status, and editorial byline for every reader, editor, and admin."
      />

      {/* Filter bar */}
      <div className="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <Input
              type="search"
              placeholder="Search by name or email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r === "all" ? "All roles" : titleCase(r)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Tier" />
            </SelectTrigger>
            <SelectContent>
              {TIERS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t === "all" ? "All tiers" : titleCase(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="mt-3 text-xs text-stone-500 dark:text-stone-400">
          Showing <span className="font-semibold text-stone-700 dark:text-stone-300">{filtered.length}</span> of {users.length} users
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={users.length === 0 ? "No users yet" : "No matches"}
          description={
            users.length === 0
              ? "When readers sign up via /auth, they'll appear here."
              : "Try adjusting your filters or search query."
          }
        />
      ) : (
        <div className="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 dark:bg-stone-900/80 border-b border-stone-200 dark:border-stone-800">
                <tr>
                  <th className="text-left font-semibold text-stone-600 dark:text-stone-400 px-4 py-3">User</th>
                  <th className="text-left font-semibold text-stone-600 dark:text-stone-400 px-4 py-3">Role</th>
                  <th className="text-left font-semibold text-stone-600 dark:text-stone-400 px-4 py-3">Tier</th>
                  <th className="text-left font-semibold text-stone-600 dark:text-stone-400 px-4 py-3">Sub Status</th>
                  <th className="text-left font-semibold text-stone-600 dark:text-stone-400 px-4 py-3">Member Since</th>
                  <th className="text-right font-semibold text-stone-600 dark:text-stone-400 px-4 py-3">Articles</th>
                  <th className="text-right font-semibold text-stone-600 dark:text-stone-400 px-4 py-3">Payments</th>
                  <th className="text-right font-semibold text-stone-600 dark:text-stone-400 px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-stone-100 dark:border-stone-800/50 hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 shrink-0 rounded-full overflow-hidden bg-stone-200 dark:bg-stone-700 flex items-center justify-center text-xs font-bold text-stone-700 dark:text-stone-200">
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            (u.name ?? u.email)[0]?.toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-stone-900 dark:text-stone-100 truncate">
                            {u.name ?? "(no name)"}
                            {u.id === currentUserId && (
                              <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-rose-700">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-stone-500 dark:text-stone-400 truncate">
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${roleBadgeClass(
                          u.role
                        )}`}
                      >
                        {titleCase(u.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tierBadgeClass(
                          u.subTier
                        )}`}
                      >
                        {titleCase(u.subTier)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${subStatusBadgeClass(
                          u.subStatus
                        )}`}
                      >
                        {titleCase(u.subStatus)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-500 dark:text-stone-400">
                      {formatDate(u.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-stone-700 dark:text-stone-300">
                      {u._count.articles.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-stone-700 dark:text-stone-300">
                      {u._count.payments.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingId(u.id)}
                        className="h-7 px-2"
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="md:hidden divide-y divide-stone-200 dark:divide-stone-800">
            {filtered.map((u) => (
              <li key={u.id} className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 shrink-0 rounded-full overflow-hidden bg-stone-200 dark:bg-stone-700 flex items-center justify-center text-sm font-bold text-stone-700 dark:text-stone-200">
                    {u.avatarUrl ? (
                      <img src={u.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      (u.name ?? u.email)[0]?.toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-stone-900 dark:text-stone-100 truncate">
                      {u.name ?? "(no name)"}
                      {u.id === currentUserId && (
                        <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-rose-700">You</span>
                      )}
                    </div>
                    <div className="text-xs text-stone-500 dark:text-stone-400 truncate">
                      {u.email}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingId(u.id)}
                    className="h-7 px-2 shrink-0"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${roleBadgeClass(u.role)}`}>
                    {titleCase(u.role)}
                  </span>
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tierBadgeClass(u.subTier)}`}>
                    {titleCase(u.subTier)}
                  </span>
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${subStatusBadgeClass(u.subStatus)}`}>
                    {titleCase(u.subStatus)}
                  </span>
                  <span className="text-stone-500 dark:text-stone-400">
                    Since {formatDate(u.createdAt)}
                  </span>
                  <span className="text-stone-500 dark:text-stone-400">
                    · {u._count.articles} articles · {u._count.payments} payments
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {editing && (
        <EditUserDialog
          user={editing}
          currentUserId={currentUserId}
          onClose={() => setEditingId(null)}
        />
      )}
    </AdminShell>
  );
}

function EditUserDialog({
  user,
  currentUserId,
  onClose,
}: {
  user: AdminUserRow;
  currentUserId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [role, setRole] = useState(user.role);
  const [subTier, setSubTier] = useState(user.subTier);
  const [subStatus, setSubStatus] = useState(user.subStatus);
  const [subExpiresAt, setSubExpiresAt] = useState<string>(
    user.subExpiresAt ? user.subExpiresAt.slice(0, 10) : ""
  );
  const [name, setName] = useState(user.name ?? "");
  const [byline, setByline] = useState(user.byline ?? "");
  const [submitting, setSubmitting] = useState(false);

  const isSelf = user.id === currentUserId;
  const tryingSelfDemotion = isSelf && role !== "admin";

  async function handleSave() {
    if (tryingSelfDemotion) {
      toast.error("You cannot demote your own account. Ask another admin to do it.");
      return;
    }
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        role,
        subTier,
        subStatus,
        name: name.trim() || undefined,
        byline: byline.trim() || null,
      };
      if (subExpiresAt) {
        // Convert YYYY-MM-DD to ISO datetime at end of day.
        body.subExpiresAt = new Date(subExpiresAt + "T23:59:59Z").toISOString();
      } else {
        body.subExpiresAt = null;
      }
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to update user");
      }
      toast.success(`Updated ${user.name ?? user.email}.`);
      onClose();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !submitting && !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription className="text-stone-500 dark:text-stone-400">
            <span className="block font-headline text-base font-semibold text-stone-900 dark:text-stone-50 mt-1">
              {user.name ?? "(no name)"}
            </span>
            <span className="block mt-0.5">{user.email}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <div>
            <Label htmlFor="user-name" className="text-sm font-medium">Display name</Label>
            <Input
              id="user-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="user-byline" className="text-sm font-medium">
              Byline <span className="text-stone-400 font-normal">(for editors)</span>
            </Label>
            <Input
              id="user-byline"
              value={byline}
              onChange={(e) => setByline(e.target.value)}
              placeholder="e.g. Eleanor Whitman"
              className="mt-1.5"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="w-full mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reader">Reader</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              {tryingSelfDemotion && (
                <p className="mt-1.5 text-xs text-rose-700 dark:text-rose-400">
                  You cannot demote your own account.
                </p>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium">Subscription tier</Label>
              <Select value={subTier} onValueChange={setSubTier}>
                <SelectTrigger className="w-full mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="digital">Digital</SelectItem>
                  <SelectItem value="allaccess">All Access</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">Subscription status</Label>
              <Select value={subStatus} onValueChange={setSubStatus}>
                <SelectTrigger className="w-full mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="past_due">Past Due</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="user-expires" className="text-sm font-medium">
                Subscription expires
              </Label>
              <Input
                id="user-expires"
                type="date"
                value={subExpiresAt}
                onChange={(e) => setSubExpiresAt(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={submitting || tryingSelfDemotion}
            className="bg-rose-700 text-white hover:bg-rose-800"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
