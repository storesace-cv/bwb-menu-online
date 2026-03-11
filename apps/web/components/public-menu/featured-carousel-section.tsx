"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import type { PublicMenuItem } from "@/lib/supabase";
import type { LayoutDefinition } from "@/lib/presentation-templates";
import { getFeaturedPresentationCardComponent } from "@/lib/presentation-templates";

export type FeaturedItemWithCategory = {
  item: PublicMenuItem;
  categoryName?: string;
};

const CENTER_WIDTH_DESKTOP = "min(320px, 85vw)";
const CENTER_WIDTH_MOBILE = "min(220px, 62vw)";
const CAROUSEL_MIN_HEIGHT_DESKTOP = 504;
const CAROUSEL_MIN_HEIGHT_MOBILE = 360;
const SIDE_SCALE_DESKTOP = 0.88;
const SIDE_SCALE_MOBILE = 0.9;
const OVERLAP_PX_DESKTOP = 30;
const OVERLAP_PX_MOBILE = 20;

export function FeaturedCarouselSection({
  featuredItems,
  featuredSectionLabel,
  featuredTemplateKey,
  featuredLayoutDefinition,
  currencyCode,
  imageSource,
  titleAlign = "center",
  titleMarginBottom = "20",
  titlePaddingTop = "20",
}: {
  featuredItems: FeaturedItemWithCategory[];
  featuredSectionLabel: string;
  featuredTemplateKey: string;
  featuredLayoutDefinition?: LayoutDefinition | null;
  currencyCode: string;
  imageSource?: string;
  titleAlign?: string;
  titleMarginBottom?: string;
  titlePaddingTop?: string;
}) {
  if (featuredItems.length === 0) return null;

  const CardComponent = getFeaturedPresentationCardComponent(featuredTemplateKey);
  const n = featuredItems.length;
  const [activeIndex, setActiveIndex] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = () => setPrefersReducedMotion(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const goPrev = useCallback(() => {
    setActiveIndex((i) => (i - 1 + n) % n);
  }, [n]);

  const goNext = useCallback(() => {
    setActiveIndex((i) => (i + 1) % n);
  }, [n]);

  const prevIndex = (activeIndex - 1 + n) % n;
  const nextIndex = (activeIndex + 1) % n;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current == null) return;
      const endX = e.changedTouches[0].clientX;
      const deltaX = endX - touchStartX.current;
      touchStartX.current = null;
      if (deltaX < -40) goNext();
      else if (deltaX > 40) goPrev();
    },
    [goPrev, goNext]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      if (e.deltaY === 0) return;
      if (e.deltaY > 0) goNext();
      else goPrev();
      e.preventDefault();
    },
    [goPrev, goNext]
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

  const renderSlot = (index: number, slot: "left" | "center" | "right") => {
    const { item, categoryName } = featuredItems[index];
    const isCenter = slot === "center";
    return (
      <div
        key={`${slot}-${index}`}
        className="flex-shrink-0 rounded-2xl overflow-hidden"
        style={{
          position: "absolute",
          left: "50%",
          top: 0,
          width: centerWidth,
          maxWidth: isSmallScreen ? "62vw" : "85vw",
          transform: isCenter
            ? "translateX(-50%)"
            : slot === "left"
              ? `translateX(calc(-100% + ${overlapPx}px)) scale(${sideScale})`
              : `translateX(${overlapPx}px) scale(${sideScale})`,
          transformOrigin: slot === "left" ? "right center" : slot === "right" ? "left center" : "center center",
          zIndex: isCenter ? 2 : 1,
        }}
      >
        <CardComponent
          item={item}
          categoryName={categoryName}
          currencyCode={currencyCode}
          imageSource={imageSource}
          layoutDefinition={featuredLayoutDefinition ?? null}
        />
      </div>
    );
  };

  const alignClass = titleAlign === "left" ? "text-left" : titleAlign === "right" ? "text-right" : "text-center";
  return (
    <section className="relative z-10 mb-10 overflow-visible" aria-label="Destaques">
      <h2
        className={`mt-0 title ${alignClass}`}
        style={{
          marginBottom: `${titleMarginBottom}px`,
          paddingTop: `${titlePaddingTop}px`,
          color: "var(--menu-primary)",
        }}
      >
        {featuredSectionLabel}
      </h2>
      <div className="relative group/carousel flex justify-center">
        <div
          tabIndex={0}
          role="region"
          aria-label="Destaques"
          className="relative w-full flex justify-center overflow-x-visible overflow-y-visible px-4"
          style={{ minHeight: `${carouselMinHeight}px` }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
          onKeyDown={handleKeyDown}
        >
          <div className="relative overflow-visible" style={{ width: centerWidth, maxWidth: isSmallScreen ? "62vw" : "85vw", minHeight: `${carouselMinHeight}px` }}>
            {n === 1 ? (
              renderSlot(0, "center")
            ) : (
              <>
                {renderSlot(prevIndex, "left")}
                {renderSlot(activeIndex, "center")}
                {renderSlot(nextIndex, "right")}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Indicadores: um círculo por registo, destacar o activo; área de toque ≥44px (WCAG 2.5.5) */}
      {n >= 1 && (
        <div className="flex justify-center gap-1.5 mt-3" role="tablist" aria-label="Posição no carrossel">
          {featuredItems.map((_, index) => (
            <button
              key={index}
              type="button"
              role="tab"
              aria-label={`Ir para destaque ${index + 1}`}
              aria-selected={index === activeIndex}
              onClick={() => setActiveIndex(index)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--menu-primary)]"
            >
              <span
                className="rounded-full block flex-shrink-0 border-2 border-transparent"
                style={{
                  width: index === activeIndex ? 12 : 8,
                  height: index === activeIndex ? 12 : 8,
                  backgroundColor: index === activeIndex ? "var(--menu-primary)" : "transparent",
                  borderColor: index === activeIndex ? "var(--menu-primary)" : "rgba(0,0,0,0.2)",
                }}
                aria-hidden
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
