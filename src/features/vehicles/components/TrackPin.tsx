export function TrackPin({ label, color }: { label: string; color: string }) {
  return (
    <svg width="40" height="56" viewBox="0 0 40 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M20 54c-6-8.5-18-17.5-18-30C2 11.85 9.85 4 20 4s18 7.85 18 20c0 12.5-12 21.5-18 30Z"
        fill={color}
        stroke="#ffffff"
        strokeWidth="2"
      />
      <circle cx="20" cy="22" r="6.5" fill="#ffffff" opacity="0.9" />
      <text x="20" y="24" textAnchor="middle" fontSize="9" fontWeight="700" fill={color}>
        {label}
      </text>
    </svg>
  )
}
