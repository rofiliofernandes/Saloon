import { requireOwner } from "@/lib/auth";
import AdminManagement from "@/components/admin-management";

export default async function AdminsPage() {
  await requireOwner();

  return <AdminManagement />;
}
