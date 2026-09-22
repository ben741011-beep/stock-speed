import "server-only";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { hasExposureRecord } from "@/models/ExposureRecord";

export async function requireAvailableExposureSetup() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  await connectToDatabase();
  if (await hasExposureRecord(user.id)) redirect("/trade");
}
