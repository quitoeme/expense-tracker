export interface Profile {
  id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  currency: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: "admin" | "member";
  joined_at: string;
  profiles?: Profile;
}

export interface Category {
  id: string;
  group_id: string;
  name: string;
  icon: string | null;
  color: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  group_id: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  category_id: string | null;
  paid_by: string;
  split_method: "equal" | "percentage" | "fixed";
  created_by: string;
  created_at: string;
  updated_at: string;
  categories?: Category | null;
  payer?: Profile;
  expense_splits?: ExpenseSplit[];
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  user_id: string;
  amount: number;
  percentage: number | null;
  is_settled: boolean;
  profiles?: Profile;
}

export type Granularity = "daily" | "weekly" | "monthly";

export interface BalanceEntry {
  from_user: Profile;
  to_user: Profile;
  amount: number;
}

export interface SummaryBucket {
  label: string;
  total: number;
  byCategory: Record<string, { amount: number; color: string }>;
  expenses: Expense[];
}
