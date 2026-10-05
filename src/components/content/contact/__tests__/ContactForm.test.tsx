import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SUPPORT_EMAIL } from '@/config/brand';
import { ContactForm } from '../ContactForm';

describe('ContactForm', () => {
  it('explains that nothing is sent or stored', () => {
    render(<ContactForm onCompose={vi.fn()} />);
    expect(screen.getByText(/no message is sent from this page/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /compose email/i })).toBeInTheDocument();
  });

  it('validates required fields and does not compose an invalid message', async () => {
    const user = userEvent.setup();
    const onCompose = vi.fn();
    render(<ContactForm onCompose={onCompose} />);

    await user.click(screen.getByRole('button', { name: /compose email/i }));
    expect(await screen.findByText(/tell us your name/i)).toBeInTheDocument();
    expect(screen.getByText('Enter your email address')).toBeInTheDocument();
    expect(screen.getByText('Choose what your message is about')).toBeInTheDocument();
    expect(screen.getByLabelText(/your name/i)).toHaveAttribute('aria-invalid', 'true');
    expect(onCompose).not.toHaveBeenCalled();
  });

  it('composes a prefilled mailto link and shows the fallback options', async () => {
    const user = userEvent.setup();
    const onCompose = vi.fn();
    render(<ContactForm onCompose={onCompose} />);

    await user.type(screen.getByLabelText(/your name/i), 'Arjun Mehta');
    await user.type(screen.getByLabelText(/^email/i), 'arjun@example.in');
    await user.selectOptions(screen.getByLabelText(/topic/i), 'shipping');
    await user.type(screen.getByLabelText(/order reference/i), '#A1B2C3D4');
    await user.type(
      screen.getByLabelText(/message/i),
      'Where is my parcel? It has been eight business days.',
    );
    await user.click(screen.getByRole('button', { name: /compose email/i }));

    expect(onCompose).toHaveBeenCalledTimes(1);
    const href = String(onCompose.mock.calls[0]?.[0]);
    expect(href.startsWith(`mailto:${SUPPORT_EMAIL}?subject=`)).toBe(true);
    const url = new URL(href);
    expect(url.searchParams.get('subject')).toContain('Shipping & delivery · #A1B2C3D4');
    expect(url.searchParams.get('body')).toContain('eight business days');

    expect(
      await screen.findByRole('heading', { name: /your email is ready to send/i }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: /open email draft/i })).toHaveAttribute('href', href);
    expect(screen.getByRole('button', { name: /copy message/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /write another/i }));
    expect(screen.getByLabelText(/your name/i)).toHaveValue('');
  });
});
