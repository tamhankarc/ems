import "server-only";
import { db } from "@/lib/db";
import {
  getAttendanceWorkDateKey,
  getDayBoundsUtcFromIstDateKey,
  getInitialCalendarStartMonth,
  getIstDateKey,
  getMonthEndUtcExclusiveFromIstKey,
  getMonthStartUtcFromIstKey,
} from "@/lib/ist";

export async function getPendingLeaveCount() {
  return db.leaveRequest.count({ where: { status: "PENDING" } });
}

export async function getApproverOptions() {
  return db.user.findMany({
    where: {
      isActive: true,
      OR: [
        { userType: "TEAM_LEAD" },
        { userType: "MANAGER" },
        { userType: "ADMIN" },
      ],
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      userType: true,
      functionalRole: true,
    },
    orderBy: [{ fullName: "asc" }],
  });
}

export async function getGlobalApproverAssignmentIds() {
  const rows = await db.leaveApproverAssignment.findMany({
    select: { approverId: true },
    distinct: ["approverId"],
    orderBy: { approverId: "asc" },
  });
  return rows.map((row) => row.approverId);
}

export async function getEligibleEmployeeIdsForGlobalApproverAssignment() {
  const rows = await db.user.findMany({
    where: {
      isActive: true,
      OR: [
        { userType: "EMPLOYEE" },
        { userType: "TEAM_LEAD" },
        { userType: "MANAGER", NOT: { functionalRole: "PROJECT_MANAGER" } },
      ],
    },
    select: { id: true },
  });
  return rows.map((row) => row.id);
}

export async function getAdminDashboardData(dateKey: string) {
  const { startUtc, endUtc } = getDayBoundsUtcFromIstDateKey(dateKey);

  const employees = await db.user.findMany({
    where: {
      isActive: true,
      OR: [
        { userType: "EMPLOYEE" },
        { userType: "TEAM_LEAD" },
        { userType: "MANAGER", NOT: { functionalRole: "PROJECT_MANAGER" } },
      ],
    },
    select: {
      id: true,
      fullName: true,
      userType: true,
      functionalRole: true,
      attendanceLogs: {
        where: {
          attendanceDate: { gte: startUtc, lt: endUtc },
        },
        orderBy: { markedAt: "asc" },
        select: {
          id: true,
          type: true,
          markedAt: true,
          city: true,
        },
      },
    },
    orderBy: [{ fullName: "asc" }],
  });

  const approvedLeaves = await db.leaveRequest.findMany({
    where: {
      status: "APPROVED",
      startDate: { lt: endUtc },
      endDate: { gte: startUtc },
    },
    select: {
      id: true,
      leaveType: true,
      startDate: true,
      endDate: true,
      user: {
        select: {
          fullName: true,
          userType: true,
          functionalRole: true,
        },
      },
    },
    orderBy: [{ user: { fullName: "asc" } }],
  });

  return {
    attendanceRows: employees.map((employee) => {
      const markIn = employee.attendanceLogs.find((row) => row.type === "MARK_IN") ?? null;
      const markOut = [...employee.attendanceLogs].reverse().find((row) => row.type === "MARK_OUT") ?? null;
      return {
        id: employee.id,
        fullName: employee.fullName,
        userType: employee.userType,
        functionalRole: employee.functionalRole,
        markIn,
        markOut,
        city: markOut?.city || markIn?.city || null,
      };
    }),
    leaveRows: approvedLeaves,
  };
}

export async function getAttendanceStatusForUser(userId: string) {
  const todayWorkDateKey = getAttendanceWorkDateKey();
  const { startUtc, endUtc } = getDayBoundsUtcFromIstDateKey(todayWorkDateKey);
  const rows = await db.attendanceLog.findMany({
    where: {
      userId,
      attendanceDate: { gte: startUtc, lt: endUtc },
    },
    orderBy: { markedAt: "asc" },
  });

  const markIn = rows.find((row) => row.type === "MARK_IN") ?? null;
  const markOut = [...rows].reverse().find((row) => row.type === "MARK_OUT") ?? null;

  return { dateKey: todayWorkDateKey, markIn, markOut };
}

export async function getEmployeeDashboardSnapshot(userId: string) {
  const [attendanceStatus, leaveSummary] = await Promise.all([
    getAttendanceStatusForUser(userId),
    db.leaveRequest.findMany({
      where: {
        userId,
        status: { in: ["PENDING", "APPROVED", "RECONSIDER"] },
      },
      orderBy: [{ startDate: "asc" }],
      take: 5,
    }),
  ]);

  return { attendanceStatus, leaveSummary };
}

export async function getAttendanceCalendarData(userId: string, monthKey: string, joiningDate: Date | null | undefined) {
  const monthStart = getMonthStartUtcFromIstKey(monthKey);
  const monthEndExclusive = getMonthEndUtcExclusiveFromIstKey(monthKey);

  const [attendanceRows, leaveRows] = await Promise.all([
    db.attendanceLog.findMany({
      where: {
        userId,
        attendanceDate: {
          gte: monthStart,
          lt: monthEndExclusive,
        },
      },
      select: {
        attendanceDate: true,
        type: true,
      },
    }),
    db.leaveRequest.findMany({
      where: {
        userId,
        status: "APPROVED",
        startDate: { lt: monthEndExclusive },
        endDate: { gte: monthStart },
      },
      select: {
        startDate: true,
        endDate: true,
      },
    }),
  ]);

  const presentDays = new Set(
    attendanceRows
      .filter((row) => row.type === "MARK_IN")
      .map((row) => getIstDateKey(row.attendanceDate)),
  );

  const leaveDays = new Set<string>();
  for (const row of leaveRows) {
    let cursor = new Date(row.startDate);
    while (cursor < row.endDate || cursor.getTime() === row.endDate.getTime()) {
      const key = getIstDateKey(cursor);
      if (key.startsWith(monthKey)) leaveDays.add(key);
      cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  return {
    monthKey,
    presentDays: [...presentDays],
    leaveDays: [...leaveDays],
    minMonthKey: getInitialCalendarStartMonth(joiningDate),
    maxMonthKey: getIstDateKey().slice(0, 7),
  };
}

export async function getAllowedLeaveRequestApproversForUser(userId: string) {
  const requester = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      userType: true,
      functionalRole: true,
    },
  });

  if (!requester) return [];

  if (requester.userType === "EMPLOYEE") {
    const assignments = await db.leaveApproverAssignment.findMany({
      where: { employeeId: userId },
      include: {
        approver: {
          select: { id: true, fullName: true, userType: true, functionalRole: true },
        },
      },
      orderBy: [{ approver: { fullName: "asc" } }],
    });

    return assignments
      .map((row) => row.approver)
      .filter((approver) =>
        approver.userType === "TEAM_LEAD" ||
        (approver.userType === "MANAGER"),
      );
  }

  if (requester.userType === "TEAM_LEAD" || (requester.userType === "MANAGER" && requester.functionalRole !== "PROJECT_MANAGER")) {
    return db.user.findMany({
      where: {
        isActive: true,
        userType: "MANAGER",
        functionalRole: "PROJECT_MANAGER",
      },
      select: { id: true, fullName: true, userType: true, functionalRole: true },
      orderBy: [{ fullName: "asc" }],
    });
  }

  if (requester.userType === "HR" || requester.functionalRole === "PROJECT_MANAGER") {
    return db.user.findMany({
      where: {
        isActive: true,
        userType: "ADMIN",
        functionalRole: "DIRECTOR",
      },
      select: { id: true, fullName: true, userType: true, functionalRole: true },
      orderBy: [{ fullName: "asc" }],
    });
  }

  return [];
}

export async function isValidLeaveRequestApproverForUser(userId: string, approverId: string) {
  if (!approverId) return false;
  const approvers = await getAllowedLeaveRequestApproversForUser(userId);
  return approvers.some((approver) => approver.id === approverId);
}

export async function getLeaveRequestsForUser(userId: string, todayDateKey: string) {
  const { startUtc } = getDayBoundsUtcFromIstDateKey(todayDateKey);

  const current = await db.leaveRequest.findMany({
    where: {
      userId,
      OR: [
        { endDate: { gte: startUtc } },
        { status: { in: ["PENDING", "APPROVED", "RECONSIDER"] } },
      ],
    },
    include: {
      approver: {
        select: { fullName: true, userType: true },
      },
    },
    orderBy: [{ startDate: "asc" }, { createdAt: "desc" }],
  });

  const past = await db.leaveRequest.findMany({
    where: {
      userId,
      NOT: {
        OR: [
          { endDate: { gte: startUtc } },
          { status: { in: ["PENDING", "APPROVED", "RECONSIDER"] } },
        ],
      },
    },
    include: {
      approver: {
        select: { fullName: true, userType: true },
      },
    },
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
  });

  const approvers = await getAllowedLeaveRequestApproversForUser(userId);

  return { current, past, approvers };
}

export async function getLeaveApprovalsForUser(viewerId: string, restrictToAssigned: boolean) {
  const where = restrictToAssigned
    ? {
        OR: [{ approverId: viewerId }, { user: { leaveApproverAssignments: { some: { approverId: viewerId } } } }],
      }
    : {};

  return db.leaveRequest.findMany({
    where,
    include: {
      user: {
        select: {
          fullName: true,
          userType: true,
          functionalRole: true,
        },
      },
      approver: {
        select: {
          fullName: true,
          userType: true,
        },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
}
