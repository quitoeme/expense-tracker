"use client";

import { useState } from "react";
import type { Group, GroupMember } from "@/lib/types";
import {
    updateGroup,
    deleteGroup,
    addMember,
    removeMember,
} from "@/actions/groups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CURRENCIES } from "@/lib/constants";
import { toast } from "sonner";
import { Trash2, UserPlus, Mail } from "lucide-react";

interface GroupSettingsProps {
    group: Group;
    members: GroupMember[];
}

export function GroupSettings({ group, members }: GroupSettingsProps) {
    const [email, setEmail] = useState("");
    const [addingMember, setAddingMember] = useState(false);
    const [inviteOpen, setInviteOpen] = useState(false);

  const handleUpdateGroup = async (formData: FormData) => {
        const result = await updateGroup(group.id, formData);
        if (result?.error) {
                toast.error(result.error);
        } else {
                toast.success("Grupo actualizado");
        }
  };

  const handleAddMember = async () => {
        if (!email.trim()) return;
        setAddingMember(true);
        const result = await addMember(group.id, email);
        if (result.error) {
                toast.error(result.error);
        } else {
                toast.success(`Invitación enviada a ${email}`);
                setEmail("");
                setInviteOpen(false);
        }
        setAddingMember(false);
  };

  const handleRemoveMember = async (userId: string) => {
        const result = await removeMember(group.id, userId);
        if (result.error) {
                toast.error(result.error);
        } else {
                toast.success("Miembro eliminado");
        }
  };

  const handleDeleteGroup = async () => {
        if (
                !confirm(
                          "¿Estás seguro de eliminar este grupo? Esta acción no se puede deshacer."
                        )
              )
                return;
        const result = await deleteGroup(group.id);
        if (result?.error) {
                toast.error(result.error);
        }
  };

  return (
        <div className="space-y-6 max-w-lg">
          {/* Invite button — prominent at the top */}
              <div className="flex items-center justify-between">
                      <div>
                                <p className="text-sm text-muted-foreground">
                                  {members.length} miembro{members.length !== 1 ? "s" : ""}
                                </p>
                      </div>
                      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                                <DialogTrigger asChild>
                                            <Button>
                                                          <UserPlus className="h-4 w-4 mr-2" />
                                                          Invitar persona
                                            </Button>
                                </DialogTrigger>
                                <DialogContent>
                                            <DialogHeader>
                                                          <DialogTitle>Invitar al grupo</DialogTitle>
                                                          <DialogDescription>
                                                                          Ingresá el email de la persona que querés agregar. Le va a
                                                                          llegar un mail con el link al grupo.
                                                          </DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-4 pt-2">
                                                          <div className="flex gap-2">
                                                                          <Input
                                                                                              value={email}
                                                                                              onChange={(e) => setEmail(e.target.value)}
                                                                                              placeholder="email@ejemplo.com"
                                                                                              type="email"
                                                                                              className="flex-1"
                                                                                              onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
                                                                                              autoFocus
                                                                                            />
                                                                          <Button
                                                                                              onClick={handleAddMember}
                                                                                              disabled={addingMember || !email.trim()}
                                                                                            >
                                                                                            <Mail className="h-4 w-4 mr-1" />
                                                                            {addingMember ? "Enviando..." : "Invitar"}
                                                                          </Button>
                                                          </div>
                                            </div>
                                </DialogContent>
                      </Dialog>
              </div>
        
          {/* Members list */}
              <Card>
                      <CardHeader>
                                <CardTitle className="text-base">Miembros</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {members.map((member) => (
                      <div
                                      key={member.id}
                                      className="flex items-center justify-between py-2"
                                    >
                                    <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium">
                                                      {member.profiles?.display_name ?? member.profiles?.email}
                                                    </span>
                                                    <Badge variant="secondary" className="text-xs">
                                                      {member.role}
                                                    </Badge>
                                    </div>
                        {member.role !== "admin" && (
                                                      <Button
                                                                          variant="ghost"
                                                                          size="icon"
                                                                          className="text-muted-foreground hover:text-destructive"
                                                                          onClick={() => handleRemoveMember(member.user_id)}
                                                                        >
                                                                        <Trash2 className="h-4 w-4" />
                                                      </Button>
                                    )}
                      </div>
                    ))}
                      </CardContent>
              </Card>
        
          {/* Group info */}
              <Card>
                      <CardHeader>
                                <CardTitle className="text-base">Información del grupo</CardTitle>
                      </CardHeader>
                      <CardContent>
                                <form action={handleUpdateGroup} className="space-y-4">
                                            <div className="space-y-2">
                                                          <Label htmlFor="name">Nombre</Label>
                                                          <Input
                                                                            id="name"
                                                                            name="name"
                                                                            defaultValue={group.name}
                                                                            required
                                                                          />
                                            </div>
                                            <div className="space-y-2">
                                                          <Label htmlFor="description">Descripción</Label>
                                                          <Textarea
                                                                            id="description"
                                                                            name="description"
                                                                            defaultValue={group.description ?? ""}
                                                                          />
                                            </div>
                                            <div className="space-y-2">
                                                          <Label htmlFor="currency">Moneda</Label>
                                                          <Select name="currency" defaultValue={group.currency}>
                                                                          <SelectTrigger>
                                                                                            <SelectValue />
                                                                          </SelectTrigger>
                                                                          <SelectContent>
                                                                            {CURRENCIES.map((c) => (
                              <SelectItem key={c.value} value={c.value}>
                                {c.label}
                              </SelectItem>
                            ))}
                                                                          </SelectContent>
                                                          </Select>
                                            </div>
                                            <Button type="submit">Guardar cambios</Button>
                                </form>
                      </CardContent>
              </Card>
        
          {/* Danger zone */}
              <Card className="border-destructive">
                      <CardHeader>
                                <CardTitle className="text-base text-destructive">
                                            Zona peligrosa
                                </CardTitle>
                      </CardHeader>
                      <CardContent>
                                <Button variant="destructive" onClick={handleDeleteGroup}>
                                            Eliminar grupo
                                </Button>
                      </CardContent>
              </Card>
        </div>
      );
}</div>
