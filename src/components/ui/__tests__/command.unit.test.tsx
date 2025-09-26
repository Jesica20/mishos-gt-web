// src/components/ui/__tests__/command.unit.test.tsx
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock simple del Dialog para evitar portales/animaciones
vi.mock('@/components/ui/dialog', () => {
  const Dialog = ({ children, ..._props }: any) => <div role="dialog">{children}</div>
  const DialogContent = ({ children, className, ..._props }: any) => (
    <div data-testid="dialog-content" className={className}>{children}</div>
  )
  return { Dialog, DialogContent }
})

import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from '@/components/ui/command'

describe('Command & CommandDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders CommandDialog open with input and items', async () => {
    render(
      <CommandDialog open>
        <CommandInput placeholder="Search…" aria-label="search" />
        <CommandList>
          <CommandEmpty>No results</CommandEmpty>
          <CommandGroup heading="General">
            <CommandItem value="home">Home</CommandItem>
            <CommandItem value="settings">
              Settings
              <CommandShortcut>⌘,</CommandShortcut>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Help">
            <CommandItem value="docs">Documentation</CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/general/i)).toBeInTheDocument()
    expect(screen.getByText(/help/i)).toBeInTheDocument()
    expect(screen.getByText(/home/i)).toBeInTheDocument()
    expect(screen.getByText(/settings/i)).toBeInTheDocument()
    expect(screen.getByText(/documentation/i)).toBeInTheDocument()
    expect(screen.getByText('⌘,')).toBeInTheDocument()

    const content = screen.getByTestId('dialog-content')
    const separator = within(content).getByRole('separator', { hidden: true })
    expect(separator).toBeInTheDocument()

    // Combobox accesible por label "Search" gracias a Command label="Search"
    expect(screen.getByRole('combobox', { name: /search/i })).toBeInTheDocument()
  })

  it('filters items with CommandInput and shows CommandEmpty when no matches', async () => {
    const user = userEvent.setup()

    render(
      <CommandDialog open>
        <CommandInput placeholder="Search…" aria-label="search" />
        <CommandList>
          <CommandEmpty>No results</CommandEmpty>
          <CommandGroup heading="General">
            <CommandItem value="home">Home</CommandItem>
            <CommandItem value="settings">Settings</CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    )

    const input = screen.getByRole('combobox', { name: /search/i })

    await user.type(input, 'set')
    await waitFor(() => {
      expect(screen.queryByText(/home/i)).not.toBeInTheDocument()
      expect(screen.getByText(/settings/i)).toBeInTheDocument()
    })

    await user.clear(input)
    await user.type(input, 'xyz')
    await screen.findByText(/no results/i)
  })

  it('calls onSelect when an item is selected (Enter)', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()

    render(
      <CommandDialog open>
        <CommandInput aria-label="search" />
        <CommandList>
          <CommandGroup heading="Actions">
            <CommandItem value="open" onSelect={onSelect}>Open</CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    )

    const input = screen.getByRole('combobox', { name: /search/i })
    input.focus()
    await user.keyboard('{ArrowDown}')
    await user.keyboard('{Enter}')

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith('open')
  })

  it('allows clicking an item to trigger onSelect', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()

    render(
      <CommandDialog open>
        <CommandList>
          <CommandGroup heading="Actions">
            <CommandItem value="docs" onSelect={onSelect}>Docs</CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    )

    await user.click(screen.getByText(/docs/i))
    expect(onSelect).toHaveBeenCalledWith('docs')
  })

  it('Command (standalone) renders without the dialog wrapper', () => {
    render(
      // 👇 Pasa label para que el combobox tenga nombre accesible
      <Command label="Search">
        <CommandInput aria-label="search" />
        <CommandList>
          <CommandItem value="a">A</CommandItem>
        </CommandList>
      </Command>
    )
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /search/i })).toBeInTheDocument()
  })
})