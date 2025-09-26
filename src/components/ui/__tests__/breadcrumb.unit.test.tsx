import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from '@/components/ui/breadcrumb'

// Componente “asChild” para probar el Slot (debe aceptar ref y className)
const CustomAnchor = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithoutRef<'a'>
>(({ children, ...props }, ref) => (
  <a ref={ref} data-testid="custom-anchor" {...props}>
    {children}
  </a>
))
CustomAnchor.displayName = 'CustomAnchor'

describe('Breadcrumb (ui/breadcrumb)', () => {
  it('renders nav with aria-label', () => {
    render(
      <Breadcrumb aria-label="breadcrumb">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )
    const nav = screen.getByRole('navigation', { name: /breadcrumb/i })
    expect(nav).toBeInTheDocument()
  })

  it('renders list and items with links', () => {
    render(
      <Breadcrumb aria-label="breadcrumb">
        <BreadcrumbList data-testid="list">
          <BreadcrumbItem>
            <BreadcrumbLink href="/a">A</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/b">B</BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )

    expect(screen.getByTestId('list')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'A' })).toHaveAttribute('href', '/a')
    expect(screen.getByRole('link', { name: 'B' })).toHaveAttribute('href', '/b')
  })

  it('supports custom separator content', () => {
    render(
      <Breadcrumb aria-label="breadcrumb">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/a">A</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>*</BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbLink href="/b">B</BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )
    // Hay un “*” visible como separador custom
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('BreadcrumbPage has correct accessibility attributes', () => {
    render(
      <Breadcrumb aria-label="breadcrumb">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/a">A</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Current</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )

    const current = screen.getByText('Current')
    expect(current).toHaveAttribute('role', 'link')
    expect(current).toHaveAttribute('aria-current', 'page')
    expect(current).toHaveAttribute('aria-disabled', 'true')
  })

  it('BreadcrumbEllipsis renders icon and sr-only text', () => {
    render(
      <Breadcrumb aria-label="breadcrumb">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/a">A</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbEllipsis />
          <BreadcrumbItem>
            <BreadcrumbLink href="/b">B</BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )

    // El elemento es presentational/aria-hidden, pero contiene un sr-only “More”
    const ellipsis = screen.getByText('More')
    expect(ellipsis).toBeInTheDocument()
    // Su contenedor debe tener aria-hidden (porque BreadcrumbEllipsis lo marca)
    const container = ellipsis.parentElement
    expect(container).toHaveAttribute('aria-hidden', 'true')
  })

  it('BreadcrumbLink supports asChild with Slot and merges className', () => {
    render(
      <Breadcrumb aria-label="breadcrumb">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild className="custom-class">
              <CustomAnchor href="/slot">SlotLink</CustomAnchor>
            </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )

    const link = screen.getByTestId('custom-anchor')
    expect(link).toHaveAttribute('href', '/slot')
    // Debe recibir la clase del Link (merge via cn)
    expect(link).toHaveClass('custom-class')
  })

  it('merges className on list and items', () => {
    render(
      <Breadcrumb aria-label="breadcrumb">
        <BreadcrumbList className="list-x">
          <BreadcrumbItem className="item-x">
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )

    // La clase del list llega al <ol>
    const list = screen.getByRole('list')
    expect(list).toHaveClass('list-x')

    // La clase del item llega al <li>
    const item = screen.getByRole('listitem')
    expect(item).toHaveClass('item-x')
  })
})
