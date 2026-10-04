import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { RadioGroup, type RadioOption } from '@/components/ui/RadioGroup';
import { PAYMENT_METHOD_OPTIONS } from '@/config/payment';
import type { PaymentMethod } from '@/types';
import { PaymentMethodPreview } from './PaymentMethodPreview';

export interface PaymentStepProps {
  methods: readonly PaymentMethod[];
  value: PaymentMethod | null;
  onChange: (method: PaymentMethod) => void;
  onContinue: () => void;
  onBack: () => void;
  /** Amount the preview mentions for COD. */
  amount: number;
  holderName: string;
}

/** Step 2: CARD / UPI / COD radio cards + a cosmetic, clearly-labelled test preview. */
export function PaymentStep({
  methods,
  value,
  onChange,
  onContinue,
  onBack,
  amount,
  holderName,
}: PaymentStepProps) {
  const [error, setError] = useState<string | null>(null);

  const options = useMemo<RadioOption<PaymentMethod>[]>(
    () =>
      PAYMENT_METHOD_OPTIONS.filter((option) => methods.includes(option.id)).map((option) => ({
        value: option.id,
        label: option.label,
        description: option.description,
        icon: <option.icon />,
      })),
    [methods],
  );
  const selected = value !== null && methods.includes(value) ? value : null;

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (!selected) {
          setError('Pick a payment method to continue.');
          return;
        }
        onContinue();
      }}
      className="flex flex-col gap-6"
    >
      <RadioGroup
        name="payment-method"
        legend="Payment method"
        hideLegend
        variant="card"
        columns={methods.length >= 3 ? 3 : 2}
        value={selected}
        onChange={(method) => {
          setError(null);
          onChange(method);
        }}
        options={options}
        required
        error={error ?? undefined}
      />

      {selected ? (
        <PaymentMethodPreview method={selected} amount={amount} holderName={holderName} />
      ) : null}

      {!methods.includes('cod') ? (
        <p className="text-xs text-muted">Cash on delivery is currently unavailable.</p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" leftIcon={<ArrowLeft />} onClick={onBack}>
          Back to address
        </Button>
        <Button type="submit" size="lg" rightIcon={<ArrowRight />}>
          Review order
        </Button>
      </div>
    </form>
  );
}
