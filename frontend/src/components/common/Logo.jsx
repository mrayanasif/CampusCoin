import React from 'react';

export const CoinMark = ({ size = 26, className = '', glow = false }) => (
  <div 
    className={`coin-mark-wrapper ${glow ? 'coin-glow' : ''} ${className}`}
    style={{
      width: size,
      height: size,
      minWidth: size,
      minHeight: size,
      borderRadius: '50%',
      backgroundColor: '#0D1110',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      boxShadow: glow ? '0 0 16px rgba(199, 243, 107, 0.45)' : 'none',
      border: '1px solid rgba(199, 243, 107, 0.25)',
      flexShrink: 0
    }}
  >
    <svg 
      width={Math.round(size * 0.72)} 
      height={Math.round(size * 0.72)} 
      viewBox="0 0 24 24" 
      fill="none"
    >
      {/* Rounded C-shape */}
      <path 
        d="M 16.5 7.5 A 6.5 6.5 0 1 0 16.5 16.5" 
        stroke="#C7F36B" 
        strokeWidth="2.8" 
        strokeLinecap="round" 
      />
      {/* Small offset coin dot in the aperture */}
      <circle 
        cx="16.5" 
        cy="12" 
        r="2" 
        fill="#C7F36B" 
      />
    </svg>
  </div>
);

export const Logo = ({ size = 'medium', className = '', showSubtitle = false }) => {
  const isLarge = size === 'large';
  const markSize = isLarge ? 34 : 28;

  return (
    <div 
      className={`campuscoin-logo ${className}`} 
      style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '10px', 
        textDecoration: 'none', 
        userSelect: 'none',
        whiteSpace: 'nowrap',
        flexShrink: 0
      }}
    >
      <CoinMark size={markSize} glow />
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span 
          style={{ 
            fontFamily: "'Space Grotesk', -apple-system, sans-serif",
            fontWeight: 700, 
            fontSize: isLarge ? '24px' : '20px', 
            letterSpacing: '-0.04em',
            color: 'var(--ink-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            whiteSpace: 'nowrap'
          }}
        >
          <span>Campus</span>
          <span style={{ color: 'var(--ink-primary)', position: 'relative' }}>
            C
            <span 
              style={{ 
                display: 'inline-block', 
                width: '10px', 
                height: '10px', 
                borderRadius: '50%', 
                background: '#C7F36B', 
                margin: '0 1px 2px 1px',
                border: '2px solid var(--ink-primary)',
                verticalAlign: 'middle'
              }}
            />
            in
          </span>
        </span>
        {showSubtitle && (
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '3px' }}>
            Student Money Cockpit
          </span>
        )}
      </div>
    </div>
  );
};
