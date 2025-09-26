import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Calendar } from '@/components/ui/calendar'

/**
 * Nota: fijamos el mes visible para que el caption sea estable y no dependa de la fecha actual.
 * Usamos January 2024.
 */
const FIXED_MONTH = new Date(2024, 0, 1)

describe('Calendar (ui/calendar)', () => {
  it('renders DayPicker with caption label for fixed month', () => {
    render(<Calendar month={FIXED_MONTH} />)

    // El caption_label tiene texto del mes/año (p.ej. "January 2024")
    // Usamos regex sobre "January" y "2024" para no acoplar a clase interna.
    const caption = screen.getByText(/january/i)
    expect(caption).toBeInTheDocument()
    expect(caption.textContent?.match(/2024/)).toBeTruthy()
  })

  it('merges base "p-3" with custom className on root', () => {
    const { container } = render(<Calendar month={FIXED_MONTH} className="data-x" />)
    // DayPicker envuelve todo en un div root; es el primer hijo del container
    const root = container.firstElementChild as HTMLElement
    expect(root).toHaveClass('p-3')
    expect(root).toHaveClass('data-x')
  })

  it('has showOutsideDays=true by default (renders .day-outside cells)', () => {
    const { container } = render(<Calendar month={FIXED_MONTH} />)
    const outside = container.querySelector('.day-outside')
    expect(outside).not.toBeNull()
  })

  it('renders nav buttons and calls onMonthChange when navigating', () => {
    const onMonthChange = vi.fn()
    const { container } = render(
      <Calendar month={FIXED_MONTH} onMonthChange={onMonthChange} />
    )

    // Los botones de navegación se renderizan con clases definidas en classNames.nav_button
    const navButtons = container.querySelectorAll('button')
    expect(navButtons.length).toBeGreaterThan(0)

    // Suele haber dos: previous/next. Click en "next".
    const nextBtn =
      container.querySelector('.absolute.right-1') ??
      navButtons[1] // fallback si cambian clases
    expect(nextBtn).toBeTruthy()

    fireEvent.click(nextBtn as Element)
    expect(onMonthChange).toHaveBeenCalledTimes(1)
    expect(onMonthChange.mock.calls[0][0]).toBeInstanceOf(Date)

    // Click en "previous" (para asegurar ambos funcionan)
    const prevBtn =
      container.querySelector('.absolute.left-1') ??
      navButtons[0]
    fireEvent.click(prevBtn as Element)
    expect(onMonthChange).toHaveBeenCalledTimes(2)
  })
})