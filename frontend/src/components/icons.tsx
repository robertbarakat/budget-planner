import type { ReactNode } from 'react'

function Icon({ children, size = 22, strokeWidth = 2 }: { children: ReactNode; size?: number; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function HomeIcon() {
  return (
    <Icon>
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h14V10" />
    </Icon>
  )
}

export function CashFlowIcon() {
  return (
    <Icon>
      <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
    </Icon>
  )
}

export function MacroAreasIcon() {
  return (
    <Icon>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </Icon>
  )
}

export function PlusIcon() {
  return (
    <Icon size={26} strokeWidth={2.2}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  )
}
