import { getCategories } from "@/actions/categories";
import { CategoryManager } from "@/components/categories/category-manager";

export default async function CategoriesPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const categories = await getCategories(groupId);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Categorías</h2>
      <CategoryManager groupId={groupId} categories={categories} />
    </div>
  );
}
