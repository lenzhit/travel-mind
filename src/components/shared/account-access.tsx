import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { CUSTOMER_COOKIE, requireAccount } from "@/server/services/customer-auth";
import { AdminError } from "@/server/services/admin-errors";
export async function AccountAccess({ roles, children }: { roles: readonly string[]; children: React.ReactNode }) {
  await connection();
  const token = (await cookies()).get(CUSTOMER_COOKIE)?.value;
  let actor;
  try { actor = await requireAccount(token); }
  catch (error) {
    if (error instanceof AdminError && error.status === 401) redirect("/account");
    throw error;
  }
  if (!roles.includes(actor.role)) redirect("/account");
  return children;
}

