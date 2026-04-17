import { PageHeader } from "@/components/ui/page-header";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { requireUser } from "@/lib/auth";
import { canViewEMSAdminDashboard } from "@/lib/permissions";
import { getLeaveApprovalsForUser, getGlobalApproverAssignmentIds } from "@/lib/ems-queries";
import { formatDateInIst } from "@/lib/ist";
import { reviewLeaveRequestAction } from "@/lib/actions/leave-actions";
import { paginateItems, parsePageParam } from "@/lib/pagination";

export default async function LeaveApprovalsPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string }>;
}) {
  const user = await requireUser();
  const selectedApproverIds = await getGlobalApproverAssignmentIds();
  const elevated = canViewEMSAdminDashboard(user) && selectedApproverIds.includes(user.id);
  const rows = await getLeaveApprovalsForUser(user.id, !elevated);
  const params = (await searchParams) ?? {};
  const pagination = paginateItems(rows, parsePageParam(params.page), 10);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Approvals"
        description={
          !elevated
            ? "Admin, HR, Managers and Team Leads can view all leave requests. Only designated approvers can take approval actions."
            : "Review leave requests assigned to you as a designated approver."
        }
      />

      <section className="table-wrap" id="leave-approvals-list">
        <table className="table-base">
          <thead className="table-head">
            <tr>
              <th className="table-cell">Employee</th>
              <th className="table-cell">User type</th>
              <th className="table-cell">Functional role</th>
              <th className="table-cell">Leave type</th>
              <th className="table-cell">Date range</th>
              <th className="table-cell">Status</th>
              <th className="table-cell">Reason / Comment</th>
              <th className="table-cell">Approver</th>
              <th className="table-cell">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pagination.items.map((row) => {
              const canAct = elevated;
              return (
                <tr key={row.id}>
                  <td className="table-cell font-medium text-slate-900">{row.user.fullName}</td>
                  <td className="table-cell">{row.user.userType.replaceAll("_", " ")}</td>
                  <td className="table-cell">{(row.user.functionalRole ?? "UNASSIGNED").replaceAll("_", " ")}</td>
                  <td className="table-cell">{row.leaveType.replaceAll("_", " ")}</td>
                  <td className="table-cell">{formatDateInIst(row.startDate)} - {formatDateInIst(row.endDate)}</td>
                  <td className="table-cell"><span className="badge-blue">{row.status.replaceAll("_", " ")}</span></td>
                  <td className="table-cell whitespace-pre-line">{row.approverComment || row.reconsiderNote || row.reason || "—"}</td>
                  <td className="table-cell">{row.approver?.fullName || "—"}</td>
                  <td className="table-cell">
                    {canAct ? (
                      <div className="flex flex-col gap-2">
                        <form action={reviewLeaveRequestAction} className="flex flex-col gap-2">
                          <input type="hidden" name="id" value={row.id} />
                          <textarea
                            name="comment"
                            rows={2}
                            className="input min-h-20"
                            placeholder="Optional comment for approval / rejection / reconsideration"
                          />
                          <div className="flex flex-wrap gap-2">
                            <button className="btn-primary text-xs" name="decision" value="APPROVED">Approve</button>
                            <button className="btn-secondary text-xs" name="decision" value="REJECTED">Reject</button>
                            <button className="btn-secondary text-xs" name="decision" value="RECONSIDER">Reconsider</button>
                          </div>
                        </form>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-500">Status only</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {pagination.totalItems === 0 ? (
              <tr>
                <td colSpan={9} className="table-cell text-center text-sm text-slate-500">No leave requests found.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <PaginationControls
          basePath="/leave-approvals"
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          pageSize={pagination.pageSize}
          searchParams={{ page: params.page }}
          anchor="#leave-approvals-list"
        />
      </section>
    </div>
  );
}
