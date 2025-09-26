import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { AspectRatio } from '@/components/ui/aspect-ratio'

describe('AspectRatio (ui/aspect-ratio)', () => {
  it('renders children inside', () => {
    render(
      <AspectRatio ratio={16 / 9}>
        <img src="test.jpg" alt="test image" />
      </AspectRatio>
    )
    expect(screen.getByAltText(/test image/i)).toBeInTheDocument()
  })

  it('merges custom className', () => {
    render(
      <AspectRatio ratio={1} className="custom-class" data-testid="ratio">
        <div>square</div>
      </AspectRatio>
    )
    expect(screen.getByTestId('ratio')).toHaveClass('custom-class')
  })
})