import React from 'react';

const Logo = ({ className, style }) => {
  return (
    <svg 
      className={className} 
      style={style}
      viewBox="0 0 200 40" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <g style={{ mixBlendMode: 'multiply' }}>
        <circle cx="20" cy="15" r="10" fill="#F48B8B" opacity="0.9" />
        <circle cx="13.5" cy="25" r="10" fill="#F48B8B" opacity="0.9" />
        <circle cx="26.5" cy="25" r="10" fill="#F48B8B" opacity="0.9" />
      </g>
      <text 
        x="45" 
        y="29.5" 
        fontFamily="var(--font-heading)" 
        fontWeight="800" 
        fontSize="28" 
        fill="currentColor"
        style={{ letterSpacing: '-0.02em' }}
      >
        consensus
      </text>
    </svg>
  );
};

export default Logo;
