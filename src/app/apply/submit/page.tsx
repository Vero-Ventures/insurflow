import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AUTHENTICATED_HOME_ROUTE } from "@/lib/app-routes";
import { getSession } from "@/server/better-auth/server";

export default async function ApplySubmitPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/sign-up?role=client");
  }

  const cookieStore = await cookies();
  cookieStore.set("insurflow_application_status", "submitted", {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 14,
  });

  redirect(AUTHENTICATED_HOME_ROUTE);
}
