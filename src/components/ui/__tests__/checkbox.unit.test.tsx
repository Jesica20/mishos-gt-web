import React, { createRef } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Checkbox } from '@/components/ui/checkbox'

describe('Checkbox (Radix)', () => {
  it('renders unchecked by default', () => {
    render(<Checkbox aria-label="terms" />)
    const cb = screen.getByRole('checkbox', { name: /terms/i })
    expect(cb).toBeInTheDocument()
    expect(cb).toHaveAttribute('aria-checked', 'false')
  })

  it('toggles checked state on click and calls onCheckedChange', async () => {
    const user = userEvent.setup()
    const onCheckedChange = vi.fn()

    render(<Checkbox aria-label="opt-in" onCheckedChange={onCheckedChange} />)
    const cb = screen.getByRole('checkbox', { name: /opt-in/i })

    // first click -> checked
    await user.click(cb)
    expect(cb).toHaveAttribute('aria-checked', 'true')
    expect(onCheckedChange).toHaveBeenCalledTimes(1)
    // Radix passes boolean | "indeterminate"; here should be true
    expect(onCheckedChange.mock.calls[0][0]).toBe(true)

    // second click -> unchecked
    await user.click(cb)
    expect(cb).toHaveAttribute('aria-checked', 'false')
    expect(onCheckedChange).toHaveBeenCalledTimes(2)
    expect(onCheckedChange.mock.calls[1][0]).toBe(false)
  })

  it('respects controlled checked prop', async () => {
    const user = userEvent.setup()
    const onCheckedChange = vi.fn()

    // Controlled: stays checked no matter clicks
    const { rerender } = render(
      <Checkbox aria-label="controlled" checked={true} onCheckedChange={onCheckedChange} />
    )
    const cb = screen.getByRole('checkbox', { name: /controlled/i })

    expect(cb).toHaveAttribute('aria-checked', 'true')

    await user.click(cb)
    // handler is called but state (aria-checked) won't change without rerender
    expect(onCheckedChange).toHaveBeenCalledTimes(1)
    expect(cb).toHaveAttribute('aria-checked', 'true')

    // parent would flip it; simulate with rerender
    rerender(<Checkbox aria-label="controlled" checked={false} onCheckedChange={onCheckedChange} />)
    expect(cb).toHaveAttribute('aria-checked', 'false')
  })

  it('does not toggle or call handler when disabled', async () => {
    const user = userEvent.setup()
    const onCheckedChange = vi.fn()

    render(<Checkbox aria-label="disabled" disabled onCheckedChange={onCheckedChange} />)
    const cb = screen.getByRole('checkbox', { name: /disabled/i })

    expect(cb).toBeDisabled()
    expect(cb).toHaveAttribute('aria-checked', 'false')

    await user.click(cb)
    expect(cb).toHaveAttribute('aria-checked', 'false')
    expect(onCheckedChange).not.toHaveBeenCalled()
  })

  it('forwards className and ref', () => {
    const ref = createRef<HTMLButtonElement>() // Radix Root renders a button
    render(<Checkbox aria-label="with-ref" className="extra-class" ref={ref} />)
    const cb = screen.getByRole('checkbox', { name: /with-ref/i })
    expect(cb).toHaveClass('extra-class')
    expect(ref.current).toBe(cb)
  })
})