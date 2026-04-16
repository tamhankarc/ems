"use client";

import { useActionState, useEffect, useState } from "react";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import type { LeaveFormState } from "@/lib/actions/leave-actions";

const leaveTypeOptions = [
  { value: "CASUAL", label: "Casual" },
  { value: "SICK", label: "Sick" },
  { value: "EARNED", label: "Earned" },
];

const initialState: LeaveFormState = {};

export function LeaveRequestForm({
  action,
  approvers,
  mode = "create",
  initialValues,
  minDate,
}: {
  action: (state: LeaveFormState, formData: FormData) => Promise<LeaveFormState>;
  approvers: Array<{ id: string; fullName: string; userType: string; functionalRole?: string | null }>;
  mode?: "create" | "edit";
  initialValues?: {
    id?: string;
    leaveType?: string;
    startDate?: string;
    endDate?: string;
    reason?: string | null;
    approverId?: string | null;
    diwaliLeave?: boolean;
  };
  minDate: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [leaveType, setLeaveType] = useState(initialValues?.leaveType ?? "CASUAL");
  const [approverId, setApproverId] = useState(initialValues?.approverId ?? "");
  const [diwaliLeave, setDiwaliLeave] = useState(Boolean(initialValues?.diwaliLeave));
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (state?.success && mode === "create") {
      setLeaveType("CASUAL");
      setApproverId("");
      setDiwaliLeave(false);
      setKey((value) => value + 1);
    }
  }, [mode, state?.success]);

  return (
    <form action={formAction} className="card p-6" key={key}>
      {initialValues?.id ? <input type="hidden" name="id" value={initialValues.id} /> : null}
      <input type="hidden" name="leaveType" value={leaveType} />
      <input type="hidden" name="approverId" value={approverId} />

      <h2 className="section-title">{mode === "create" ? "Create leave request" : "Edit leave request"}</h2>
      <p className="section-subtitle">
        Submit leave for approval. Edit is available only when the approver marks a request for reconsideration.
      </p>

      {state?.error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div>
      ) : null}
      {state?.success ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Leave request saved successfully.
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <label className="label" htmlFor="leaveType">Leave type</label>
          <SearchableCombobox
            id="leaveType"
            value={leaveType}
            onValueChange={setLeaveType}
            options={leaveTypeOptions}
            placeholder="Select leave type"
            searchPlaceholder="Search leave type..."
            emptyLabel="No leave type found."
          />
        </div>

        <div>
          <label className="label" htmlFor="approverId">Approver</label>
          <SearchableCombobox
            id="approverId"
            value={approverId}
            onValueChange={setApproverId}
            options={approvers.map((approver) => ({
              value: approver.id,
              label: `${approver.fullName} (${approver.userType.replaceAll("_", " ")})`,
            }))}
            placeholder="Select approver"
            searchPlaceholder="Search approvers..."
            emptyLabel="No approver found."
          />
        </div>

        <div>
          <label className="label" htmlFor="startDate">Start date</label>
          <input
            className="input"
            id="startDate"
            name="startDate"
            type="date"
            min={minDate}
            defaultValue={initialValues?.startDate ?? minDate}
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="endDate">End date</label>
          <input
            className="input"
            id="endDate"
            name="endDate"
            type="date"
            min={initialValues?.startDate && initialValues.startDate > minDate ? initialValues.startDate : minDate}
            defaultValue={initialValues?.endDate ?? initialValues?.startDate ?? minDate}
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              name="diwaliLeave"
              checked={diwaliLeave}
              onChange={(event) => setDiwaliLeave(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span>Diwali Leave</span>
          </label>
        </div>

        <div className="md:col-span-2">
          <label className="label" htmlFor="reason">Reason</label>
          <textarea
            id="reason"
            name="reason"
            rows={4}
            className="input min-h-28"
            defaultValue={initialValues?.reason ?? ""}
            placeholder="Reason for leave"
            required
          />
        </div>

        <div className="md:col-span-2">
          <button className="btn-primary w-full" disabled={pending}>
            {pending ? "Saving..." : mode === "create" ? "Submit leave request" : "Save changes"}
          </button>
        </div>
      </div>
    </form>
  );
}
