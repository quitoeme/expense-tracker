import Link from "next/link";
import { getGroups } from "@/actions/groups";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Users } from "lucide-react";

export default async function DashboardPage() {
  const groups = await getGroups();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Mis Grupos</h1>
        <Link href="/groups/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Grupo
          </Button>
        </Link>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardHeader className="text-center">
            <CardTitle>No tenés grupos todavía</CardTitle>
            <CardDescription>
              Creá tu primer grupo para empezar a trackear gastos compartidos.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Link key={group.id} href={`/groups/${group.id}`}>
              <Card className="hover:border-primary transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-lg">{group.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {(group as Record<string, unknown>).group_members
                      ? String(
                          (
                            (group as Record<string, unknown>)
                              .group_members as Array<{ count: number }>
                          )[0]?.count ?? 0
                        )
                      : "0"}{" "}
                    miembros
                    {group.description && ` · ${group.description}`}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
