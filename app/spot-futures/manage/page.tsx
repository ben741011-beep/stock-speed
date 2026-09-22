import { redirect } from "next/navigation";
import { SpotFuturesManagement } from "@/components/SpotFuturesDashboard";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { getSpotFuturesLedger } from "@/lib/spotFuturesLedger";

export const dynamic = "force-dynamic";

export default async function SpotFuturesManagementPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  let initialLedger = null;
  let initialError = "";
  try {
    await connectToDatabase();
    initialLedger = await getSpotFuturesLedger(user.id);
  } catch {
    initialError = "目前無法讀取0050＋微臺帳本，請稍後再試。";
  }
  return <SpotFuturesManagement initialLedger={initialLedger} initialError={initialError} />;
}
