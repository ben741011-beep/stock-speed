import { AuthForm } from "@/components/AuthForm";
import { readSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await readSession();
  if (session) redirect("/dashboard");

  return (
    <main className="relative grid min-h-[calc(100vh-8rem)] place-items-center overflow-hidden bg-slate-950 px-5 py-12 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_17%_15%,rgba(20,184,166,.18),transparent_30%),radial-gradient(circle_at_84%_70%,rgba(139,92,246,.12),transparent_32%)]" />
      <div className="relative w-full">
        <AuthForm mode="login" />
      </div>
    </main>
  );
}
