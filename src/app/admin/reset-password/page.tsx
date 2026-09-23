import { AdminAuth } from "@/components/admin-auth";
import { requireAdminPage } from "@/lib/admin-server";
export default async function ResetPage(){await requireAdminPage();return <AdminAuth reset />;}
