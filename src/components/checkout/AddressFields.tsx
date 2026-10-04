import type { FieldErrors, UseFormRegister, UseFormSetValue } from 'react-hook-form';
import { INDIAN_STATES, normalizeIndianPhone } from '@shared/india';
import type { AddressInput } from '@shared/schemas';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { cn } from '@/lib/cn';

const STATE_OPTIONS = INDIAN_STATES.map((state) => ({ value: state, label: state }));

export interface AddressFieldsProps {
  register: UseFormRegister<AddressInput>;
  setValue: UseFormSetValue<AddressInput>;
  errors: FieldErrors<AddressInput>;
  /** Prefix for input ids (unique per form). */
  idPrefix?: string;
  disabled?: boolean;
  className?: string;
}

/** Indian delivery address fields (react-hook-form + AddressSchema). */
export function AddressFields({
  register,
  setValue,
  errors,
  idPrefix = 'ship',
  disabled = false,
  className,
}: AddressFieldsProps) {
  const id = (name: keyof AddressInput): string => `${idPrefix}-${name}`;

  return (
    <fieldset disabled={disabled} className={cn('grid gap-x-4 gap-y-5 sm:grid-cols-2', className)}>
      <legend className="sr-only">Delivery address</legend>

      <FormField label="Full name" htmlFor={id('name')} required error={errors.name?.message}>
        {(f) => (
          <Input
            id={f.id}
            autoComplete="name"
            aria-describedby={f.describedBy}
            invalid={f.invalid}
            aria-required="true"
            {...register('name')}
          />
        )}
      </FormField>

      <FormField
        label="Mobile number"
        htmlFor={id('phone')}
        required
        hint="10 digits — the courier calls this number"
        error={errors.phone?.message}
      >
        {(f) => (
          <Input
            id={f.id}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="98765 43210"
            maxLength={16}
            aria-describedby={f.describedBy}
            invalid={f.invalid}
            aria-required="true"
            leftIcon={<span className="font-mono text-xs">+91</span>}
            {...register('phone', {
              onBlur: (event: { target: { value: string } }) =>
                setValue('phone', normalizeIndianPhone(event.target.value), {
                  shouldValidate: true,
                }),
            })}
          />
        )}
      </FormField>

      <FormField
        label="House / flat no. and street"
        htmlFor={id('line1')}
        required
        error={errors.line1?.message}
        className="sm:col-span-2"
      >
        {(f) => (
          <Input
            id={f.id}
            autoComplete="address-line1"
            aria-describedby={f.describedBy}
            invalid={f.invalid}
            aria-required="true"
            {...register('line1')}
          />
        )}
      </FormField>

      <FormField
        label="Area / locality"
        htmlFor={id('line2')}
        optional
        error={errors.line2?.message}
        className="sm:col-span-2"
      >
        {(f) => (
          <Input
            id={f.id}
            autoComplete="address-line2"
            aria-describedby={f.describedBy}
            invalid={f.invalid}
            {...register('line2')}
          />
        )}
      </FormField>

      <FormField label="Landmark" htmlFor={id('landmark')} optional error={errors.landmark?.message}>
        {(f) => (
          <Input
            id={f.id}
            aria-describedby={f.describedBy}
            invalid={f.invalid}
            placeholder="Near the pit lane"
            {...register('landmark')}
          />
        )}
      </FormField>

      <FormField label="PIN code" htmlFor={id('pincode')} required error={errors.pincode?.message}>
        {(f) => (
          <Input
            id={f.id}
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={6}
            placeholder="400050"
            className="font-mono tracking-hud"
            aria-describedby={f.describedBy}
            invalid={f.invalid}
            aria-required="true"
            {...register('pincode')}
          />
        )}
      </FormField>

      <FormField label="City" htmlFor={id('city')} required error={errors.city?.message}>
        {(f) => (
          <Input
            id={f.id}
            autoComplete="address-level2"
            aria-describedby={f.describedBy}
            invalid={f.invalid}
            aria-required="true"
            {...register('city')}
          />
        )}
      </FormField>

      <FormField label="State / UT" htmlFor={id('state')} required error={errors.state?.message}>
        {(f) => (
          <Select
            id={f.id}
            autoComplete="address-level1"
            placeholder="Select state"
            options={STATE_OPTIONS}
            aria-describedby={f.describedBy}
            invalid={f.invalid}
            aria-required="true"
            {...register('state')}
          />
        )}
      </FormField>
    </fieldset>
  );
}
