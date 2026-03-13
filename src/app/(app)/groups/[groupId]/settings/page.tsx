import { getGroupById, getGroupMembers } from "@/actions/groups";
import { notFound } from "next/navigation";
import { GroupSettings } from "@/components/groups/group-settings";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const [group, members] = await Promise.all([
    getGroupById(groupId),
    getGroupMembers(groupId),
  ]);

  if (!group) notFound();

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Configuración</h2>
      <GroupSettings group={group} members={members} />
    </div>
  );
}
