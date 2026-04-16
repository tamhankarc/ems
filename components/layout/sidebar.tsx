import Link from "next/link";
import {
  CalendarDays,
  KeyRound,
  LayoutDashboard,
  ShieldCheck,
  UserCog,
  CheckCheck,
} from "lucide-react";
import type { SessionUser } from "@/lib/auth";
import { canAccessLeaveRequests, canViewEMSAdminDashboard, canViewLeaveApprovals, canManageUsers } from "@/lib/permissions";

export type SidebarNavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

export function getSidebarItems(user: SessionUser): SidebarNavItem[] {
  const items: SidebarNavItem[] = [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }];

  if (canAccessLeaveRequests(user)) {
    items.push({ href: "/leave-requests", label: "Leave Requests", icon: CalendarDays });
  }

  if (canViewLeaveApprovals(user)) {
    items.push({ href: "/leave-approvals", label: "Leave Approvals", icon: CheckCheck });
  }

  if (canManageUsers(user) || canViewEMSAdminDashboard(user)) {
    items.push({ href: "/users", label: "Users", icon: ShieldCheck });
  }

  items.push(
    { href: "/profile", label: "My Profile", icon: UserCog },
    { href: "/change-password", label: "Change Password", icon: KeyRound },
  );

  return items;
}

export function Sidebar({ user }: { user: SessionUser }) {
  const items = getSidebarItems(user);

  return (
    <aside className="hidden lg:block shrink-0 w-64 2xl:w-72 border-r border-slate-200 bg-slate-950 text-slate-100">
      <div className="flex h-full flex-col">
        <div className="border-b border-slate-800 px-5 2xl:px-6 py-5 2xl:py-6">
          <p className="text-[11px] 2xl:text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
            Internal EMS
          </p>
          <h2 className="mt-3 text-base 2xl:text-lg font-semibold">Employee Management System</h2>
          <p className="mt-2 text-sm font-medium text-slate-200">{user.fullName}</p>
          <p className="text-xs text-slate-400">
            {user.userType.replaceAll("_", " ")}{user.designation ? ` · ${user.designation}` : ""}
          </p>
        </div>

        <nav className="flex-1 space-y-1 px-2.5 2xl:px-3 py-5 2xl:py-6">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] 2xl:text-sm font-medium text-slate-300 transition hover:bg-slate-900 hover:text-white"
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
