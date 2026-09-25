import React from 'react';

export const IRONVALLEY_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 160" width="100%" height="100%" style="display:block;">
  <!-- Outer Gold Border -->
  <rect x="3" y="3" width="134" height="154" rx="8" ry="8" fill="#ffffff" stroke="#c9a832" stroke-width="3.5"/>
  <rect x="7" y="7" width="126" height="146" rx="6" ry="6" fill="#ffffff" stroke="#2e8540" stroke-width="1.5"/>

  <!-- Inner Crest Circle -->
  <circle cx="70" cy="54" r="34" fill="#f4faf4" stroke="#c9a832" stroke-width="2"/>
  
  <!-- Wheat / Leaves Wreath -->
  <path d="M 46 64 C 42 50, 48 38, 58 32 C 54 40, 56 52, 62 60" fill="none" stroke="#2e8540" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M 94 64 C 98 50, 92 38, 82 32 C 86 40, 84 52, 78 60" fill="none" stroke="#2e8540" stroke-width="2.5" stroke-linecap="round"/>
  
  <!-- Wheat Grains / Gold Accent -->
  <circle cx="51" cy="42" r="3" fill="#e5b824"/>
  <circle cx="48" cy="50" r="3" fill="#e5b824"/>
  <circle cx="89" cy="42" r="3" fill="#e5b824"/>
  <circle cx="92" cy="50" r="3" fill="#e5b824"/>
  <circle cx="70" cy="27" r="3" fill="#e5b824"/>

  <!-- Central Mallet / Hammer / Sprout symbol -->
  <rect x="52" y="38" width="36" height="13" rx="2" fill="#2e8540" stroke="#1d5c2a" stroke-width="1"/>
  <rect x="66" y="51" width="8" height="24" rx="2" fill="#e5b824" stroke="#c9a832" stroke-width="1"/>
  <line x1="58" y1="44.5" x2="82" y2="44.5" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/>
  <circle cx="70" cy="63" r="2.5" fill="#2e8540"/>

  <!-- IRONVALLEY Yellow Banner -->
  <rect x="12" y="98" width="116" height="24" fill="#eed542" rx="2"/>
  <text x="70" y="115" font-family="'Helvetica Neue', Arial, sans-serif" font-size="13" font-weight="900" fill="#236830" text-anchor="middle" letter-spacing="1">IRONVALLEY</text>

  <!-- AGRONOMY Green Banner -->
  <rect x="12" y="123" width="116" height="25" fill="#2e8540" rx="2"/>
  <text x="70" y="141" font-family="'Helvetica Neue', Arial, sans-serif" font-size="13.5" font-weight="900" fill="#eed542" text-anchor="middle" letter-spacing="1.5">AGRONOMY</text>
</svg>`;

export const IRONVALLEY_LOGO_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(IRONVALLEY_LOGO_SVG)}`;

export const IronvalleyLogo: React.FC<{
  width?: number;
  height?: number;
  size?: number;
  className?: string;
}> = ({
  width,
  height,
  size,
  className = '',
}) => {
  const finalWidth = size || width || 95;
  const finalHeight = size ? Math.round(size * (160 / 140)) : (height || Math.round(finalWidth * (160 / 140)));

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: finalWidth,
        height: finalHeight,
        overflow: 'hidden',
      }}
      dangerouslySetInnerHTML={{ __html: IRONVALLEY_LOGO_SVG }}
    />
  );
};

export default IronvalleyLogo;
