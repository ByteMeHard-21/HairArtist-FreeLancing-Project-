import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError, database } from "@/lib/booking-server";
import { menuServiceFields, mergeMenuServices, type MenuServiceOverride } from "@/lib/menu-services";

export function menuDatabaseError(error: { code?: string }) {
  return new AppError(["42P01", "PGRST205"].includes(error.code ?? "") ? "MENU_NOT_CONFIGURED" : "SERVICE_UNAVAILABLE", 503);
}

export async function getManagedMenuServices(client: SupabaseClient) {
  // Page through overrides so custom services aren't dropped at the API row limit.
  const overrides: MenuServiceOverride[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client.from("menu_service_overrides").select(menuServiceFields).order("id").range(offset, offset + 499);
    if (error) throw menuDatabaseError(error);
    overrides.push(...data as MenuServiceOverride[]);
    if (data.length < 500) break;
  }
  return mergeMenuServices(overrides);
}

export async function getPublishedMenuServices() {
  try {
    return (await getManagedMenuServices(database())).filter(service => service.status === "confirmed" && !service.isHidden);
  } catch (error) {
    // Before setup, use the approved static catalogue. Never restore old prices or
    // hidden services on a transient database failure after the table exists.
    if (error instanceof AppError && ["MENU_NOT_CONFIGURED", "NOT_CONFIGURED"].includes(error.code)) {
      return mergeMenuServices().filter(service => service.status === "confirmed" && !service.isHidden);
    }
    console.error("Public menu is temporarily unavailable.");
    return null;
  }
}
