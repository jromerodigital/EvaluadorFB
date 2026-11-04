import React, { useState } from 'react';

interface FonbienesLogoProps {
  theme: 'light' | 'dark';
  className?: string;
}

export const FonbienesLogo: React.FC<FonbienesLogoProps> = ({
  theme,
  className = 'h-9 sm:h-10 w-auto',
}) => {
  const [imgError, setImgError] = useState(false);
  const logoSrc = `${import.meta.env.BASE_URL}LogoFonbienes.png`;

  // In light mode, render the captured official LogoFonbienes.png from https://www.fonbienes.com.pe/inicio
  if (theme === 'light' && !imgError) {
    return (
      <img
        src={logoSrc}
        alt="FonBienes Perú EAFC S.A."
        onError={() => setImgError(true)}
        className={`${className} object-contain select-none transition-all duration-300`}
      />
    );
  }

  // Adaptive Vector SVG of the official Fonbienes Perú EAFC S.A. logo for Dark Mode (or fallback)
  const fonColor = theme === 'dark' ? '#FFFFFF' : '#004E89';
  const bienesColor = theme === 'dark' ? '#34D399' : '#007A3D';
  const subColor = theme === 'dark' ? '#E2E8F0' : '#004E89';
  const gradStart = theme === 'dark' ? '#38BDF8' : '#004E89';
  const gradEnd = theme === 'dark' ? '#34D399' : '#007A3D';

  return (
    <svg
      viewBox="0 0 380 112"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} select-none transition-all duration-300`}
      role="img"
      aria-label="FonBienes Perú EAFC S.A."
    >
      <defs>
        <linearGradient id="fbTopBarGrad" x1="0" y1="0" x2="356" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={gradStart} />
          <stop offset="52%" stopColor={bienesColor} />
          <stop offset="100%" stopColor={gradEnd} />
        </linearGradient>
      </defs>

      {/* Top Institutional Gradient Bar */}
      <rect x="2" y="4" width="352" height="15" rx="1.5" fill="url(#fbTopBarGrad)" />

      {/* Registered Trademark Symbol ® */}
      <circle cx="368" cy="11.5" r="8" stroke={bienesColor} strokeWidth="1.6" />
      <text
        x="368"
        y="15"
        textAnchor="middle"
        fill={bienesColor}
        fontSize="10"
        fontWeight="700"
        fontFamily="Inter, Arial, sans-serif"
      >
        R
      </text>

      {/* Main Wordmark: "Fon" + "bienes" */}
      <text
        x="0"
        y="82"
        fontFamily="Inter, -apple-system, BlinkMacSystemFont, Arial, sans-serif"
        fontWeight="800"
        fontSize="74"
        letterSpacing="-2.2"
      >
        <tspan fill={fonColor}>Fon</tspan>
        <tspan fill={bienesColor}>bienes</tspan>
      </text>

      {/* Subtitle: "Perú EAFC S.A." */}
      <text
        x="2"
        y="108"
        fill={subColor}
        fontFamily="Inter, -apple-system, BlinkMacSystemFont, Arial, sans-serif"
        fontWeight="800"
        fontSize="21"
        letterSpacing="1.2"
      >
        Perú EAFC S.A.
      </text>
    </svg>
  );
};
