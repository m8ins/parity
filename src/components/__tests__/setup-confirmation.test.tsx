vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import type { User } from '@supabase/supabase-js'
import { Dashboard } from '../dashboard'
import { initialSetupValues } from '@/lib/meter-setup'

const rpc = vi.fn()
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ rpc }) }))
vi.mock('../design-panel', () => ({ DesignPanel: () => null }))
vi.mock('../contract-card', () => ({ ContractCard: () => null }))

function openSetup() {
  render(<Dashboard user={{ id: 'confirmation-user' } as User} initialMeters={[]} initialData={{}} />)
  fireEvent.click(screen.getByRole('button', { name: /Zähler hinzufügen/ }))
}
beforeEach(() => { sessionStorage.clear(); vi.clearAllMocks() })
describe('setup close confirmation', () => {
  it('only explains discarding unsaved input before any save attempt', async () => {
    openSetup()
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Wohnung' } })
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }))
    const confirmation = await screen.findByRole('dialog', { name: 'Eingaben verwerfen?' })
    expect(confirmation).toHaveTextContent('Es wurde noch kein Zähler angelegt.')
    expect(confirmation).not.toHaveTextContent('Auftrag')
    expect(confirmation).not.toHaveTextContent('Speicherung')
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Weiter einrichten' }))
    expect(screen.getByLabelText('Name')).toHaveValue('Wohnung')
    expect(rpc).not.toHaveBeenCalled()
  })
  it('explains retained input and a concrete return path only for an unconfirmed save', async () => {
    sessionStorage.setItem('parity:meter-setup:confirmation-user', JSON.stringify({
      values: { ...initialSetupValues(), name: 'Wohnung', period_start: '2026-01-01', reading_date: '2026-01-01', reading_value: '123', grundpreis: '10', arbeitspreis: '30', abschlag: '50' },
      requestId: '11111111-1111-4111-8111-111111111111', submitted: true, step: 2,
    }))
    openSetup()
    fireEvent.click(await screen.findByRole('button', { name: 'Später prüfen' }))
    const confirmation = await screen.findByRole('dialog', { name: 'Später weiterprüfen?' })
    expect(confirmation).toHaveTextContent('Wir wissen noch nicht, ob dein Zähler gespeichert wurde.')
    expect(confirmation).toHaveTextContent('Öffne „Zähler hinzufügen“ erneut')
    expect(confirmation).not.toHaveTextContent('gehen verloren')
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Später prüfen' }))
    expect(sessionStorage.getItem('parity:meter-setup:confirmation-user')).not.toBeNull()
    expect(rpc).not.toHaveBeenCalled()
  })
})
