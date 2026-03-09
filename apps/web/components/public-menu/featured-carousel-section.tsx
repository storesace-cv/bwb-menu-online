"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import type { PublicMenuItem } from "@/lib/supabase";
import type { LayoutDefinition } from "@/lib/presentation-templates";
import { getFeaturedPresentationCardComponent } from "@/lib/presentation-templates";

export type FeaturedItemWithCategory = {
  item: PublicMenuItem;
  categoryName?: string;
};

const GAP_PX = 14;
const CARD_WIDTH_PEEK = "min(280px, 78vw)";

function ChevronLeft({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}
function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export function FeaturedCarouselSection({
  featuredItems,
  featuredSectionLabel,
  featuredTemplateKey,
  featuredLayoutDefinition,
  currencyCode,
  imageSource,
}: {
  featuredItems: FeaturedItemWithCategory[];
  featuredSectionLabel: string;
  featuredTemplateKey: string;
  featuredLayoutDefinition?: LayoutDefinition | null;
  currencyCode: string;
  imageSource?: string;
}) {
  if (featuredItems.length === 0) return null;

  const CardComponent = getFeaturedPresentationCardComponent(featuredTemplateKey);
  const carouselRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = () => setPrefersReducedMotion(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Active index a partir do scroll: item alinhado ao snap
  useEffect(() => {
    const el = carouselRef.current;
    if (!el || featuredItems.length === 0) return;
    const onScroll = () => {
      const first = cardRefs.current[0];
      const step = first ? first.offsetWidth + GAP_PX : 280 + GAP_PX;
      const index = Math.round(el.scrollLeft / step);
      setActiveIndex(Math.min(Math.max(0, index), featuredItems.length - 1));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, [featuredItems.length]);

  const scrollBehavior = prefersReducedMotion ? "auto" : "smooth";

  const goPrev = useCallback(() => {
    const el = carouselRef.current;
    if (!el) return;
    const first = cardRefs.current[0];
    const step = first ? first.offsetWidth + GAP_PX : 320 + GAP_PX;
    el.scrollBy({ left: -step, behavior: scrollBehavior });
  }, [scrollBehavior]);

  const goNext = useCallback(() => {
    const el = carouselRef.current;
    if (!el) return;
    const first = cardRefs.current[0];
    const step = first ? first.offsetWidth + GAP_PX : 320 + GAP_PX;
    el.scrollBy({ left: step, behavior: scrollBehavior });
  }, [scrollBehavior]);

  // Converte wheel vertical em scroll horizontal; nas bordas não previne default para permitir scroll da página
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      const el = carouselRef.current;
      if (!el || e.deltaY === 0) return;
      const { scrollLeft, scrollWidth, clientWidth } = el;
      const atStart = scrollLeft <= 0;
      const atEnd = scrollLeft >= scrollWidth - clientWidth - 1;
      if ((atStart && e.deltaY < 0) || (atEnd && e.deltaY > 0)) return;
      e.preventDefault();
      el.scrollBy({ left: e.deltaY, behavior: "auto" });
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    },
    [goPrev, goNext]
  );

  const total = featuredItems.length;
  const progressPercent = total <= 1 ? 100 : (activeIndex / (total - 1)) * 100;

  return (
    <section className="mb-8" aria-label="Destaques">
      <h2
        className="text-xl font-semibold mb-4 pb-2 border-b-2"
        style={{ borderColor: "var(--menu-primary)", color: "var(--menu-primary)" }}
      >
        {featuredSectionLabel}
      </h2>
      <div className="relative group/carousel">
        {/* Setas: desktop only, discretas (opacity no hover/focus-within) */}
        <button
          type="button"
          onClick={goPrev}
          aria-label="Anterior"
          className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center rounded-full bg-black/20 hover:bg-black/30 text-white border border-white/20 opacity-0 group-hover/carousel:opacity-100 group-focus-within/carousel:opacity-100 transition-opacity focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--menu-primary)]"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={goNext}
          aria-label="Seguinte"
          className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center rounded-full bg-black/20 hover:bg-black/30 text-white border border-white/20 opacity-0 group-hover/carousel:opacity-100 group-focus-within/carousel:opacity-100 transition-opacity focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--menu-primary)]"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <div
          ref={carouselRef}
          tabIndex={0}
          role="region"
          aria-label="Destaques"
          className="flex gap-3.5 overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth pb-3 px-4 featured-carousel-scroll"
          style={{ WebkitOverflowScrolling: "touch" }}
          onWheel={handleWheel}
          onKeyDown={handleKeyDown}
        >
          {featuredItems.map(({ item, categoryName }, index) => (
            <div
              key={item.id}
              ref={(r) => {
                cardRefs.current[index] = r;
              }}
              className="flex-shrink-0 flex-[0_0_auto] snap-start rounded-2xl"
              style={{ width: CARD_WIDTH_PEEK }}
            >
              <CardComponent
                item={item}
                categoryName={categoryName}
                currencyCode={currencyCode}
                imageSource={imageSource}
                layoutDefinition={featuredLayoutDefinition ?? null}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Indicador: progress bar fina estilo Apple */}
      {total > 1 && (
        <div className="mt-3 px-4">
          <div
            className="h-0.5 w-full rounded-full opacity-25"
            style={{ backgroundColor: "var(--menu-primary)" }}
            role="presentation"
          >
            <div
              className="h-full rounded-full transition-[width] duration-300 ease-out"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: "var(--menu-primary)",
              }}
            />
          </div>
        </div>
      )}
    </section>
  );
}
