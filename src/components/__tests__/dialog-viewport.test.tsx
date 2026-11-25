import { createRef } from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../ui/dialog';

afterEach(() => vi.unstubAllGlobals());

describe('shared dialog viewport', () => {
  it('tracks keyboard resize and viewport panning only while open, retaining the content ref', () => {
    const viewport = Object.assign(new EventTarget(), { height: 500, offsetTop: 0 });
    vi.stubGlobal('visualViewport', viewport);
    const add = vi.spyOn(viewport, 'addEventListener');
    const remove = vi.spyOn(viewport, 'removeEventListener');
    const ref = createRef<HTMLDivElement>();
    const dialog = (open: boolean) => <Dialog open={open}>
      <DialogContent ref={ref} style={{ color: 'red' }}>
        <DialogTitle>Aufgabe</DialogTitle><DialogDescription>Beschreibung</DialogDescription>
      </DialogContent>
    </Dialog>;
    const view = render(dialog(false));
    expect(add).not.toHaveBeenCalled();
    view.rerender(dialog(true));
    const content = screen.getByRole('dialog');
    expect(ref.current).toBe(content);
    expect(content.style.color).toBe('red');
    expect(content.style.getPropertyValue('--dialog-viewport-height')).toBe('500px');
    expect(content.style.getPropertyValue('--dialog-keyboard-inset')).toBe(`${window.innerHeight - 500}px`);
    act(() => { viewport.height = 300; viewport.offsetTop = 80; viewport.dispatchEvent(new Event('resize')); });
    expect(content.style.getPropertyValue('--dialog-viewport-height')).toBe('300px');
    expect(content.style.getPropertyValue('--dialog-keyboard-inset')).toBe(`${window.innerHeight - 380}px`);
    act(() => { viewport.offsetTop = window.innerHeight; viewport.dispatchEvent(new Event('scroll')); });
    expect(content.style.getPropertyValue('--dialog-keyboard-inset')).toBe('0px');
    view.rerender(dialog(false));
    expect(ref.current).toBeNull();
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function));
  });

  it('opens with CSS viewport fallbacks when the Visual Viewport API is unavailable', () => {
    vi.stubGlobal('visualViewport', undefined);
    render(<Dialog open><DialogContent><DialogTitle>Aufgabe</DialogTitle><DialogDescription>Beschreibung</DialogDescription></DialogContent></Dialog>);
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Schließen' })).toBeEnabled();
  });
});
