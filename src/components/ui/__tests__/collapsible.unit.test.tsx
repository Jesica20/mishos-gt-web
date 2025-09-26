import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'

describe('Collapsible', () => {
  it('can be controlled via defaultOpen', () => {
    render(
      <Collapsible defaultOpen>
        <CollapsibleTrigger>Trigger</CollapsibleTrigger>
        <CollapsibleContent>
          <div data-testid="content">Content</div>
        </CollapsibleContent>
      </Collapsible>
    )

    // Al usar defaultOpen, el contenido debería ser visible desde el inicio
    expect(screen.getByTestId('content')).toBeVisible()
  })
})