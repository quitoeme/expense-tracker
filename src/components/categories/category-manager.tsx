"use client";

import { useState } from "react";
import type { Category } from "@/lib/types";
import { createCategory, deleteCategory } from "@/actions/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface CategoryManagerProps {
  groupId: string;
  categories: Category[];
}

export function CategoryManager({
  groupId,
  categories,
}: CategoryManagerProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6b7280");
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setAdding(true);
    const formData = new FormData();
    formData.set("name", name);
    formData.set("color", color);
    const result = await createCategory(groupId, formData);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Categoría creada");
      setName("");
    }
    setAdding(false);
  };

  const handleDelete = async (categoryId: string) => {
    const result = await deleteCategory(groupId, categoryId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Categoría eliminada");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nueva categoría"
          className="flex-1"
        />
        <Input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-14 p-1 h-10"
        />
        <Button onClick={handleAdd} disabled={adding || !name.trim()}>
          <Plus className="h-4 w-4 mr-1" />
          {adding ? "Agregando..." : "Agregar"}
        </Button>
      </div>

      <div className="space-y-2">
        {categories.map((category) => (
          <Card key={category.id}>
            <CardContent className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: category.color ?? "#6b7280" }}
                />
                <span className="font-medium">{category.name}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => handleDelete(category.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
        {categories.length === 0 && (
          <p className="text-muted-foreground text-center py-8">
            No hay categorías. Agregá una.
          </p>
        )}
      </div>
    </div>
  );
}
