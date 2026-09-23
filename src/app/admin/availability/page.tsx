import { AdminDashboard } from "@/components/admin-dashboard";
import { requireAdminPage } from "@/lib/admin-server";
export default async function AvailabilityPage(){await requireAdminPage();return <AdminDashboard availabilityOnly />;}
