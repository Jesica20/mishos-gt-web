import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'

describe('Accordion (ui/accordion)', () => {
  it('renders a closed item by default and toggles open on click', async () => {
    const user = userEvent.setup()

    render(
      <Accordion type="single">
        <AccordionItem value="item-1">
          <AccordionTrigger>Section 1</AccordionTrigger>
          <AccordionContent>Panel 1 content</AccordionContent>
        </AccordionItem>
      </Accordion>
    )

    const trigger = screen.getByRole('button', { name: /section 1/i })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText(/panel 1 content/i)).not.toBeInTheDocument()

    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(await screen.findByText(/panel 1 content/i)).toBeInTheDocument()

    await user.click(trigger)
  })

  it('with type="single" opens one item and closes the previous', async () => {
    const user = userEvent.setup()

    render(
      <Accordion type="single">
        <AccordionItem value="a">
          <AccordionTrigger>Section A</AccordionTrigger>
          <AccordionContent>Content A</AccordionContent>
        </AccordionItem>
        <AccordionItem value="b">
          <AccordionTrigger>Section B</AccordionTrigger>
          <AccordionContent>Content B</AccordionContent>
        </AccordionItem>
      </Accordion>
    )

    const triggerA = screen.getByRole('button', { name: /section a/i })
    const triggerB = screen.getByRole('button', { name: /section b/i })

    // Abre A
    await user.click(triggerA)
    expect(triggerA).toHaveAttribute('aria-expanded', 'true')
    expect(await screen.findByText(/content a/i)).toBeInTheDocument()
    expect(screen.queryByText(/content b/i)).not.toBeInTheDocument()

    // Abrir B debe cerrar A (por ser "single")
    await user.click(triggerB)
    expect(triggerB).toHaveAttribute('aria-expanded', 'true')
    expect(await screen.findByText(/content b/i)).toBeInTheDocument()
    expect(screen.queryByText(/content a/i)).not.toBeInTheDocument()
  })
})