import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'

describe('Alert (ui/alert)', () => {
  it('renders with role="alert" and children', () => {
    render(
      <Alert>
        <AlertTitle>Heads up!</AlertTitle>
        <AlertDescription>Something happened.</AlertDescription>
      </Alert>
    )

    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(screen.getByText(/heads up!/i)).toBeInTheDocument()
    expect(screen.getByText(/something happened\./i)).toBeInTheDocument()
  })

  it('applies default variant classes', () => {
    render(<Alert>Default alert</Alert>)
    const alert = screen.getByRole('alert')

    // Clases base
    expect(alert).toHaveClass('relative', 'w-full', 'rounded-lg', 'border', 'p-4')

    // Parte distintiva del variant "default"
    // (la clase exacta viene de cva: "bg-background text-foreground")
    expect(alert).toHaveClass('bg-background')
    expect(alert).toHaveClass('text-foreground')
  })

  it('applies "destructive" variant classes', () => {
    render(<Alert variant="destructive">Danger!</Alert>)
    const alert = screen.getByRole('alert')

    // Clases distintivas del variant "destructive"
    expect(alert.className).toMatch(/text-destructive/)
    // En modo claro agrega "border-destructive/50" (y en dark "dark:border-destructive")
    // Nos basta con comprobar una de las distintivas:
    expect(alert.className).toMatch(/border-destructive\/50|dark:border-destructive/)
  })

  it('merges additional className via cn()', () => {
    render(
      <Alert className="data-test-class">
        <AlertTitle>Title</AlertTitle>
      </Alert>
    )
    const alert = screen.getByRole('alert')
    expect(alert).toHaveClass('data-test-class')
  })

  it('renders title and description wrappers with expected utility classes', () => {
    render(
      <Alert>
        <AlertTitle className="extra-title">Title</AlertTitle>
        <AlertDescription className="extra-desc">Desc</AlertDescription>
      </Alert>
    )

    const title = screen.getByText('Title')
    const desc = screen.getByText('Desc')

    // AlertTitle base: "mb-1 font-medium leading-none tracking-tight"
    expect(title).toHaveClass('mb-1', 'font-medium', 'leading-none', 'tracking-tight')
    expect(title).toHaveClass('extra-title')

    // AlertDescription base: "text-sm [&_p]:leading-relaxed"
    expect(desc).toHaveClass('text-sm')
    expect(desc).toHaveClass('extra-desc')
  })
})