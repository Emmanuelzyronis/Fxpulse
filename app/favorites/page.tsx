import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { FavoritesList } from "@/components/favorites/FavoritesList";

export const metadata: Metadata = { title: "Favorites" };

export default function FavoritesPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Favorites"
        description="The pairs you watch most, pinned for one tap."
      />
      <FavoritesList />
    </div>
  );
}
