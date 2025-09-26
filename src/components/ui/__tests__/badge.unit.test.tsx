import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Badge } from '@/components/ui/badge'

describe('Badge (ui/badge)', () => {
  it('renders children', () => {
    render(<Badge>New</Badge>)
    expect(screen.getByText('New')).toBeInTheDocument()
  })

  it('applies base utility classes', () => {
    render(<Badge>Base</Badge>)
    const el = screen.getByText('Base')

    // Algunas clases base del cva
    expect(el).toHaveClass('inline-flex', 'items-center', 'rounded-full', 'border')
    expect(el).toHaveClass('px-2.5', 'py-0.5', 'text-xs', 'font-semibold')
  })

  it('uses default variant classes when no variant is provided', () => {
    render(<Badge>Default</Badge>)
    const el = screen.getByText('Default')

    // default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80"
    expect(el).toHaveClass('bg-primary', 'text-primary-foreground')
    expect(el.className).toMatch(/border-transparent/)
  })

  it('applies "secondary" variant classes', () => {
    render(<Badge variant="secondary">Secondary</Badge>)
    const el = screen.getByText('Secondary')

    expect(el).toHaveClass('bg-secondary', 'text-secondary-foreground')
    expect(el.className).toMatch(/border-transparent/)
  })

  it('applies "destructive" variant classes', () => {
    render(<Badge variant="destructive">Danger</Badge>)
    const el = screen.getByText('Danger')

    expect(el).toHaveClass('bg-destructive', 'text-destructive-foreground')
    expect(el.className).toMatch(/border-transparent/)
  })

  it('applies "outline" variant classes', () => {
    render(<Badge variant="outline">Outline</Badge>)
    const el = screen.getByText('Outline')

    // outline: "text-foreground" (sin bg específico)
    expect(el).toHaveClass('text-foreground')
    expect(el.className).not.toMatch(/bg-primary|bg-secondary|bg-destructive/)
  })

  it('merges custom className via cn()', () => {
    render(<Badge className="data-test">Merged</Badge>)
    const el = screen.getByText('Merged')
    expect(el).toHaveClass('data-test')
  })
})