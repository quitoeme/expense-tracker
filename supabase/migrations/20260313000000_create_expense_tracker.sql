-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  email       TEXT NOT NULL,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- GROUPS
-- ============================================================
CREATE TABLE groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  currency    TEXT NOT NULL DEFAULT 'ARS',
  created_by  UUID NOT NULL REFERENCES profiles(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- GROUP_MEMBERS
-- ============================================================
CREATE TABLE group_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- ============================================================
-- CATEGORIES (per group, customizable)
-- ============================================================
CREATE TABLE categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  icon       TEXT,
  color      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, name)
);

-- ============================================================
-- EXPENSES
-- ============================================================
CREATE TABLE expenses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id     UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  description  TEXT NOT NULL,
  amount       NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency     TEXT NOT NULL DEFAULT 'ARS',
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  category_id  UUID REFERENCES categories(id) ON DELETE SET NULL,
  paid_by      UUID NOT NULL REFERENCES profiles(id),
  split_method TEXT NOT NULL CHECK (split_method IN ('equal', 'percentage', 'fixed')),
  created_by   UUID NOT NULL REFERENCES profiles(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EXPENSE_SPLITS
-- ============================================================
CREATE TABLE expense_splits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id  UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id),
  amount      NUMERIC(12,2) NOT NULL,
  percentage  NUMERIC(5,2),
  is_settled  BOOLEAN DEFAULT FALSE,
  UNIQUE(expense_id, user_id)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_group_members_user ON group_members(user_id);
CREATE INDEX idx_expenses_group ON expenses(group_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_paid_by ON expenses(paid_by);
CREATE INDEX idx_expenses_category ON expenses(category_id);
CREATE INDEX idx_expense_splits_expense ON expense_splits(expense_id);
CREATE INDEX idx_expense_splits_user ON expense_splits(user_id);
CREATE INDEX idx_categories_group ON categories(group_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- SEED DEFAULT CATEGORIES
-- ============================================================
CREATE OR REPLACE FUNCTION seed_default_categories(p_group_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO categories (group_id, name, icon, color) VALUES
    (p_group_id, 'Comida', 'utensils', '#f97316'),
    (p_group_id, 'Transporte', 'car', '#3b82f6'),
    (p_group_id, 'Alojamiento', 'home', '#8b5cf6'),
    (p_group_id, 'Entretenimiento', 'music', '#ec4899'),
    (p_group_id, 'Compras', 'shopping-bag', '#14b8a6'),
    (p_group_id, 'Servicios', 'zap', '#eab308'),
    (p_group_id, 'Otros', 'more-horizontal', '#6b7280');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ============================================================
-- HELPER FUNCTION (SECURITY DEFINER - bypasses RLS)
-- ============================================================
CREATE OR REPLACE FUNCTION is_group_creator(p_group_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM groups WHERE id = p_group_id AND created_by = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ROW LEVEL SECURITY
-- ============================================================

-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by authenticated users"
  ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Groups
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Group members can view groups"
  ON groups FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM group_members WHERE group_members.group_id = id AND group_members.user_id = auth.uid()
  ));
CREATE POLICY "Authenticated users can create groups"
  ON groups FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Group admins can update groups"
  ON groups FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM group_members WHERE group_members.group_id = id AND group_members.user_id = auth.uid() AND group_members.role = 'admin'
  ));
CREATE POLICY "Group admins can delete groups"
  ON groups FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM group_members WHERE group_members.group_id = id AND group_members.user_id = auth.uid() AND group_members.role = 'admin'
  ));

-- Group members
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Group members can view members"
  ON group_members FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid()
  ));
CREATE POLICY "Authenticated users can insert group members"
ON group_members FOR INSERT TO authenticated
WITH CHECK (
  -- User is an existing admin of the group
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
  )
  OR
  -- User is adding themselves as the group creator (uses SECURITY DEFINER to bypass RLS)
  (
    group_members.user_id = auth.uid()
    AND is_group_creator(group_members.group_id)
  )
)

-- Categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Group members can view categories"
  ON categories FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM group_members WHERE group_members.group_id = categories.group_id AND group_members.user_id = auth.uid()
  ));
CREATE POLICY "Group members can insert categories"
  ON categories FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM group_members WHERE group_members.group_id = categories.group_id AND group_members.user_id = auth.uid()
  ));
CREATE POLICY "Group members can update categories"
  ON categories FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM group_members WHERE group_members.group_id = categories.group_id AND group_members.user_id = auth.uid()
  ));
CREATE POLICY "Group members can delete categories"
  ON categories FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM group_members WHERE group_members.group_id = categories.group_id AND group_members.user_id = auth.uid()
  ));

-- Expenses
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Group members can view expenses"
  ON expenses FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM group_members WHERE group_members.group_id = expenses.group_id AND group_members.user_id = auth.uid()
  ));
CREATE POLICY "Group members can create expenses"
  ON expenses FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM group_members WHERE group_members.group_id = expenses.group_id AND group_members.user_id = auth.uid()
  ));
CREATE POLICY "Expense creator can update"
  ON expenses FOR UPDATE TO authenticated
  USING (created_by = auth.uid());
CREATE POLICY "Expense creator can delete"
  ON expenses FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- Expense splits
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Group members can view splits"
  ON expense_splits FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM expenses e
    JOIN group_members gm ON gm.group_id = e.group_id
    WHERE e.id = expense_splits.expense_id AND gm.user_id = auth.uid()
  ));
CREATE POLICY "Group members can insert splits"
  ON expense_splits FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM expenses e
    JOIN group_members gm ON gm.group_id = e.group_id
    WHERE e.id = expense_splits.expense_id AND gm.user_id = auth.uid()
  ));
CREATE POLICY "Group members can update splits"
  ON expense_splits FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM expenses e
    JOIN group_members gm ON gm.group_id = e.group_id
    WHERE e.id = expense_splits.expense_id AND gm.user_id = auth.uid()
  ));
CREATE POLICY "Group members can delete splits"
  ON expense_splits FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM expenses e
    JOIN group_members gm ON gm.group_id = e.group_id
    WHERE e.id = expense_splits.expense_id AND gm.user_id = auth.uid()
  ));
