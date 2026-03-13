"use client";

import { useState } from "react";
import { createExpense } from "@/actions/expenses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import type { GroupMember, Category } from "@/lib/types";

interface ExpenseFormProps {
  groupId: string;
  members: GroupMember[];
  categories: Category[];
  onSuccess: () => void;
}

type SplitMethod = "equal" | "percentage" | "fixed";

interface SplitData {
  user_id: string;
  amount: number;
  percentage: number;
  included: boolean;
}

export function ExpenseForm({
  groupId,
  members,
  categories,
  onSuccess,
}: ExpenseFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [categoryId, setCategoryId] = useState<string>("none");
  const [paidBy, setPaidBy] = useState(members[0]?.user_id ?? "");
  const [splitMethod, setSplitMethod] = useState<SplitMethod>("equal");
  const [splits, setSplits] = useState<SplitData[]>(
    members.map((m) => ({
      user_id: m.user_id,
      amount: 0,
      percentage: Math.round(10000 / members.length) / 100,
      included: true,
    }))
  );

  const numAmount = parseFloat(amount) || 0;

  const updateSplit = (index: number, field: keyof SplitData, value: unknown) => {
    setSplits((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const getCalculatedSplits = () => {
    if (splitMethod === "equal") {
      const included = splits.filter((s) => s.included);
      const perPerson = numAmount / (included.length || 1);
      return splits
        .filter((s) => s.included)
        .map((s) => ({
          user_id: s.user_id,
          amount: Math.round(perPerson * 100) / 100,
        }));
    }
    if (splitMethod === "percentage") {
      return splits.map((s) => ({
        user_id: s.user_id,
        amount: Math.round(numAmount * (s.percentage / 100) * 100) / 100,
        percentage: s.percentage,
      }));
    }
    // fixed
    return splits.map((s) => ({
      user_id: s.user_id,
      amount: s.amount,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const calculatedSplits = getCalculatedSplits();
      const result = await createExpense(groupId, {
        description,
        amount: numAmount,
        date,
        category_id: categoryId === "none" ? null : categoryId,
        paid_by: paidBy,
        split_method: splitMethod,
        splits: calculatedSplits,
      });

      if (result.error) {
        setError(result.error);
      } else {
        toast.success("Gasto creado");
        onSuccess();
      }
    } finally {
      setLoading(false);
    }
  };

  const pctTotal = splits.reduce((sum, s) => sum + s.percentage, 0);
  const fixedTotal = splits.reduce((sum, s) => sum + s.amount, 0);
  const equalCount = splits.filter((s) => s.included).length;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label>Descripción</Label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ej: Cena en restaurante"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Monto</Label>
          <Input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Fecha</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Pagó</Label>
          <Select value={paidBy} onValueChange={(v) => v && setPaidBy(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {members.map((m) => (
                <SelectItem key={m.user_id} value={m.user_id}>
                  {m.profiles?.display_name ?? m.profiles?.email ?? "?"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Categoría</Label>
          <Select value={categoryId} onValueChange={(v) => v && setCategoryId(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin categoría</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        <Label>Dividir</Label>
        <Tabs
          value={splitMethod}
          onValueChange={(v) => v && setSplitMethod(v as SplitMethod)}
        >
          <TabsList className="w-full">
            <TabsTrigger value="equal" className="flex-1">
              Iguales
            </TabsTrigger>
            <TabsTrigger value="percentage" className="flex-1">
              Porcentual
            </TabsTrigger>
            <TabsTrigger value="fixed" className="flex-1">
              Monto fijo
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-2 border rounded-md p-3">
          {splits.map((split, i) => {
            const member = members.find((m) => m.user_id === split.user_id);
            const name =
              member?.profiles?.display_name ?? member?.profiles?.email ?? "?";

            return (
              <div key={split.user_id} className="flex items-center gap-3">
                {splitMethod === "equal" && (
                  <input
                    type="checkbox"
                    checked={split.included}
                    onChange={(e) =>
                      updateSplit(i, "included", e.target.checked)
                    }
                    className="rounded"
                  />
                )}
                <span className="flex-1 text-sm">{name}</span>
                {splitMethod === "equal" && split.included && (
                  <span className="text-sm text-muted-foreground">
                    $
                    {(numAmount / equalCount || 0).toLocaleString("es-AR", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                )}
                {splitMethod === "percentage" && (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={split.percentage}
                      onChange={(e) =>
                        updateSplit(i, "percentage", parseFloat(e.target.value) || 0)
                      }
                      className="w-20 text-right"
                    />
                    <span className="text-sm">%</span>
                    <span className="text-sm text-muted-foreground w-24 text-right">
                      $
                      {(numAmount * (split.percentage / 100)).toLocaleString(
                        "es-AR",
                        { minimumFractionDigits: 2 }
                      )}
                    </span>
                  </div>
                )}
                {splitMethod === "fixed" && (
                  <div className="flex items-center gap-1">
                    <span className="text-sm">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={split.amount}
                      onChange={(e) =>
                        updateSplit(i, "amount", parseFloat(e.target.value) || 0)
                      }
                      className="w-24 text-right"
                    />
                  </div>
                )}
              </div>
            );
          })}

          {splitMethod === "percentage" && (
            <div
              className={`text-sm text-right ${
                Math.abs(pctTotal - 100) < 0.01
                  ? "text-green-600"
                  : "text-destructive"
              }`}
            >
              Total: {pctTotal.toFixed(2)}%
            </div>
          )}
          {splitMethod === "fixed" && (
            <div
              className={`text-sm text-right ${
                Math.abs(fixedTotal - numAmount) < 0.01
                  ? "text-green-600"
                  : "text-destructive"
              }`}
            >
              Total: ${fixedTotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })} / $
              {numAmount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </div>
          )}
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Guardando..." : "Guardar Gasto"}
      </Button>
    </form>
  );
}
