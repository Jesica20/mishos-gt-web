import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

// 👇 Mockeamos TODO el paquete de Radix Avatar para evitar el comportamiento de "no montes <img> hasta que cargue".
vi.mock('@radix-ui/react-avatar', async (importOriginal) => {
  // No necesitamos el original; devolvemos wrappers muy simples
  return {
    Root: React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
      ({ children, ...props }, ref) => (
        <div ref={ref} {...props}>
          {children}
        </div>
      )
    ),
    Image: React.forwardRef<HTMLImageElement, React.ImgHTMLAttributes<HTMLImageElement>>(
      ({ ...props }, ref) => <img ref={ref} {...props} />
    ),
    Fallback: React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
      ({ children, ...props }, ref) => (
        <div ref={ref} {...props}>
          {children}
        </div>
      )
    ),
  }
})

// Importamos tu SUT (usa los wrappers anteriores)
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

describe('Avatar (ui/avatar)', () => {
  it('renders fallback content', () => {
    render(
      <Avatar>
        <AvatarFallback>KM</AvatarFallback>
      </Avatar>
    )
    expect(screen.getByText('KM')).toBeInTheDocument()
  })

  it('renders image element and keeps alt attribute', () => {
    render(
      <Avatar>
        <AvatarImage src="https://example.com/photo.jpg" alt="User avatar" />
      </Avatar>
    )
    const img = screen.getByAltText(/user avatar/i)
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'https://example.com/photo.jpg')
  })

  it('merges className on Avatar root', () => {
    render(
      <Avatar className="avatar-x">
        <AvatarFallback>OK</AvatarFallback>
      </Avatar>
    )
    expect(screen.getByText('OK').parentElement).toHaveClass('avatar-x')
  })

  it('merges className on AvatarImage and AvatarFallback', () => {
    render(
      <Avatar>
        <AvatarImage alt="img" className="img-x" />
        <AvatarFallback className="fb-x">Z</AvatarFallback>
      </Avatar>
    )
    expect(screen.getByAltText('img')).toHaveClass('img-x')
    expect(screen.getByText('Z')).toHaveClass('fb-x')
  })
})