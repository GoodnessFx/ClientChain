export function Logo({ className = "h-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Icon - Abstract network nodes */}
      <circle cx="15" cy="25" r="6" fill="#0ea5e9" />
      <circle cx="35" cy="15" r="4" fill="#0ea5e9" opacity="0.7" />
      <circle cx="35" cy="35" r="4" fill="#0ea5e9" opacity="0.7" />
      <line x1="20" y1="25" x2="31" y2="17" stroke="#0ea5e9" strokeWidth="2" opacity="0.5" />
      <line x1="20" y1="25" x2="31" y2="33" stroke="#0ea5e9" strokeWidth="2" opacity="0.5" />
      
      {/* Text - ClientChain */}
      <text
        x="50"
        y="32"
        fontFamily="Space Grotesk, sans-serif"
        fontSize="20"
        fontWeight="700"
        fill="currentColor"
        letterSpacing="-0.02em"
      >
        ClientChain
      </text>
    </svg>
  );
}

export function LogoIcon({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <div className={`${className} relative flex items-center justify-center`}>
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <circle cx="20" cy="20" r="6" fill="#0ea5e9" />
        <circle cx="30" cy="12" r="4" fill="#0ea5e9" opacity="0.7" />
        <circle cx="30" cy="28" r="4" fill="#0ea5e9" opacity="0.7" />
        <circle cx="10" cy="12" r="3" fill="#0ea5e9" opacity="0.5" />
        <circle cx="10" cy="28" r="3" fill="#0ea5e9" opacity="0.5" />
        <line x1="24" y1="18" x2="27" y2="14" stroke="#0ea5e9" strokeWidth="2" opacity="0.4" />
        <line x1="24" y1="22" x2="27" y2="26" stroke="#0ea5e9" strokeWidth="2" opacity="0.4" />
        <line x1="16" y1="18" x2="12" y2="14" stroke="#0ea5e9" strokeWidth="2" opacity="0.3" />
        <line x1="16" y1="22" x2="12" y2="26" stroke="#0ea5e9" strokeWidth="2" opacity="0.3" />
      </svg>
    </div>
  );
}
