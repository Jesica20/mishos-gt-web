import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Button } from '@/components/ui/button'

// Minimal host for asChild to verify props/className pass-through
const CustomAnchor = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithoutRef<'a'>
>(({ children, ...props }, ref) => (
  <a ref={ref} data-testid="custom-anchor" {...props}>
    {children}
  </a>
))
CustomAnchor.displayName = 'CustomAnchor'

describe('Button (ui/button)', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('applies default variant and size classes', () => {
    render(<Button>Default</Button>)
    const btn = screen.getByRole('button', { name: /default/i })
    // From cva default: variant "default" + size "default"
    expect(btn).toHaveClass('bg-primary', 'text-primary-foreground') // variant
    expect(btn).toHaveClass('h-10', 'px-4', 'py-2') // size
  })

  it('applies secondary variant and lg size', () => {
    render(
      <Button variant="secondary" size="lg">
        Big Secondary
      </Button>
    )
    const btn = screen.getByRole('button', { name: /big secondary/i })
    expect(btn).toHaveClass('bg-secondary', 'text-secondary-foreground')
    expect(btn).toHaveClass('h-11', 'px-8')
  })

  it('merges custom className with variant/size', () => {
    render(
      <Button className="extra-x" variant="outline" size="sm">
        Merge
      </Button>
    )
    const btn = screen.getByRole('button', { name: /merge/i })
    // outline + sm + custom
    expect(btn).toHaveClass('border', 'bg-background') // outline base
    expect(btn).toHaveClass('h-9', 'px-3') // sm size
    expect(btn).toHaveClass('extra-x') // custom merged
  })

  it('supports asChild (Slot) and forwards className/props', () => {
    render(
      <Button asChild className="slot-x">
        <CustomAnchor href="/docs">Docs</CustomAnchor>
      </Button>
    )
    const anchor = screen.getByTestId('custom-anchor')
    expect(anchor).toHaveAttribute('href', '/docs')
    // Classes from cva + custom merged must land on the child
    expect(anchor.className).toMatch(/slot-x/)
    expect(anchor.className).toMatch(/inline-flex/) // base utilities present
  })

  it('respects disabled and prevents onClick', () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Disabled
      </Button>
    )
    const btn = screen.getByRole('button', { name: /disabled/i })
    expect(btn).toBeDisabled()
    fireEvent.click(btn)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('fires onClick when enabled', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Go</Button>)
    fireEvent.click(screen.getByRole('button', { name: /go/i }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})