"use client";

import dynamic from "next/dynamic";

const ModerationDashboardClient = dynamic(() => import("./ModerationDashboardClient"), {
  ssr: false,
});

export default ModerationDashboardClient;
