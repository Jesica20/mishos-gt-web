import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Importamos TU wrapper
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'

// Mock: sólo el Portal para que rinda inline (evita issues de portales en jsdom)
vi.mock('@radix-ui/react-alert-dialog', async (importOriginal) => {
  const actual = await importOriginal<any>()
  return {
    ...actual,
    Portal: ({ children }: any) => <>{children}</>,
  }
})

describe('AlertDialog (ui/alert-dialog)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function setup(onConfirm = vi.fn()) {
    return {
      onConfirm,
      ui: (
        <AlertDialog>
          <AlertDialogTrigger>Open dialog</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete file?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onConfirm}>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ),
    }
  }

  it('is closed by default and opens on trigger click', async () => {
    const user = userEvent.setup()
    const { ui } = setup()

    render(ui)

    // Cerrado por defecto
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.queryByText(/delete file\?/i)).not.toBeInTheDocument()

    // Abrir
    await user.click(screen.getByRole('button', { name: /open dialog/i }))

    // Abierto: Radix usa role="alertdialog" + título/descr visibles
    const dialog = await screen.findByRole('alertdialog')
    expect(dialog).toBeInTheDocument()
    expect(screen.getByText(/delete file\?/i)).toBeInTheDocument()
    expect(screen.getByText(/this action cannot be undone/i)).toBeInTheDocument()
  })

  it('closes when clicking Cancel', async () => {
    const user = userEvent.setup()
    const { ui } = setup()

    render(ui)

    await user.click(screen.getByRole('button', { name: /open dialog/i }))
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    // Cerrado nuevamente
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('calls onConfirm and closes when clicking Action', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const { ui } = setup(onConfirm)

    render(ui)

    await user.click(screen.getByRole('button', { name: /open dialog/i }))
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /continue/i }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})