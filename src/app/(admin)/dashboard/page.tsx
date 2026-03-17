"use client";

import AnalyticsDashboard from "../_components/analytics-dashboard";
import { useConsoleIdentity } from "@/components/layout/console-identity";

export default function AdminDashboardPage() {
  const { workspaceId } = useConsoleIdentity();

  return <AnalyticsDashboard key={workspaceId ?? "workspace:none"} />;
}
