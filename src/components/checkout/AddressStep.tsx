import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, MapPin, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { AddressSchema, type AddressInput } from '@shared/schemas';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Chip } from '@/components/ui/Chip';
import { ErrorState } from '@/components/ui/ErrorState';
import { RadioGroup, type RadioOption } from '@/components/ui/RadioGroup';
import { Skeleton } from '@/components/ui/Skeleton';
import { ROUTES } from '@/config/routes';
import { useSaveAddress, useSavedAddresses } from '@/hooks/useAddresses';
import { getFriendlyErrorMessage } from '@/lib/errors';
import { toast } from '@/store/toastStore';
import type { Address, SavedAddress } from '@/types';
import { AddressFields } from './AddressFields';
import {
  emptyAddressValues,
  formatAddressLines,
  formatPhone,
  savedToAddress,
  toAddress,
  toAddressValues,
} from './addressFormat';

export type AddressSource = { kind: 'saved'; id: string } | { kind: 'new' };

export interface AddressStepResult {
  address: Address;
  source: AddressSource;
}

export interface AddressStepProps {
  initialAddress: Address | null;
  initialSource: AddressSource | null;
  /** Prefill for the name field (the collector's Google display name). */
  defaultName: string;
  onContinue: (result: AddressStepResult) => void;
}

const NEW_ADDRESS = 'new';

function SavedAddressesSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2" aria-hidden="true">
      {[0, 1].map((index) => (
        <div key={index} className="flex flex-col gap-2 rounded-lg border border-line bg-card p-4">
          <Skeleton className="h-4 w-1/2 rounded-sm" />
          <Skeleton variant="text" lines={3} />
        </div>
      ))}
    </div>
  );
}

function savedOption(saved: SavedAddress): RadioOption<string> {
  return {
    value: saved.id,
    icon: <MapPin />,
    label: (
      <span className="flex flex-wrap items-center gap-2">
        {saved.name}
        {saved.isDefault ? (
          <Chip size="sm" tone="neutral" variant="outline">
            Default
          </Chip>
        ) : null}
      </span>
    ),
    description: (
      <span className="flex flex-col gap-0.5">
        {formatAddressLines(saved).map((line) => (
          <span key={line}>{line}</span>
        ))}
        <span className="font-mono">+91 {formatPhone(saved.phone)}</span>
      </span>
    ),
  };
}

/**
 * Step 1: pick a saved address (cards) or enter a new one (react-hook-form + AddressSchema),
 * optionally saving it to the collector's garage.
 */
export function AddressStep({
  initialAddress,
  initialSource,
  defaultName,
  onContinue,
}: AddressStepProps) {
  const savedQuery = useSavedAddresses();
  const saveAddress = useSaveAddress();
  const saved = useMemo(() => savedQuery.data ?? [], [savedQuery.data]);
  const [selection, setSelection] = useState<string | null>(
    initialSource?.kind === 'saved'
      ? initialSource.id
      : initialSource?.kind === 'new'
        ? NEW_ADDRESS
        : null,
  );
  const [saveForLater, setSaveForLater] = useState(true);
  const [savedIssue, setSavedIssue] = useState<string | null>(null);

  const form = useForm<AddressInput>({
    resolver: zodResolver(AddressSchema),
    mode: 'onTouched',
    defaultValues:
      initialSource?.kind === 'new' && initialAddress
        ? toAddressValues(initialAddress)
        : emptyAddressValues(defaultName),
  });
  const {
    register,
    setValue,
    handleSubmit,
    reset,
    trigger,
    formState: { errors, isSubmitting },
  } = form;

  // Default selection once saved addresses arrive: the default one, else the first, else new.
  useEffect(() => {
    if (selection !== null || savedQuery.isPending) return;
    const preferred = saved.find((entry) => entry.isDefault) ?? saved[0];
    setSelection(preferred ? preferred.id : NEW_ADDRESS);
  }, [selection, saved, savedQuery.isPending]);

  // A selected saved address that was deleted elsewhere → fall back to "new" (prefilled with the
  // address this checkout was using). Wait for a refetch in flight: an address saved a moment ago
  // is not in the list until it lands.
  const savedSettled = !savedQuery.isPending && !savedQuery.isFetching;
  useEffect(() => {
    if (!selection || selection === NEW_ADDRESS || !savedSettled) return;
    if (saved.some((entry) => entry.id === selection)) return;
    setSelection(NEW_ADDRESS);
    if (initialSource?.kind === 'saved' && initialSource.id === selection && initialAddress) {
      reset(toAddressValues(initialAddress));
    }
  }, [selection, saved, savedSettled, initialSource, initialAddress, reset]);

  const hasSaved = saved.length > 0;
  const selectedSaved = saved.find((entry) => entry.id === selection) ?? null;
  // The selected saved address is still on its way (saved moments ago, the list is refetching).
  const awaitingSelected =
    selection !== null && selection !== NEW_ADDRESS && !selectedSaved && !savedSettled;
  const savedLoading = savedQuery.isPending || awaitingSelected;
  const usingNew =
    !awaitingSelected && (selection === NEW_ADDRESS || (!savedQuery.isPending && !hasSaved));

  const options = useMemo<RadioOption<string>[]>(
    () => [
      ...saved.map(savedOption),
      {
        value: NEW_ADDRESS,
        icon: <Plus />,
        label: 'Use a new address',
        description: 'Deliver somewhere else — you can save it for next time.',
      },
    ],
    [saved],
  );

  const submitNew = handleSubmit(async (values) => {
    const address = toAddress(values);
    let source: AddressSource = { kind: 'new' };
    if (saveForLater) {
      try {
        const id = await saveAddress.mutateAsync({ address, isDefault: !hasSaved });
        // From now on this checkout uses the SAVED card: coming back to this step selects it
        // instead of the prefilled "new address" form, which would save a duplicate.
        source = { kind: 'saved', id };
        toast.success('Address saved', 'It will be ready for your next pit stop.');
      } catch (error) {
        toast.error("Couldn't save the address", getFriendlyErrorMessage(error));
      }
    }
    onContinue({ address, source });
  });

  const continueWithSaved = (): void => {
    if (!selectedSaved) return;
    const parsed = AddressSchema.safeParse(toAddressValues(selectedSaved));
    if (parsed.success) {
      onContinue({
        address: savedToAddress(selectedSaved),
        source: { kind: 'saved', id: selectedSaved.id },
      });
      return;
    }
    // Incomplete saved address: edit it as a new one.
    setSavedIssue('That saved address is missing details — complete it below.');
    setSelection(NEW_ADDRESS);
    reset(toAddressValues(selectedSaved));
    void trigger();
  };

  return (
    <form
      noValidate
      onSubmit={(event) => {
        if (usingNew) {
          void submitNew(event);
        } else {
          event.preventDefault();
          continueWithSaved();
        }
      }}
      className="flex flex-col gap-6"
    >
      {savedLoading ? (
        <div role="status" aria-busy="true">
          <span className="sr-only">Loading your saved addresses…</span>
          <SavedAddressesSkeleton />
        </div>
      ) : null}

      {savedQuery.isError ? (
        <ErrorState
          compact
          title="SAVED ADDRESSES STALLED"
          error={savedQuery.error}
          onRetry={() => void savedQuery.refetch()}
          retrying={savedQuery.isFetching}
        />
      ) : null}

      {hasSaved && !awaitingSelected ? (
        <RadioGroup
          name="saved-address"
          legend="Deliver to"
          variant="card"
          columns={2}
          value={selection}
          onChange={(value) => {
            setSavedIssue(null);
            setSelection(value);
          }}
          options={options}
        />
      ) : null}

      {usingNew && !savedLoading ? (
        <div className="flex flex-col gap-5">
          {savedIssue ? (
            <p role="alert" className="text-sm text-danger-ink">
              {savedIssue}
            </p>
          ) : null}
          {hasSaved ? <p className="hud text-muted">New delivery address</p> : null}
          <AddressFields register={register} setValue={setValue} errors={errors} />
          <Checkbox
            label="Save this address to my garage"
            description="Faster checkout next time. You can delete it any time."
            checked={saveForLater}
            onChange={(event) => setSaveForLater(event.target.checked)}
          />
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Button to={ROUTES.cart} variant="ghost" leftIcon={<ArrowLeft />}>
          Back to pit stop
        </Button>
        <Button
          type="submit"
          size="lg"
          rightIcon={<ArrowRight />}
          disabled={savedLoading || (!usingNew && !selectedSaved)}
          loading={isSubmitting}
          loadingText="Saving address…"
        >
          Continue to payment
        </Button>
      </div>
    </form>
  );
}
