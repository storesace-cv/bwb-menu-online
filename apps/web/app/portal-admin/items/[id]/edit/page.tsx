import { redirect } from "next/navigation";

export default async function EditItemRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/portal-admin/settings/items/${id}/edit`);
}
