import type { ReactNode } from "react";
import { requireAvailableExposureSetup } from "@/lib/exposureSetup";

export default async function InputLayout({ children }: { children: ReactNode }) {
  await requireAvailableExposureSetup();
  return children;
}
