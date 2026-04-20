import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = ["/login", "/unsupported-device"];
const EMPLOYEE_ALLOWED_PATHS = [
  "/dashboard",
  "/leave-requests",
  "/profile",
  "/change-password",
];
const TEAM_LEAD_ALLOWED_PATHS = [
  "/dashboard",
  "/leave-requests",
  "/leave-approvals",
  "/profile",
  "/change-password",
];
const MANAGER_ALLOWED_PATHS = [
  "/dashboard",
  "/leave-requests",
  "/leave-approvals",
  "/users",
  "/profile",
  "/change-password",
];
const HR_ALLOWED_PATHS = [
  "/dashboard",
  "/leave-requests",
  "/leave-approvals",
  "/leave-admin",
  "/users",
  "/profile",
  "/change-password",
];
const ADMIN_ALLOWED_PATHS = [
  "/dashboard",
  "/leave-approvals",
  "/users",
  "/profile",
  "/change-password",
];

async function getSessionPayload(request: NextRequest) {
  const token = request.cookies.get("ems_session")?.value;
  const secret = process.env.SESSION_SECRET;
  if (!token || !secret) return null;

  try {
    const verified = await jwtVerify(token, new TextEncoder().encode(secret));
    return verified.payload as { userType?: string; functionalRole?: string } | null;
  } catch {
    return null;
  }
}

function isAllowed(pathname: string, allowedPaths: string[]) {
  return allowedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  const session = await getSessionPayload(request);
  const authed = Boolean(session);

  if (!authed && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (authed && (pathname === "/" || pathname === "/login" || pathname === "/unsupported-device")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!authed) return NextResponse.next();

  if (session?.userType === "EMPLOYEE" && !isAllowed(pathname, EMPLOYEE_ALLOWED_PATHS)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (session?.userType === "TEAM_LEAD" && !isAllowed(pathname, TEAM_LEAD_ALLOWED_PATHS)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (session?.userType === "MANAGER" && !isAllowed(pathname, MANAGER_ALLOWED_PATHS)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (session?.userType === "HR" && !isAllowed(pathname, HR_ALLOWED_PATHS)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (
    session?.userType === "ADMIN" &&
    !(session?.functionalRole === "PROJECT_MANAGER" || session?.functionalRole === "OTHER") &&
    !isAllowed(pathname, ADMIN_ALLOWED_PATHS)
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (
    session?.userType === "ADMIN" &&
    (session?.functionalRole === "PROJECT_MANAGER" || session?.functionalRole === "OTHER") &&
    !isAllowed(pathname, MANAGER_ALLOWED_PATHS)
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (session?.userType === "REPORT_VIEWER" || session?.userType === "ACCOUNTS") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
