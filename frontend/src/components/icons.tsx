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

export function PlusIcon() {
  return (
    <Icon size={26} strokeWidth={2.2}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  )
}

export function ArrowUpIcon() {
  return (
    <Icon size={20}>
      <path d="M12 19V5M5 12l7-7 7 7" />
    </Icon>
  )
}

export function ArrowDownIcon() {
  return (
    <Icon size={20}>
      <path d="M12 5v14M5 12l7 7 7-7" />
    </Icon>
  )
}

export function SettingsIcon() {
  return (
    <Icon>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
    </Icon>
  )
}

export function TransactionsIcon() {
  return (
    <Icon>
      <path d="M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4" />
    </Icon>
  )
}

export function BudgetIcon() {
  return (
    <Icon>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 10h18M9 10v10M15 10v10" />
    </Icon>
  )
}

export function TaxIcon() {
  return (
    <Icon>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
      <path d="M9 9h6M9 13h6" />
    </Icon>
  )
}

export function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return <Icon>{direction === 'left' ? <path d="M15 6l-6 6 6 6" /> : <path d="M9 6l6 6-6 6" />}</Icon>
}
