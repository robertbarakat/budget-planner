// Stessi valori di --breakpoint-* in tokens.css (il test li tiene allineati).
// Mobile first: i breakpoint sono tutti min-width, in px.
export const BREAKPOINTS = {
  tablet: 768,
  desktop: 1024,
} as const

export type BreakpointName = keyof typeof BREAKPOINTS

export function minWidthQuery(name: BreakpointName): string {
  return `(min-width: ${BREAKPOINTS[name]}px)`
}

export function matchesBreakpoint(name: BreakpointName): boolean {
  return window.matchMedia(minWidthQuery(name)).matches
}
