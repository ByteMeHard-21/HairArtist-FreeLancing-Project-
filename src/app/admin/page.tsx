import { AdminDashboard } from "@/components/admin-dashboard";
import { requireAdminPage } from "@/lib/admin-server";
export default async function AdminPage(){await requireAdminPage();return <AdminDashboard />;}
