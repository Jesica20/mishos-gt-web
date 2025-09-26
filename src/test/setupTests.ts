import '@testing-library/jest-dom'
import 'whatwg-fetch'

import * as matchers from '@testing-library/jest-dom/matchers'
import { expect, vi } from 'vitest'
import RO from 'resize-observer-polyfill'
;(globalThis as any).ResizeObserver =
  (globalThis as any).ResizeObserver || RO
expect.extend(matchers)

// Silenciar UI ruidosa en tests (toaster/sonner/tooltip)
vi.mock('@/components/ui/toaster', () => ({ Toaster: () => null }))
vi.mock('@/components/ui/sonner', () => ({ Toaster: () => null }))
vi.mock('@/components/ui/tooltip', () => {
  const React = require('react')
  return {
    TooltipProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  }
})


Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),          // deprecated
    removeListener: vi.fn(),       // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
})

// scrollIntoView (frecuente en listas/command palettes)
Element.prototype.scrollIntoView = vi.fn()

// DOMRect (a veces requerido por popovers/menus)
;(globalThis as any).DOMRect ??= {
  fromRect: ({ x = 0, y = 0, width = 0, height = 0 } = {}) =>
    ({ x, y, width, height, top: y, left: x, right: x + width, bottom: y + height, toJSON: () => {} }),
} as any