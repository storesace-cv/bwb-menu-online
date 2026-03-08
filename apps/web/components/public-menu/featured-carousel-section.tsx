"use client";

import type { PublicMenuItem } from "@/lib/supabase";
import { getFeaturedPresentationCardComponent } from "@/lib/presentation-templates";

export type FeaturedItemWithCategory = {
  item: PublicMenuItem;
  categoryName?: string;
};

export function FeaturedCarouselSection({
  featuredItems,
  featuredSectionLabel,
  featuredTemplateKey,
  currencyCode,
}: {
  featuredItems: FeaturedItemWithCategory[];
  featuredSectionLabel: string;
  featuredTemplateKey: string;
  featuredLayoutDefinition?: unknown;
  currencyCode: string;
}) {
  if (featuredItems.length === 0) return null;

  const CardComponent = getFeaturedPresentationCardComponent(featuredTemplateKey);

  return (
    <section className="mb-8">
      <h2
        className="text-xl font-semibold mb-4 pb-2 border-b-2"
        style={{ borderColor: "var(--menu-primary)", color: "var(--menu-primary)" }}
      >
        {featuredSectionLabel}
      </h2>
      <div
        className="flex overflow-x-auto gap-4 pb-2 snap-x snap-mandatory scroll-smooth"
        style={{ scrollbarWidth: "thin" }}
      >
        {featuredItems.map(({ item, categoryName }) => (
          <div
            key={item.id}
            className="flex-shrink-0 w-[min(85vw,320px)] sm:w-[min(45vw,360px)] lg:w-[min(32vw,380px)] snap-center"
          >
            <CardComponent
              item={item}
              categoryName={categoryName}
              currencyCode={currencyCode}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
