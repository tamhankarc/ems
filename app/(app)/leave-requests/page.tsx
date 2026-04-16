import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth";
import { canAccessLeaveRequests } from "@/lib/permissions";
import { getIstDateKey, formatDateInIst } from "@/lib/ist";
import { cancelLeaveRequestAction, deleteLeaveRequestAction } from "@/lib/actions/leave-actions";
import { getLeaveRequestsForUser } from "@/lib/ems-queries";

export default async function LeaveRequestsPage() {
  const user = await requireUser();

  if (!canAccessLeaveRequests(user)) {
    return (
      <div className="space-y-6">
        <PageHeader title="Leave Requests" description="This account does not have access to leave requests." />
      </div>
    );
  }

  const data = await getLeaveRequestsForUser(user.id, getIstDateKey());

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Requests"
        description="Manage your current and past leave requests. Edit is available only when an approver asks you to reconsider."
        actions={
          <Link className="btn-primary" href="/leave-requests/new">
            Create leave request
          </Link>
        }
      />

      <section className="table-wrap">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="section-title">Current requests</h2>
          <p className="section-subtitle">Current includes active dates and all requests that are still actionable.</p>
        </div>
        <table className="table-base">
          <thead className="table-head">
            <tr>
              <th className="table-cell">Leave type</th>
              <th className="table-cell">Date range</th>
              <th className="table-cell">Approver</th>
              <th className="table-cell">Status</th>
              <th className="table-cell">Notes</th>
              <th className="table-cell">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.current.map((row) => (
              <tr key={row.id}>
                <td className="table-cell">{row.leaveType.replaceAll("_", " ")}</td>
                <td className="table-cell">{formatDateInIst(row.startDate)} - {formatDateInIst(row.endDate)}</td>
                <td className="table-cell">{row.approver?.fullName || "—"}</td>
                <td className="table-cell"><span className="badge-blue">{row.status.replaceAll("_", " ")}</span></td>
                <td className="table-cell whitespace-pre-line">
                  {row.reconsiderNote || row.approverComment || row.reason || "—"}
                </td>
                <td className="table-cell">
                  <div className="flex flex-wrap gap-2">
                    {row.status === "RECONSIDER" ? (
                      <Link className="btn-secondary text-xs" href={`/leave-requests/${row.id}/edit`}>Edit</Link>
                    ) : null}
                    {row.status !== "APPROVED" ? (
                      <form action={deleteLeaveRequestAction}>
                        <input type="hidden" name="id" value={row.id} />
                        <button className="btn-secondary text-xs">Delete</button>
                      </form>
                    ) : null}
                    {row.status === "APPROVED" ? (
                      <form action={cancelLeaveRequestAction}>
                        <input type="hidden" name="id" value={row.id} />
                        <button className="btn-secondary text-xs">Cancel</button>
                      </form>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {data.current.length === 0 ? (
              <tr>
                <td colSpan={6} className="table-cell text-center text-sm text-slate-500">No current leave requests found.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="table-wrap">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="section-title">Past requests</h2>
          <p className="section-subtitle">Past includes inactive requests whose dates have passed or which are no longer actionable.</p>
        </div>
        <table className="table-base">
          <thead className="table-head">
            <tr>
              <th className="table-cell">Leave type</th>
              <th className="table-cell">Date range</th>
              <th className="table-cell">Approver</th>
              <th className="table-cell">Status</th>
              <th className="table-cell">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.past.map((row) => (
              <tr key={row.id}>
                <td className="table-cell">{row.leaveType.replaceAll("_", " ")}</td>
                <td className="table-cell">{formatDateInIst(row.startDate)} - {formatDateInIst(row.endDate)}</td>
                <td className="table-cell">{row.approver?.fullName || "—"}</td>
                <td className="table-cell"><span className="badge-slate">{row.status.replaceAll("_", " ")}</span></td>
                <td className="table-cell whitespace-pre-line">
                  {row.reconsiderNote || row.approverComment || row.reason || "—"}
                </td>
              </tr>
            ))}
            {data.past.length === 0 ? (
              <tr>
                <td colSpan={5} className="table-cell text-center text-sm text-slate-500">No past leave requests found.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
