import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '../Button';
import { Modal } from '../Modal';

function Harness({ onClose }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open pit stop
      </button>
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          onClose?.();
        }}
        title="Confirm order"
        description="Review your pit stop before starting the engine."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button>Start engine</Button>
          </>
        }
      >
        <label htmlFor="coupon">Coupon</label>
        <input id="coupon" />
      </Modal>
    </>
  );
}

describe('Modal', () => {
  it('renders nothing while closed', () => {
    render(<Modal open={false} onClose={() => undefined} title="Hidden" />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('is a labelled, described modal dialog that moves focus inside', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Open pit stop' }));

    const dialog = screen.getByRole('dialog', { name: 'Confirm order' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription('Review your pit stop before starting the engine.');
    // First control that is not the × button gets focus.
    expect(screen.getByLabelText('Coupon')).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const trigger = screen.getByRole('button', { name: 'Open pit stop' });
    await user.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(trigger).toHaveFocus();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(document.body.style.overflow).toBe('');
  });

  it('traps Tab / Shift+Tab inside the dialog', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Open pit stop' }));

    const close = screen.getByRole('button', { name: 'Close dialog' });
    const coupon = screen.getByLabelText('Coupon');
    const start = screen.getByRole('button', { name: 'Start engine' });
    expect(coupon).toHaveFocus();

    await user.tab(); // Cancel
    await user.tab(); // Start engine (last)
    expect(start).toHaveFocus();
    await user.tab(); // wraps to the first tabbable (× button)
    expect(close).toHaveFocus();
    await user.tab({ shift: true }); // wraps back to the last
    expect(start).toHaveFocus();
  });

  it('closes via the × button and the backdrop', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Open pit stop' }));
    await user.click(screen.getByRole('button', { name: 'Close dialog' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Open pit stop' }));
    const backdrop = screen.getByRole('dialog').previousElementSibling;
    expect(backdrop).toHaveAttribute('aria-hidden', 'true');
    if (backdrop) await user.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('honours initialFocusRef-style [data-autofocus]', async () => {
    const user = userEvent.setup();
    function AutoFocusHarness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open
          </button>
          <Modal
            open={open}
            onClose={() => setOpen(false)}
            title="Badge unlocked"
            footer={
              <>
                <Button variant="ghost">Later</Button>
                <Button data-autofocus="">Keep racing</Button>
              </>
            }
          />
        </>
      );
    }
    render(<AutoFocusHarness />);
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('button', { name: 'Keep racing' })).toHaveFocus();
  });
});
