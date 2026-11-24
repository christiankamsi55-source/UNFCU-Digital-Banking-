import React from 'react';
import unfcuExactLogo from '../../assets/images/unfcu_logo.png';

interface UnfcuLogoProps {
  variant?: 'navy' | 'white' | 'badge';
  size?: number;
  className?: string;
}

/**
 * Exact UNFCU (United Nations Federal Credit Union) Brand Emblem
 * Preserves the exact navy-blue rounded-square background (#1D3F5A) and white emblem.
 */
export const UnfcuEmblem: React.FC<UnfcuLogoProps> = ({
  variant = 'navy',
  size = 40,
  className = '',
}) => {
  const isDarkSurface = variant === 'white';

  return (
    <img
      src={unfcuExactLogo}
      alt="UNFCU Emblem"
      width={size}
      height={size}
      referrerPolicy="no-referrer"
      style={{ width: size, height: size }}
      className={`object-contain shrink-0 select-none ${
        isDarkSurface ? 'rounded-[14%] ring-1 ring-white/25' : ''
      } ${className}`}
    />
  );
};

export const UnfcuWordmark: React.FC<{
  inverted?: boolean;
  subtitle?: string;
  compact?: boolean;
}> = ({ inverted = false, subtitle, compact = false }) => {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <UnfcuEmblem variant={inverted ? 'white' : 'navy'} size={compact ? 32 : 38} className="shrink-0" />
      <div className="flex flex-col min-w-0 leading-tight">
        <div className="flex items-baseline gap-1 min-w-0">
          <span
            className={`font-extrabold tracking-tight ${
              compact ? 'text-base' : 'text-lg'
            } ${inverted ? 'text-white' : 'text-[#173A52]'}`}
          >
            UNFCU
          </span>
          <span
            className={`text-[10px] font-semibold ${
              inverted ? 'text-blue-200' : 'text-[#2166D5]'
            }`}
          >
            ®
          </span>
        </div>
        {subtitle && (
          <span
            className={`text-[11px] font-medium truncate ${
              inverted ? 'text-blue-100/90' : 'text-slate-500'
            }`}
          >
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * UNFCU Sweeping Globe Horizon Graphic for Landing & Onboarding
 */
export const UnfcuGlobeBackdrop: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`relative overflow-hidden ${className}`} aria-hidden="true">
    <svg
      viewBox="0 0 600 260"
      preserveAspectRatio="none"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full block"
    >
      <defs>
        <linearGradient id="unfcuWaveGrad" x1="0" y1="0" x2="600" y2="260" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2166D5" />
          <stop offset="55%" stopColor="#1B4D7E" />
          <stop offset="100%" stopColor="#123047" />
        </linearGradient>
      </defs>
      <path
        d="M0 90C130 20 260 15 410 55C500 78 555 52 600 24V260H0V90Z"
        fill="url(#unfcuWaveGrad)"
      />
      <path
        d="M0 135C160 65 340 85 600 135V260H0V135Z"
        fill="#173A52"
        fillOpacity="0.55"
      />
    </svg>

    <div className="absolute top-2 sm:top-2.5 right-4 sm:right-6 h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-white p-1.5 shadow-md ring-1 ring-white/40 flex items-center justify-center">
      <img
        src="/assets/aistudio/unjspf_real_icon_logo_4067b69b.jpeg"
        alt="United Nations Emblem"
        className="w-full h-full object-contain block select-none pointer-events-none"
      />
    </div>
  </div>
);

/**
 * UNFCU Support Representative Illustration (matches reference Help & Support footer graphic)
 */
export const UnfcuSupportIllustration: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <circle cx="60" cy="60" r="54" fill="#DCE8F8" />
    <circle cx="60" cy="60" r="44" fill="#EBF2FC" />
    {/* Head & Shoulders */}
    <path
      d="M32 96C34 79 45 71 60 71C75 71 86 79 88 96"
      fill="#173A52"
    />
    <path
      d="M52 71L60 83L68 71"
      fill="#FFFFFF"
    />
    <circle cx="60" cy="48" r="15" fill="#173A52" />
    {/* Headset arc + mic */}
    <path
      d="M42 48C42 37.5 50 29 60 29C70 29 78 37.5 78 48"
      stroke="#2166D5"
      strokeWidth="3.5"
      strokeLinecap="round"
    />
    <rect x="38" y="43" width="6" height="12" rx="3" fill="#2166D5" />
    <rect x="76" y="43" width="6" height="12" rx="3" fill="#2166D5" />
    <path
      d="M79 53C79 60 72 64 64 64"
      stroke="#2166D5"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <circle cx="62" cy="64" r="2.8" fill="#173A52" />
  </svg>
);
