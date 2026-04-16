import Link from "next/link";
import { Bell, MapPin } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canMarkAttendance, canViewEMSAdminDashboard } from "@/lib/permissions";
import {
  getAdminDashboardData,
  getAttendanceCalendarData,
  getEmployeeDashboardSnapshot,
  getGlobalApproverAssignmentIds,
  getApproverOptions,
  getPendingLeaveCount,
} from "@/lib/ems-queries";
import { AttendanceActionsCard } from "@/components/ems/attendance-actions-card";
import { AttendanceCalendar } from "@/components/ems/attendance-calendar";
import { ApproverAssignmentForm } from "@/components/ems/approver-assignment-form";
import {
  clampMonthKey,
  formatDateInIst,
  formatTimeInIst,
  getInitialCalendarStartMonth,
  getIstDateKey,
  isMarkInWindow,
  isMarkOutWindow,
  shiftMonthKey,
} from "@/lib/ist";
import { parsePageParam, paginateItems } from "@/lib/pagination";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{
    date?: string;
    month?: string;
    attendancePage?: string;
    leavePage?: string;
  }>;
}) {
  const user = await requireUser();
  const params = (await searchParams) ?? {};
  const todayKey = getIstDateKey();
  const selectedDate = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : todayKey;

  if (canViewEMSAdminDashboard(user)) {
    const [dashboardData, pendingCount, approvers, selectedApproverIds] = await Promise.all([
      getAdminDashboardData(selectedDate),
      getPendingLeaveCount(),
      getApproverOptions(),
      getGlobalApproverAssignmentIds(),
    ]);

    const attendancePagination = paginateItems(
      dashboardData.attendanceRows,
      parsePageParam(params.attendancePage),
      10,
    );
    const leavePagination = paginateItems(
      dashboardData.leaveRows,
      parsePageParam(params.leavePage),
      10,
    );

    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          description="Attendance, approved leaves, pending approvals, and approver assignment overview."
        />

        <ApproverAssignmentForm
          approvers={approvers}
          selectedApproverIds={selectedApproverIds}
        />

        {pendingCount > 0 ? (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 px-6 py-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-900">Pending Leave Approvals</p>
                  <p className="mt-1 text-sm text-amber-800">
                    There {pendingCount === 1 ? "is" : "are"} <span className="font-semibold">{pendingCount}</span>{" "}
                    pending leave {pendingCount === 1 ? "request" : "requests"} awaiting approver action.
                  </p>
                </div>
              </div>
              <Link className="btn-secondary" href="/leave-approvals">
                Open Leave Approvals
              </Link>
            </div>
          </section>
        ) : null}

        <section className="card mx-auto max-w-xl p-5">
          <form className="grid gap-3 sm:grid-cols-[1fr_auto]" method="get">
            <input className="input" type="date" name="date" defaultValue={selectedDate} />
            <button className="btn-secondary" type="submit">Apply</button>
          </form>
        </section>

        <section className="table-wrap" id="attendance-list">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="section-title">Attendance for selected date</h2>
            <p className="section-subtitle">Employees include Role Based Managers, Team Leads, and Employees.</p>
          </div>
          <table className="table-base">
            <thead className="table-head">
              <tr>
                <th className="table-cell">Employee</th>
                <th className="table-cell">User type</th>
                <th className="table-cell">Functional role</th>
                <th className="table-cell">In-Time</th>
                <th className="table-cell">Out-Time</th>
                <th className="table-cell">City</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attendancePagination.items.map((row) => (
                <tr key={row.id}>
                  <td className="table-cell font-medium text-slate-900">{row.fullName}</td>
                  <td className="table-cell">{row.userType.replaceAll("_", " ")}</td>
                  <td className="table-cell">{(row.functionalRole ?? "UNASSIGNED").replaceAll("_", " ")}</td>
                  <td className="table-cell">{formatTimeInIst(row.markIn?.markedAt ?? null)}</td>
                  <td className="table-cell">{formatTimeInIst(row.markOut?.markedAt ?? null)}</td>
                  <td className="table-cell">{row.city || "—"}</td>
                </tr>
              ))}
              {attendancePagination.totalItems === 0 ? (
                <tr>
                  <td colSpan={6} className="table-cell text-center text-sm text-slate-500">No attendance rows found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
          <PaginationControls
            basePath="/dashboard"
            currentPage={attendancePagination.currentPage}
            totalPages={attendancePagination.totalPages}
            totalItems={attendancePagination.totalItems}
            pageSize={attendancePagination.pageSize}
            searchParams={{
              date: selectedDate,
              month: params.month,
              attendancePage: params.attendancePage,
              leavePage: params.leavePage,
            }}
            pageParam="attendancePage"
            anchor="#attendance-list"
          />
        </section>

        <section className="table-wrap" id="approved-leaves-list">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="section-title">Employees on approved leave</h2>
            <p className="section-subtitle">Only approved leave requests are shown for the selected date.</p>
          </div>
          <table className="table-base">
            <thead className="table-head">
              <tr>
                <th className="table-cell">Employee</th>
                <th className="table-cell">User type</th>
                <th className="table-cell">Functional role</th>
                <th className="table-cell">Leave type</th>
                <th className="table-cell">Date range</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leavePagination.items.map((row) => (
                <tr key={row.id}>
                  <td className="table-cell font-medium text-slate-900">{row.user.fullName}</td>
                  <td className="table-cell">{row.user.userType.replaceAll("_", " ")}</td>
                  <td className="table-cell">{(row.user.functionalRole ?? "UNASSIGNED").replaceAll("_", " ")}</td>
                  <td className="table-cell">{row.leaveType.replaceAll("_", " ")}</td>
                  <td className="table-cell">{formatDateInIst(row.startDate)} - {formatDateInIst(row.endDate)}</td>
                </tr>
              ))}
              {leavePagination.totalItems === 0 ? (
                <tr>
                  <td colSpan={5} className="table-cell text-center text-sm text-slate-500">No approved leaves for this date.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
          <PaginationControls
            basePath="/dashboard"
            currentPage={leavePagination.currentPage}
            totalPages={leavePagination.totalPages}
            totalItems={leavePagination.totalItems}
            pageSize={leavePagination.pageSize}
            searchParams={{
              date: selectedDate,
              month: params.month,
              attendancePage: params.attendancePage,
              leavePage: params.leavePage,
            }}
            pageParam="leavePage"
            anchor="#approved-leaves-list"
          />
        </section>
      </div>
    );
  }

  if (!canMarkAttendance(user)) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="This account does not have EMS dashboard access." />
      </div>
    );
  }

  const snapshot = await getEmployeeDashboardSnapshot(user.id);
  const resolvedJoiningDate = (await db.user.findUnique({ where: { id: user.id }, select: { joiningDate: true } }))?.joiningDate ?? null;
  const minMonth = getInitialCalendarStartMonth(resolvedJoiningDate);
  const currentMonth = todayKey.slice(0, 7);
  const focusMonth = clampMonthKey(
    params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : currentMonth,
    minMonth,
    currentMonth,
  );
  const companionMonth = focusMonth === currentMonth
    ? (minMonth < currentMonth ? shiftMonthKey(currentMonth, -1) : undefined)
    : clampMonthKey(shiftMonthKey(focusMonth, 1), minMonth, currentMonth);

  const [focusCalendarData, companionCalendarData] = await Promise.all([
    getAttendanceCalendarData(user.id, focusMonth, resolvedJoiningDate),
    companionMonth && companionMonth !== focusMonth
      ? getAttendanceCalendarData(user.id, companionMonth, resolvedJoiningDate)
      : Promise.resolve(undefined),
  ]);

  const hasMarkIn = Boolean(snapshot.attendanceStatus.markIn);
  const hasMarkOut = Boolean(snapshot.attendanceStatus.markOut);
  const canMarkInNow = !hasMarkIn && isMarkInWindow();
  const canMarkOutNow = hasMarkIn && !hasMarkOut && isMarkOutWindow();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Attendance actions, attendance calendar, and your current leave requests."
        actions={
          <Link className="btn-secondary" href="/leave-requests">
            Manage leave requests
          </Link>
        }
      />

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <div className="flex items-center gap-2 font-medium text-slate-900">
          <MapPin className="h-4 w-4" />
          Geolocation rule
        </div>
        <p className="mt-2">
          Attendance actions work only when browser geolocation is enabled. Any attendance attempt without valid geolocation will sign you out.
        </p>
      </section>

      <AttendanceActionsCard
        canMarkIn={canMarkInNow}
        canMarkOut={canMarkOutNow}
        markInAt={formatTimeInIst(snapshot.attendanceStatus.markIn?.markedAt ?? null)}
        markOutAt={formatTimeInIst(snapshot.attendanceStatus.markOut?.markedAt ?? null)}
        city={snapshot.attendanceStatus.markOut?.city ?? snapshot.attendanceStatus.markIn?.city ?? null}
      />

      <AttendanceCalendar
        focusMonthKey={focusMonth}
        companionMonthKey={companionCalendarData ? companionMonth : undefined}
        focusData={focusCalendarData}
        companionData={companionCalendarData}
        todayKey={todayKey}
      />

      <section className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="section-title">Current leave snapshot</h2>
            <p className="section-subtitle">Recent active leave requests and their latest status.</p>
          </div>
          <Link className="btn-primary" href="/leave-requests/new">
            Create leave request
          </Link>
        </div>

        <div className="mt-5 space-y-3">
          {snapshot.leaveSummary.map((row) => (
            <div key={row.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{row.leaveType.replaceAll("_", " ")}</p>
                  <p className="text-sm text-slate-500">{formatDateInIst(row.startDate)} - {formatDateInIst(row.endDate)}</p>
                </div>
                <span className="badge-blue">{row.status.replaceAll("_", " ")}</span>
              </div>
              {row.reason ? <p className="mt-3 whitespace-pre-line text-sm text-slate-600">{row.reason}</p> : null}
            </div>
          ))}
          {snapshot.leaveSummary.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              No current leave requests found.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
