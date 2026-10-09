import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SaveAddressVariables } from '@/hooks/useAddresses';
import { useToastStore } from '@/store/toastStore';
import type { Address, SavedAddress } from '@/types';
import { ROUTER_FUTURE } from '../../cart/__tests__/fixtures';
import { AddressStep, type AddressStepResult } from '../AddressStep';

const mocks = vi.hoisted(() => ({
  saved: [] as SavedAddress[],
  isFetching: false,
  saveAddress: vi.fn<(variables: SaveAddressVariables) => Promise<string>>(),
  refetch: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/hooks/useAddresses', () => ({
  useSavedAddresses: () => ({
    data: mocks.saved,
    isPending: false,
    isSuccess: true,
    isError: false,
    isFetching: mocks.isFetching,
    error: null,
    refetch: mocks.refetch,
  }),
  useSaveAddress: () => ({ mutateAsync: mocks.saveAddress }),
}));

const ADDRESS: Address = {
  name: 'Arjun Mehta',
  phone: '9876543210',
  pincode: '400050',
  line1: 'Flat 7, Apex Towers, Linking Road',
  city: 'Mumbai',
  state: 'Maharashtra',
};

function savedFrom(address: Address, id: string): SavedAddress {
  return {
    ...address,
    line2: '',
    landmark: '',
    id,
    isDefault: true,
    createdAt: 1_760_000_000_000,
    updatedAt: 1_760_000_000_000,
  };
}

function renderStep(props: Partial<Parameters<typeof AddressStep>[0]> = {}) {
  const onContinue = vi.fn<(result: AddressStepResult) => void>();
  const view = render(
    <MemoryRouter future={ROUTER_FUTURE}>
      <AddressStep
        initialAddress={null}
        initialSource={null}
        defaultName="Arjun Mehta"
        onContinue={onContinue}
        {...props}
      />
    </MemoryRouter>,
  );
  return { ...view, onContinue };
}

async function fillNewAddress(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/mobile number/i), ADDRESS.phone);
  await user.type(screen.getByLabelText(/house \/ flat no/i), ADDRESS.line1);
  await user.type(screen.getByLabelText(/pin code/i), ADDRESS.pincode);
  await user.type(screen.getByLabelText(/^city/i), ADDRESS.city);
  await user.selectOptions(screen.getByLabelText(/state \/ ut/i), ADDRESS.state);
}

beforeEach(() => {
  mocks.saved = [];
  mocks.isFetching = false;
  mocks.saveAddress.mockReset();
  mocks.saveAddress.mockImplementation(({ address }) => {
    mocks.saved = [...mocks.saved, savedFrom(address, 'addr-1')];
    return Promise.resolve('addr-1');
  });
  useToastStore.getState().clear();
});

describe('AddressStep', () => {
  it('hands back the SAVED address id, so returning to the step never saves a duplicate', async () => {
    const user = userEvent.setup();
    const first = renderStep();
    await fillNewAddress(user);
    await user.click(screen.getByRole('button', { name: /continue to payment/i }));

    await waitFor(() => expect(first.onContinue).toHaveBeenCalledTimes(1));
    const result = first.onContinue.mock.calls[0]?.[0];
    expect(result?.source).toEqual({ kind: 'saved', id: 'addr-1' });
    expect(result?.address).toEqual(ADDRESS);
    expect(mocks.saveAddress).toHaveBeenCalledTimes(1);
    first.unmount();

    // Back to the address step (stepper / "Change" on review): the saved card is selected, the
    // "new address" form (prefilled, "save" ticked) is not shown again.
    const again = renderStep({
      initialAddress: result?.address ?? null,
      initialSource: result?.source ?? null,
    });
    expect(screen.getByRole('radio', { name: /arjun mehta/i })).toBeChecked();
    expect(screen.queryByLabelText(/mobile number/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /continue to payment/i }));
    await waitFor(() => expect(again.onContinue).toHaveBeenCalledTimes(1));
    expect(again.onContinue.mock.calls[0]?.[0]).toEqual({
      address: ADDRESS,
      source: { kind: 'saved', id: 'addr-1' },
    });
    expect(mocks.saveAddress).toHaveBeenCalledTimes(1);
  });

  it('keeps the new-address source when the address is not saved', async () => {
    const user = userEvent.setup();
    const { onContinue } = renderStep();
    await fillNewAddress(user);
    await user.click(screen.getByRole('checkbox', { name: /save this address/i }));
    await user.click(screen.getByRole('button', { name: /continue to payment/i }));

    await waitFor(() => expect(onContinue).toHaveBeenCalledTimes(1));
    expect(onContinue.mock.calls[0]?.[0]?.source).toEqual({ kind: 'new' });
    expect(mocks.saveAddress).not.toHaveBeenCalled();
  });

  it('waits for the saved list to refresh instead of showing an empty "new address" form', () => {
    mocks.isFetching = true; // the address was saved a moment ago; the list is still refetching
    renderStep({ initialAddress: ADDRESS, initialSource: { kind: 'saved', id: 'addr-1' } });

    expect(screen.getByText(/loading your saved addresses/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/mobile number/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue to payment/i })).toBeDisabled();
  });

  it('falls back to a prefilled new-address form when the saved address disappeared', async () => {
    renderStep({ initialAddress: ADDRESS, initialSource: { kind: 'saved', id: 'gone' } });

    expect(await screen.findByLabelText(/mobile number/i)).toHaveValue(ADDRESS.phone);
    expect(screen.getByLabelText(/^city/i)).toHaveValue(ADDRESS.city);
  });
});
