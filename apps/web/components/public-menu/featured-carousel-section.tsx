"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import type { PublicMenuItem } from "@/lib/supabase";
import type { LayoutDefinition } from "@/lib/presentation-templates";
import { getFeaturedPresentationCardComponent } from "@/lib/presentation-templates";
import { buildBackgroundStyle } from "@/lib/parse-css-declarations";

export type FeaturedItemWithCategory = {
  item: PublicMenuItem;
  categoryName?: string;
};

const CENTER_WIDTH_DESKTOP = "min(240px, 63.75vw)";
const CENTER_WIDTH_MOBILE = "min(165px, 46.5vw)";
const CAROUSEL_MIN_HEIGHT_DESKTOP = 378;
const CAROUSEL_MIN_HEIGHT_MOBILE = 270;
const SIDE_SCALE_DESKTOP = 0.66;
const SIDE_SCALE_MOBILE = 0.675;
const OVERLAP_PX_DESKTOP = 22;
const OVERLAP_PX_MOBILE = 15;

/** Proporção do card no carrossel (largura : altura) para evitar esticamento vertical. */
const CAROUSEL_CARD_ASPECT_RATIO = "3/4";

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
  carouselBackgroundColor,
  carouselBackgroundCss,
  dotsBackgroundColor,
  dotsBackgroundCss,
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
  carouselBackgroundColor?: string;
  carouselBackgroundCss?: string;
  dotsBackgroundColor?: string;
  dotsBackgroundCss?: string;
}) {
  if (featuredItems.length === 0) return null;

  const CardComponent = getFeaturedPresentationCardComponent(featuredTemplateKey);
  const n = featuredItems.length;
  const [activeIndex, setActiveIndex] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const carouselContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = () => setPrefersReducedMotion(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const [isSmallScreen, setIsSmallScreen] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsSmallScreen(mq.matches);
    const handler = () => setIsSmallScreen(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const centerWidth = isSmallScreen ? CENTER_WIDTH_MOBILE : CENTER_WIDTH_DESKTOP;
  const carouselMinHeight = isSmallScreen ? CAROUSEL_MIN_HEIGHT_MOBILE : CAROUSEL_MIN_HEIGHT_DESKTOP;
  const sideScale = isSmallScreen ? SIDE_SCALE_MOBILE : SIDE_SCALE_DESKTOP;
  const overlapPx = isSmallScreen ? OVERLAP_PX_MOBILE : OVERLAP_PX_DESKTOP;

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

  const handleWheelNative = useCallback(
    (e: WheelEvent) => {
      if (e.deltaY === 0) return;
      e.preventDefault();
      if (e.deltaY > 0) goNext();
      else goPrev();
    },
    [goPrev, goNext]
  );

  useEffect(() => {
    const el = carouselContainerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheelNative, { passive: false });
    return () => el.removeEventListener("wheel", handleWheelNative);
  }, [handleWheelNative]);

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
        <div
          className="w-full overflow-hidden rounded-2xl"
          style={{ aspectRatio: CAROUSEL_CARD_ASPECT_RATIO }}
        >
          <CardComponent
            item={item}
            categoryName={categoryName}
            currencyCode={currencyCode}
            imageSource={imageSource}
            layoutDefinition={featuredLayoutDefinition ?? null}
          />
        </div>
      </div>
    );
  };

  const alignClass = titleAlign === "left" ? "text-left" : titleAlign === "right" ? "text-right" : "text-center";
  const carouselSectionStyle = buildBackgroundStyle(carouselBackgroundColor, carouselBackgroundCss, {});
  const dotsContainerStyle = buildBackgroundStyle(dotsBackgroundColor, dotsBackgroundCss, {});
  const sectionStyle =
    Object.keys(carouselSectionStyle).length > 0 ? carouselSectionStyle : undefined;
  return (
    <>
      <section
        className="relative z-10 overflow-visible"
        aria-label="Destaques"
        style={sectionStyle}
      >
        <h2
          className={`section-title mt-0 ${alignClass}`}
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
            ref={carouselContainerRef}
            tabIndex={0}
            role="region"
            aria-label="Destaques"
            className="relative w-full flex justify-center overflow-x-visible overflow-y-visible px-4"
            style={{ minHeight: `${carouselMinHeight}px` }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
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
      </section>

      {/* Indicadores: faixa por baixo do bloco do carrossel; área de toque ≥44px (WCAG 2.5.5) */}
      {n >= 1 && (
        <div
          className="flex justify-center gap-1.5 mt-3 mb-10"
          role="tablist"
          aria-label="Posição no carrossel"
          style={Object.keys(dotsContainerStyle).length > 0 ? dotsContainerStyle : undefined}
        >
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
    </>
  );
}
