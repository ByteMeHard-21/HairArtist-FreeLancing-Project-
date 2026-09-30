import { AdminMenu } from "@/components/admin-menu";
import { requireAdminPage } from "@/lib/admin-server";
import { AppError } from "@/lib/booking-server";
import { getManagedMenuServices } from "@/lib/menu-services-server";
import type { ManagedMenuService } from "@/lib/menu-services";

export default async function AdminMenuPage() {
  const { auth } = await requireAdminPage();
  let services: ManagedMenuService[] = [], error = "";
  try { services = await getManagedMenuServices(auth); }
  catch (cause) {
    error = cause instanceof AppError && cause.code === "MENU_NOT_CONFIGURED"
      ? "Menu editing needs the menu database migration. Apply 202609270001_menu_service_overrides.sql in Supabase, then refresh."
      : "Unable to load services. Refresh to try again.";
  }
  return <AdminMenu initialServices={services} initialError={error} />;
}
