import { getGroupById } from "@/actions/groups";
import { notFound } from "next/navigation";
import { GroupNav } from "@/components/groups/group-nav";

export default async function GroupLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const group = await getGroupById(groupId);

  if (!group) notFound();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{group.name}</h1>
        {group.description && (
          <p className="text-muted-foreground">{group.description}</p>
        )}
      </div>
      <GroupNav groupId={groupId} />
      <div className="mt-6">{children}</div>
    </div>
  );
}
