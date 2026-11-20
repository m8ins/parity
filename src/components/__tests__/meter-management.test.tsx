import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RenameMeterDialog } from '../RenameMeterDialog';
import { DeleteMeterDialog } from '../DeleteMeterDialog';
import { ContractCard } from '../contract-card';
import { ContractDetail } from '../contract-detail';
import { MeterManagementError } from '@/lib/meter-management';
import { readingFixture } from '@/lib/reading-fixture';
const api = vi.hoisted(() => ({ renameMeter: vi.fn(), removeMeter: vi.fn(), push: vi.fn(), refresh: vi.fn() }));
vi.mock('@/lib/meter-management', async original => ({ ...await original<object>(), renameMeter: api.renameMeter, removeMeter: api.removeMeter }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: api.push, refresh: api.refresh }) }));
const meter = readingFixture.initialMeters[0];
beforeEach(() => vi.clearAllMocks());
describe('Verwalten', () => {
  it('gibt nach Menü → Entfernen → Abbrechen den Fokus zurück und erlaubt erneutes Öffnen', async () => {
    const user = userEvent.setup();
    render(<ContractCard meter={meter} meterData={{ contracts: [], readings: [], ratesByContract: {} }} onUpdate={vi.fn()} onReadingAdded={vi.fn()} onDelete={vi.fn()} />);
    const trigger = screen.getByRole('button', { name: `${meter.name} verwalten` });
    await user.click(trigger); await user.click(screen.getByRole('menuitem', { name: 'Entfernen' }));
    await user.click(await screen.findByRole('button', { name: 'Abbrechen' }));
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(document.body.style.pointerEvents).not.toBe('none');
    await user.click(trigger); await user.click(screen.getByRole('menuitem', { name: 'Entfernen' }));
    expect(await screen.findByRole('dialog')).toBeVisible(); expect(api.removeMeter).not.toHaveBeenCalled();
  });
  it('erhält den Umbenennungsdialog bei Pending und verhindert Mehrfachspeicherung', async () => {
    const user = userEvent.setup(), close = vi.fn(); api.renameMeter.mockReturnValue(new Promise(() => {}));
    render(<RenameMeterDialog meter={meter} open onOpenChange={close} onSaved={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Speichern' }));
    expect(screen.getByLabelText('Zählername')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Wird gespeichert …' })).toBeDisabled();
    await user.keyboard('{Escape}'); expect(close).not.toHaveBeenCalled(); expect(api.renameMeter).toHaveBeenCalledOnce();
  });
  it('erhält den Namen nach Fehler, sperrt während Retry und bestätigt nur gespeicherten Namen', async () => {
    const user = userEvent.setup(), saved = vi.fn(), close = vi.fn();
    api.renameMeter.mockRejectedValueOnce(new MeterManagementError('Bitte erneut versuchen.')).mockResolvedValueOnce({ ...meter, name: 'Neu' });
    render(<RenameMeterDialog meter={meter} open onOpenChange={close} onSaved={saved} />);
    const input = screen.getByLabelText('Zählername'); await user.clear(input); await user.type(input, 'Neu');
    await user.click(screen.getByRole('button', { name: 'Speichern' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('erneut versuchen'); expect(input).toHaveValue('Neu'); expect(saved).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Speichern' }));
    await waitFor(() => expect(saved).toHaveBeenCalledWith({ ...meter, name: 'Neu' })); expect(close).toHaveBeenCalledWith(false);
  });
  it('öffnet Entfernen ohne Mutation, fokussiert Abbrechen und erhält Fehler bis bestätigter Wiederholung', async () => {
    const user = userEvent.setup(), deleted = vi.fn(), close = vi.fn();
    api.removeMeter.mockRejectedValueOnce(new MeterManagementError('Die Löschung konnte nicht bestätigt werden.')).mockResolvedValueOnce(undefined);
    render(<DeleteMeterDialog meter={meter} open onOpenChange={close} onDeleted={deleted} />);
    expect(screen.getByRole('button', { name: 'Abbrechen' })).toHaveFocus(); expect(api.removeMeter).not.toHaveBeenCalled();
    expect(screen.getByText(/früheren Konditionsfassungen/)).toBeVisible();
    await user.keyboard('{Enter}'); expect(close).toHaveBeenCalledWith(false); expect(api.removeMeter).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Zähler endgültig entfernen' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('nicht bestätigt'); expect(deleted).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Löschung erneut prüfen' })); await waitFor(() => expect(deleted).toHaveBeenCalledOnce());
  });
  it('sperrt doppelte Löschung und Escape bei unbestätigtem Auftrag', async () => {
    const user = userEvent.setup(), close = vi.fn(); api.removeMeter.mockReturnValue(new Promise(() => {}));
    render(<DeleteMeterDialog meter={meter} open onOpenChange={close} onDeleted={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Zähler endgültig entfernen' }));
    expect(screen.getByRole('button', { name: 'Wird geprüft …' })).toBeDisabled(); await user.keyboard('{Escape}');
    expect(close).not.toHaveBeenCalled(); expect(api.removeMeter).toHaveBeenCalledOnce();
  });
  it('verwendet für einen ungültigen Zeitraum nie still den neuesten und bietet einen Rückweg', () => {
    render(<ContractDetail initialMeter={meter} initialData={{ contracts: [], ratesByContract: {}, readings: [] }} initialContractId="gelöscht" />);
    expect(screen.getByRole('heading', { name: 'Zeitraum nicht verfügbar' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Zum aktuellen Zeitraum' })).toHaveAttribute('href', `/meter/${meter.id}`);
    expect(screen.queryByRole('tab', { name: 'Verstehen' })).toBeNull();
  });
});
