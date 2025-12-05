export function buildFallbackMarkerIcon(color: string, heading: number, selected: boolean) {
  const bodyColor = color
  const strokeColor = selected ? '#0ea5e9' : 'transparent'
  const svg = `
    <svg width="64" height="64" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <g transform="rotate(${heading},16,16)">
        <path d="M10,4 C10,2.5 11.5,1 16,1 C20.5,1 22,2.5 22,4 L24,10 L24,26 C24,28.5 22.5,30 20,30 L12,30 C9.5,30 8,28.5 8,26 L8,10 L10,4 Z" fill="${bodyColor}" stroke="${strokeColor}" stroke-width="${selected ? 0.6 : 0}" />
        <path d="M11,10 L21,10 L22,24 L10,24 L11,10 Z" fill="#2F80ED" />
        <path d="M12,11 L20,11 L19,16 L13,16 L12,11 Z" fill="#FFFFFF" opacity="0.7" />
        <path d="M13,20 L19,20 L18.5,23 L13.5,23 L13,20 Z" fill="#FFFFFF" opacity="0.7" />
      </g>
    </svg>
  `
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

export function buildTrackPinIcon(color: string) {
  const svg = `
    <svg width="40" height="56" viewBox="0 0 40 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 54c-6-8.5-18-17.5-18-30C2 11.85 9.85 4 20 4s18 7.85 18 20c0 12.5-12 21.5-18 30Z" fill="${color}" stroke="#ffffff" stroke-width="2"/>
      <circle cx="20" cy="22" r="6.5" fill="#ffffff" opacity="0.9" />
    </svg>
  `
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}
