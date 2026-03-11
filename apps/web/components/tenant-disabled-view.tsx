"use client";

import styles from "./tenant-disabled-view.module.css";

/**
 * Vista quando o tenant está desactivado: vídeo de fundo (responsivo) e faixa com texto
 * "MENU TEMPORÁRIAMENTE DESACTIVADO" a preto sobre fundo branco, a correr da direita para a esquerda.
 * Vídeos esperados em public/videos/: bwb_menu_online_small.mp4 (mobile), bwb_menu_online_larger.mp4 (tablet/desktop).
 */

const VIDEO_SMALL = "/videos/bwb_menu_online_small.mp4";
const VIDEO_LARGE = "/videos/bwb_menu_online_larger.mp4";

export function TenantDisabledView() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black">
      {/* Vídeo: mobile mostra small, md+ mostra larger */}
      <div className="absolute inset-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover md:hidden"
          aria-hidden
        >
          <source src={VIDEO_SMALL} type="video/mp4" />
        </video>
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 hidden h-full w-full object-cover md:block"
          aria-hidden
        >
          <source src={VIDEO_LARGE} type="video/mp4" />
        </video>
      </div>

      {/* Faixa com texto a correr: fundo branco, texto preto, direita → esquerda */}
      <div className="absolute bottom-0 left-0 right-0 z-10 overflow-hidden bg-white py-3">
        <div className={`flex w-max ${styles.marqueeR2L}`}>
          <span className="whitespace-nowrap px-8 text-lg font-semibold text-black">
            MENU TEMPORÁRIAMENTE DESACTIVADO
          </span>
          <span className="whitespace-nowrap px-8 text-lg font-semibold text-black" aria-hidden>
            MENU TEMPORÁRIAMENTE DESACTIVADO
          </span>
          <span className="whitespace-nowrap px-8 text-lg font-semibold text-black" aria-hidden>
            MENU TEMPORÁRIAMENTE DESACTIVADO
          </span>
        </div>
      </div>
    </div>
  );
}
