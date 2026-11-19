vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { User } from '@supabase/supabase-js'
import { Dashboard } from '../dashboard'
const order = vi.fn()
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ from: () => ({ select: () => ({ order }) }) }) }))
vi.mock('../contract-form', () => ({ ContractForm: ({ onSuccess }: { onSuccess: () => void }) => <button onClick={onSuccess}>Abgeschlossene Einrichtung verlassen</button> }))
vi.mock('../design-panel', () => ({ DesignPanel: () => null }))
vi.mock('../contract-card', () => ({ ContractCard: () => null }))
describe('setup overview recovery', () => {
  it('shows a concrete reload action and prevents another setup while the saved meter list cannot be confirmed', async () => {
    order.mockResolvedValueOnce({ data: null, error: { message: 'lost list response' } }).mockResolvedValueOnce({ data: [], error: null })
    render(<Dashboard user={{ id: 'user-1' } as User} initialMeters={[]} initialData={{}} />)
    fireEvent.click(screen.getByRole('button', { name: /Zähler hinzufügen/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Abgeschlossene Einrichtung verlassen' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Bereits gespeicherte Zähler bleiben erhalten')
    expect(screen.queryByRole('button', { name: /Zähler hinzufügen/ })).toBeNull()
    expect(screen.queryByText('Dein erster Zähler')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Übersicht neu laden' }))
    expect(await screen.findByRole('button', { name: /Zähler hinzufügen/ })).toBeVisible()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
