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

/** Tamanho de referência do cartão de destaque (todos os registos no ecrã). */
const CARD_WIDTH_DESKTOP = 435;
const CARD_HEIGHT_DESKTOP = 600;
/** Quantidade (px) de cada cartão lateral que fica por detrás do cartão do meio. */
const OVERLAP_INSIDE_PX_DESKTOP = 200;

/** Largura do contentor dos slots para os três cartões caberem sem corte (esquerda visível). */
const CAROUSEL_SLOTS_CONTAINER_WIDTH_DESKTOP = 905;

/** Posição left (px) dos slots em desktop: centro e direita (esquerda = 0). */
const SLOT_CENTER_LEFT_DESKTOP = (CAROUSEL_SLOTS_CONTAINER_WIDTH_DESKTOP - CARD_WIDTH_DESKTOP) / 2;
const SLOT_RIGHT_LEFT_DESKTOP = CAROUSEL_SLOTS_CONTAINER_WIDTH_DESKTOP - CARD_WIDTH_DESKTOP;

/** Mobile (layout novo): altura da region e do contentor, offset dos slots. */
const MOBILE_CAROUSEL_HEIGHT = 520;
const MOBILE_SLOT_OFFSET_PX = 120;
const MOBILE_SLOT_MAX_WIDTH = 320;
const MOBILE_SLOT_MIN_WIDTH = 280;
const MOBILE_CONTAINER_MAX_WIDTH = 430;

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
  scaleDesktop = 1,
  scaleMobile = 1,
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
  scaleDesktop?: number;
  scaleMobile?: number;
}) {
  if (featuredItems.length === 0) return null;

  const CardComponent = getFeaturedPresentationCardComponent(featuredTemplateKey);
  const n = featuredItems.length;
  const [activeIndex, setActiveIndex] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const carouselContainerRef = useRef<HTMLDivElement>(null);
  const contentWrapperRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | null>(null);

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

  useEffect(() => {
    const measure = () => {
      const el = contentWrapperRef.current;
      if (el) setContentHeight(el.offsetHeight);
    };
    const id = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(id);
  }, [isSmallScreen, n]);

  const cardWidth = CARD_WIDTH_DESKTOP;
  const cardHeight = CARD_HEIGHT_DESKTOP;
  const carouselMinHeight = isSmallScreen ? MOBILE_CAROUSEL_HEIGHT : CARD_HEIGHT_DESKTOP;
  const overlapInsidePx = OVERLAP_INSIDE_PX_DESKTOP;
  const leftTranslateX = `calc(-100% + ${CARD_WIDTH_DESKTOP / 2 + overlapInsidePx}px)`;
  const rightTranslateX = `${CARD_WIDTH_DESKTOP / 2 - overlapInsidePx}px`;

  const goPrev = useCallback(() => {
    setActiveIndex((i) => (i - 1 + n) % n);
  }, [n]);

  const goNext = useCallback(() => {
    setActiveIndex((i) => (i + 1) % n);
  }, [n]);

  const prevIndex = (activeIndex - 1 + n) % n;
  const nextIndex = (activeIndex + 1) % n;

  const VERTICAL_SCROLL_THRESHOLD = 30;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current == null || touchStartY.current == null) return;
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const deltaX = endX - touchStartX.current;
      const deltaY = endY - touchStartY.current;
      touchStartX.current = null;
      touchStartY.current = null;

      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > VERTICAL_SCROLL_THRESHOLD) {
        if (!prefersReducedMotion) {
          if (deltaY > 0) goNext();
          else goPrev();
        }
        return;
      }

      if (deltaX < -40) goNext();
      else if (deltaX > 40) goPrev();
    },
    [goPrev, goNext, prefersReducedMotion]
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

  const handleTouchMoveNative = useCallback(
    (e: TouchEvent) => {
      if (prefersReducedMotion || touchStartX.current == null || touchStartY.current == null) return;
      const curX = e.touches[0].clientX;
      const curY = e.touches[0].clientY;
      const deltaX = curX - touchStartX.current;
      const deltaY = curY - touchStartY.current;
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > VERTICAL_SCROLL_THRESHOLD) {
        e.preventDefault();
      }
    },
    [prefersReducedMotion]
  );

  useEffect(() => {
    const el = carouselContainerRef.current;
    if (!el) return;
    el.addEventListener("touchmove", handleTouchMoveNative, { passive: false });
    return () => el.removeEventListener("touchmove", handleTouchMoveNative);
  }, [handleTouchMoveNative]);

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
    const slotWidthStyle: React.CSSProperties = isSmallScreen
      ? { width: "78vw", maxWidth: MOBILE_SLOT_MAX_WIDTH, minWidth: MOBILE_SLOT_MIN_WIDTH }
      : { width: cardWidth };
    const wrapperSize: React.CSSProperties = isSmallScreen
      ? { width: "100%", aspectRatio: "435/600" }
      : { width: "100%", height: cardHeight };
    const slotLeft: string | number = isSmallScreen
      ? "50%"
      : slot === "left"
        ? 0
        : slot === "center"
          ? SLOT_CENTER_LEFT_DESKTOP
          : SLOT_RIGHT_LEFT_DESKTOP;
    const slotTransform = isSmallScreen
      ? slot === "left"
        ? `translateX(calc(-50% - ${MOBILE_SLOT_OFFSET_PX}px))`
        : slot === "center"
          ? "translateX(-50%)"
          : `translateX(calc(-50% + ${MOBILE_SLOT_OFFSET_PX}px))`
      : undefined;
    const slotTransformOrigin =
      slot === "left" ? "right center" : slot === "right" ? "left center" : "center center";

    return (
      <div
        key={`${slot}-${index}`}
        className={isSmallScreen ? "rounded-2xl" : "flex-shrink-0 rounded-2xl overflow-hidden"}
        style={{
          position: "absolute",
          left: slotLeft,
          top: 0,
          ...slotWidthStyle,
          ...(slotTransform !== undefined && { transform: slotTransform }),
          transformOrigin: slotTransformOrigin,
          zIndex: isCenter ? 2 : 1,
        }}
      >
        <div
          className={isSmallScreen ? "w-full rounded-2xl overflow-hidden" : "w-full rounded-2xl overflow-hidden"}
          style={wrapperSize}
        >
          <CardComponent
            item={item}
            categoryName={categoryName}
            currencyCode={currencyCode}
            imageSource={imageSource}
            layoutDefinition={featuredLayoutDefinition ?? null}
            {...(isSmallScreen && { articleMinHeight: "100%" })}
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
  const slotsContainerWidth = isSmallScreen
    ? "min(905px, 100vw)"
    : CAROUSEL_SLOTS_CONTAINER_WIDTH_DESKTOP;
  const rawScale = isSmallScreen ? (scaleMobile ?? 1) : (scaleDesktop ?? 1);
  const scale = isSmallScreen ? 1 : (Number.isFinite(rawScale) && rawScale >= 0.75 && rawScale <= 1 ? rawScale : 1);
  const sectionHeightStyle =
    scale < 1 && contentHeight != null
      ? { height: contentHeight * scale, overflow: "hidden" as const }
      : undefined;
  const mergedSectionStyle = sectionHeightStyle
    ? { ...sectionStyle, ...sectionHeightStyle }
    : sectionStyle;
  return (
    <section
      className="relative z-10 overflow-visible flex justify-center"
      aria-label="Destaques"
      style={mergedSectionStyle}
    >
      {/* Bloco interno escalado e centralizado */}
      <div
        className="overflow-visible inline-block w-full max-w-full"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: scale < 1 ? "top center" : "center center",
        }}
      >
      <div ref={contentWrapperRef} className="overflow-visible w-full">
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
        <div className="relative group/carousel w-full flex justify-center overflow-visible">
          <div
            ref={carouselContainerRef}
            tabIndex={0}
            role="region"
            aria-label="Destaques"
            className={isSmallScreen ? "relative w-full flex justify-center px-0 sm:px-2" : "relative w-full flex justify-center px-4"}
            style={{
              minHeight: isSmallScreen ? 360 : carouselMinHeight,
              overflow: "visible",
            }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onKeyDown={handleKeyDown}
          >
            {isSmallScreen ? (
              <div
                className="relative overflow-visible mx-auto"
                style={{
                  width: "100%",
                  maxWidth: MOBILE_CONTAINER_MAX_WIDTH,
                  overflow: "visible",
                }}
              >
                <div
                  aria-hidden
                  style={{
                    width: "78vw",
                    maxWidth: MOBILE_SLOT_MAX_WIDTH,
                    minWidth: MOBILE_SLOT_MIN_WIDTH,
                    aspectRatio: "435/600",
                  }}
                />
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
            ) : (
              <div
                className="relative overflow-visible flex-shrink-0 mx-auto"
                style={{
                  width: slotsContainerWidth,
                  minWidth: typeof slotsContainerWidth === "number" ? slotsContainerWidth : undefined,
                  maxWidth: "100%",
                  minHeight: carouselMinHeight,
                }}
              >
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
            )}
          </div>
        </div>

        {/* Indicadores: área de toque ≥44px (WCAG 2.5.5) */}
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
                className="min-w-[22px] min-h-[22px] flex items-center justify-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--menu-primary)]"
              >
                <span
                  className="rounded-full block flex-shrink-0 border-2 border-transparent"
                  style={{
                    width: index === activeIndex ? 6 : 4,
                    height: index === activeIndex ? 6 : 4,
                    backgroundColor: index === activeIndex ? "var(--menu-primary)" : "transparent",
                    borderColor: index === activeIndex ? "var(--menu-primary)" : "rgba(0,0,0,0.2)",
                  }}
                  aria-hidden
                />
              </button>
            ))}
          </div>
        )}
      </div>
      </div>
    </section>
  );
}
