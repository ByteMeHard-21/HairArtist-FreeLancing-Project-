import "server-only";
import { redirect } from "next/navigation";
import { AppError, authClient } from "./booking-server";

export async function adminSession() {
  const auth = await authClient();
  const { data, error } = await auth.auth.getUser();
  if (error || !data.user) throw new AppError("UNAUTHORIZED", 401);
  const membership = await auth.from("admin_users").select("role,is_active").eq("user_id", data.user.id).maybeSingle();
  if (membership.error) throw new AppError("SERVICE_UNAVAILABLE", 503);
  if (!membership.data?.is_active || membership.data.role !== "ADMIN") throw new AppError("FORBIDDEN", 403);
  return { auth, user: data.user };
}

export async function requireAdminPage() {
  try { return await adminSession(); }
  catch (error) {
    if (error instanceof AppError) {
      if (error.code === "FORBIDDEN") redirect("/admin/unauthorized");
      if (error.code === "UNAUTHORIZED") redirect("/admin/login");
    }
    throw error;
  }
}
