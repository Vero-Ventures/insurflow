"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Users, Heart, Wallet, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/client-utils";
import type { TreeNode } from "@/types/beneficiary-tree";
import { cn } from "@/lib/utils";

interface BeneficiaryTreeNodeProps {
  node: TreeNode;
  onClick: () => void;
  isSelected: boolean;
}

export function BeneficiaryTreeNode({
  node,
  onClick,
  isSelected,
}: BeneficiaryTreeNodeProps) {
  // Icon based on node type
  const Icon =
    node.type === "client"
      ? User
      : node.type === "spouse"
        ? Heart
        : node.type === "child" || node.type === "beneficiary"
          ? Users
          : Wallet;

  // Color scheme based on node type
  const colorScheme =
    node.type === "client"
      ? "border-primary/20 bg-primary/5"
      : node.type === "spouse"
        ? "border-pink-200 bg-pink-50 dark:border-pink-800 dark:bg-pink-950/20"
        : node.type === "child" || node.type === "beneficiary"
          ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20"
          : "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20";

  return (
    <Card
      className={cn(
        "absolute cursor-pointer border-2 p-3 transition-all hover:shadow-lg",
        colorScheme,
        isSelected && "ring-primary ring-2 ring-offset-2",
        node.coverageGap?.hasGap && "border-amber-300 dark:border-amber-700",
      )}
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
        minHeight: node.height,
      }}
      onClick={onClick}
    >
      {/* Coverage gap indicator */}
      {node.coverageGap?.hasGap && (
        <div className="absolute -top-2 -right-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-amber-500 dark:border-slate-900">
            <AlertTriangle className="h-3 w-3 text-white" />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Icon className="text-muted-foreground h-4 w-4" />
          <span className="truncate text-sm font-semibold">{node.label}</span>
        </div>

        {node.sublabel && (
          <Badge variant="secondary" className="w-fit text-xs">
            {node.sublabel}
          </Badge>
        )}

        {node.assetValue !== undefined && (
          <p className="text-xs font-medium">
            {formatCurrency(node.assetValue)}
          </p>
        )}

        {node.coverageGap?.hasGap && (
          <p className="text-xs text-amber-700 dark:text-amber-300">
            {node.coverageGap.message}
          </p>
        )}
      </div>
    </Card>
  );
}
