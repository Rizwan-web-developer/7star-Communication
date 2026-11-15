import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession().catch(() => null);
  if (session?.tenantId) redirect(`/store/${session.tenantId}`);
  redirect("/login");
}
