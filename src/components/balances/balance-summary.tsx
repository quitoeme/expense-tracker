"use client";

import type { BalanceEntry } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle } from "lucide-react";
import { settleUp } from "@/actions/balances";
import { toast } from "sonner";
import { useState } from "react";

interface BalanceSummaryProps {
  balances: BalanceEntry[];
  groupId: string;
}

export function BalanceSummary({ balances, groupId }: BalanceSummaryProps) {
  const [settling, setSettling] = useState<string | null>(null);

  if (balances.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" />
        <p className="text-muted-foreground">
          Todos los balances están saldados.
        </p>
      </div>
    );
  }

  const handleSettle = async (fromId: string, toId: string) => {
    const key = `${fromId}-${toId}`;
    setSettling(key);
    const result = await settleUp(groupId, fromId, toId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Deuda saldada");
    }
    setSettling(null);
  };

  return (
    <div className="space-y-3">
      {balances.map((balance) => (
        <Card key={`${balance.from_user.id}-${balance.to_user.id}`}>
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="text-sm">
                <span className="font-medium">
                  {balance.from_user.display_name}
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm">
                <span className="font-medium">
                  {balance.to_user.display_name}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-lg text-destructive">
                $
                {balance.amount.toLocaleString("es-AR", {
                  minimumFractionDigits: 2,
                })}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={settling === `${balance.from_user.id}-${balance.to_user.id}`}
                onClick={() =>
                  handleSettle(balance.from_user.id, balance.to_user.id)
                }
              >
                {settling === `${balance.from_user.id}-${balance.to_user.id}`
                  ? "Saldando..."
                  : "Saldar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
