import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "EMS Internal Platform",
  description: "Employee attendance and leave management system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
