import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  ChartContainer,
  ChartTooltipContent,
  ChartLegendContent,
} from '@/components/ui/chart'

// ---- Mock muy ligero de recharts ----
vi.mock('recharts', () => {
  const ResponsiveContainer = ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  )
  // Tooltip/Legend aquí son “dumb” wrappers a los que les pasamos props manualmente
  const Tooltip = (props: any) => <div data-testid="tooltip-proxy" {...props} />
  const Legend = (props: any) => <div data-testid="legend-proxy" {...props} />
  return {
    ResponsiveContainer,
    Tooltip,
    Legend,
  }
})

// Ícono de ejemplo para el config
const DummyIcon = () => <svg data-testid="dummy-icon" />

const baseConfig = {
  sales: { label: 'Ventas', color: '#ff0000', icon: DummyIcon },
  users: { label: 'Usuarios', theme: { light: '#0088ff', dark: '#00ffaa' } },
} as const

describe('chart utils/components', () => {
  it('throws if ChartTooltipContent se usa fuera de ChartContainer (useChart)', () => {
    // Al renderizar sin provider debe lanzar
    expect(() => render(<ChartTooltipContent active payload={[]} />)).toThrow(
      /useChart must be used within a <ChartContainer \/>/i
    )
  })

  it('ChartContainer injects <style> with --color- variables (color + theme)', () => {
    const { container } = render(
      <ChartContainer config={baseConfig}>
        <div>child</div>
      </ChartContainer>
    )

    // Debe existir el wrapper con data-chart y el style inyectado
    const wrapper = container.querySelector('[data-chart]')
    expect(wrapper).toBeInTheDocument()

    const styleEl = container.querySelector('style')
    expect(styleEl).toBeInTheDocument()
    const css = styleEl!.textContent || ''

    // Debe contener variables de color para cada key
    expect(css).toMatch(/--color-sales:\s*#ff0000/i) // color directo
    expect(css).toMatch(/--color-users:\s*#0088ff/i) // theme light
    // la parte dark se inyecta con el prefijo ".dark"
    expect(css).toMatch(/\.dark\s+\[data-chart=.*\]\s*{[^}]*--color-users:\s*#00ffaa/i)

    // Y el ResponsiveContainer mocked
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
  })

  it('ChartTooltipContent renders label, indicator y filas a partir del payload', () => {
    // Simulamos el árbol correcto (provider) envolviendo el TooltipContent
    render(
      <ChartContainer config={baseConfig}>
        {/* No importa el children real en este test */}
        <ChartTooltipContent
          // props que normalmente pone Recharts
          active
          payload={[
            {
              name: 'sales',
              dataKey: 'sales',
              value: 1234,
              color: '#ff0000',
              payload: { fill: '#ff0000' },
            },
            {
              name: 'users',
              dataKey: 'users',
              value: 88,
              color: '#0088ff',
              payload: { fill: '#0088ff' },
            },
          ]}
        />
      </ChartContainer>
    )

    expect(screen.getByText(/usuarios/i)).toBeInTheDocument()

    // Los valores (se renderizan como text, usando toLocaleString())
    expect(screen.getByText(/1,?234/)).toBeInTheDocument()
    expect(screen.getByText(/88/)).toBeInTheDocument()

    // Icono configurado para "sales"
    expect(screen.getByTestId('dummy-icon')).toBeInTheDocument()
  })

  it('ChartLegendContent renders items with color square or icon and label from config', () => {
    render(
      <ChartContainer config={baseConfig}>
        <ChartLegendContent
          payload={[
            { value: 'sales', dataKey: 'sales', color: '#ff0000' },
            { value: 'users', dataKey: 'users', color: '#0088ff' },
          ]}
          verticalAlign="bottom"
        />
      </ChartContainer>
    )

    // Labels
    expect(screen.getByText(/ventas/i)).toBeInTheDocument()
    expect(screen.getByText(/usuarios/i)).toBeInTheDocument()

    // Ícono para sales (DummyIcon)
    expect(screen.getByTestId('dummy-icon')).toBeInTheDocument()

    // users no tiene icono -> renderiza cuadrito de color
    // (lo verificamos checando un elemento con style backgroundColor)
    const colorSquares = Array.from(document.querySelectorAll('div')).filter(
      (el) => el.getAttribute('style')?.includes('background-color:')
    )
    // Debe haber al menos uno (para users)
    expect(colorSquares.length).toBeGreaterThan(0)
  })
})