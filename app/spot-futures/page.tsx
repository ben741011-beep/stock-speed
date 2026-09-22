import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { getSpotFuturesLedger } from "@/lib/spotFuturesLedger";
import { getStoredSpotFuturesValuation } from "@/lib/spotFuturesValuation";
import { SpotFuturesDashboard } from "@/components/SpotFuturesDashboard";

export const dynamic = "force-dynamic";

export default async function SpotFuturesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  let initialLedger = null;
  let initialValuation = null;
  let initialError = "";
  try {
    await connectToDatabase();
    initialLedger = await getSpotFuturesLedger(user.id);
    initialValuation = initialLedger ? await getStoredSpotFuturesValuation(user.id, initialLedger) : null;
  } catch {
    initialError = "目前無法讀取 0050＋微臺帳本，請稍後再試。";
  }
  return <SpotFuturesDashboard initialLedger={initialLedger} initialValuation={initialValuation} initialError={initialError} />;
}
