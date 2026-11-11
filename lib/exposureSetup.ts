import "server-only";

import { redirect } from "next/navigation";
import { getAppOwner } from "@/lib/app-owner";
import { connectToDatabase } from "@/lib/mongodb";
import { hasExposureRecord } from "@/models/ExposureRecord";

export async function requireAvailableExposureSetup() {
  const user = await getAppOwner();

  await connectToDatabase();
  if (await hasExposureRecord(user.id)) redirect("/trade");
}
