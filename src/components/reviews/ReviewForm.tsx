import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, AlertTriangle, CheckCircle2, PenLine } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { REVIEW_TEXT_MAX, REVIEW_TEXT_MIN, ReviewFormSchema } from '@shared/schemas';
import { UserAvatar } from '@/components/layout/UserAvatar';
import { Button, FormField, StarRatingInput, Textarea, fieldErrorId } from '@/components/ui';
import { useSubmitReview } from '@/hooks/useReviews';
import { cn } from '@/lib/cn';
import { getFriendlyErrorMessage } from '@/lib/errors';
import type { Review, ReviewFormValues } from '@/types';

export interface ReviewFormProps {
  productId: string;
  productName: string;
  /** The signed-in collector's existing review (id === uid) — prefills the form (edit mode). */
  existingReview: Review | null;
  /** Shown in the "Posting as" line. */
  authorName: string;
  authorPhotoURL: string | null;
  className?: string;
}

const EMPTY_VALUES: ReviewFormValues = { rating: 0, text: '' };

function valuesFrom(review: Review | null): ReviewFormValues {
  return review ? { rating: review.rating, text: review.text } : EMPTY_VALUES;
}

/**
 * Write / edit a review: StarRatingInput + textarea validated with the shared zod schema
 * (`ReviewFormSchema` = `SubmitReviewSchema` without productId) through react-hook-form, posted
 * with `useSubmitReview` (the hook toasts on success). One review per collector per product:
 * an existing review prefills the form and the submit button becomes "Update review".
 * Server / network errors are shown inline with a friendly message.
 */
export function ReviewForm({
  productId,
  productName,
  existingReview,
  authorName,
  authorPhotoURL,
  className,
}: ReviewFormProps) {
  const baseId = useId();
  const ratingId = `${baseId}-rating`;
  const textId = `${baseId}-text`;
  const statusId = `${baseId}-status`;
  const isEditing = existingReview !== null;

  const mutation = useSubmitReview();
  const [justSaved, setJustSaved] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ReviewFormValues>({
    resolver: zodResolver(ReviewFormSchema),
    defaultValues: valuesFrom(existingReview),
  });

  // Prefill once the collector's review loads (or when a save / refetch changes it). Primitive
  // deps: a refetch returning the same review never wipes what the collector is typing.
  const existingRating = existingReview?.rating ?? EMPTY_VALUES.rating;
  const existingText = existingReview?.text ?? EMPTY_VALUES.text;
  useEffect(() => {
    reset({ rating: existingRating, text: existingText });
  }, [existingRating, existingText, reset]);

  const onSubmit = handleSubmit((values) => {
    setJustSaved(false);
    mutation.mutate(
      { productId, rating: values.rating, text: values.text, isUpdate: isEditing },
      {
        onSuccess: () => {
          setJustSaved(true);
          reset(values);
        },
      },
    );
  });

  const serverError = mutation.isError
    ? getFriendlyErrorMessage(mutation.error, "Couldn't post your review — try again in a moment.")
    : null;
  const ratingError = errors.rating?.message;

  return (
    <form
      noValidate
      onSubmit={(event) => void onSubmit(event)}
      aria-labelledby={`${baseId}-title`}
      aria-describedby={serverError || justSaved ? statusId : undefined}
      className={cn('flex flex-col gap-5', className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h3
          id={`${baseId}-title`}
          className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-display text-fg"
        >
          <PenLine aria-hidden="true" className="h-4 w-4 text-accent-ink" />
          {isEditing ? 'Edit your review' : 'Write a review'}
        </h3>
        <span className="flex min-w-0 max-w-full items-center gap-2 text-xs text-muted">
          <UserAvatar name={authorName} photoURL={authorPhotoURL} size="sm" />
          <span className="truncate">
            Posting as <span className="font-semibold text-fg">{authorName}</span>
          </span>
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <Controller
          control={control}
          name="rating"
          render={({ field }) => (
            <StarRatingInput
              ref={field.ref}
              name={ratingId}
              label={`Your rating for ${productName}`}
              value={field.value}
              onChange={(value) => {
                setJustSaved(false);
                field.onChange(value);
              }}
              invalid={Boolean(ratingError)}
              required
              size="lg"
              aria-describedby={ratingError ? fieldErrorId(ratingId) : undefined}
            />
          )}
        />
        {ratingError ? (
          <p
            id={fieldErrorId(ratingId)}
            className="flex items-start gap-1.5 text-xs font-medium text-danger-ink"
          >
            <AlertCircle aria-hidden="true" className="mt-px h-3.5 w-3.5 shrink-0" />
            <span>{ratingError}</span>
          </p>
        ) : null}
      </div>

      <FormField
        label="Your review"
        htmlFor={textId}
        required
        error={errors.text?.message}
        hint={`${REVIEW_TEXT_MIN}–${REVIEW_TEXT_MAX} characters. Paint, casting, wheels, shelf presence — tell the crew.`}
      >
        {(field) => (
          <Textarea
            id={field.id}
            rows={5}
            maxLength={REVIEW_TEXT_MAX}
            showCount
            placeholder="What makes this machine worth a spot in the garage?"
            aria-describedby={field.describedBy}
            invalid={field.invalid}
            aria-required
            {...register('text', { onChange: () => setJustSaved(false) })}
          />
        )}
      </FormField>

      <div id={statusId} aria-live="polite" className="empty:hidden">
        {serverError ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger-ink"
          >
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{serverError}</span>
          </p>
        ) : justSaved ? (
          <p className="flex items-start gap-2 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Your review is live on the grid. Thanks for sharing!</span>
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          loading={mutation.isPending}
          loadingText={isEditing ? 'Updating…' : 'Posting…'}
          disabled={isEditing && !isDirty && !mutation.isPending}
        >
          {isEditing ? 'Update review' : 'Post review'}
        </Button>
        {isEditing && isDirty && !mutation.isPending ? (
          <Button
            variant="ghost"
            onClick={() => {
              reset(valuesFrom(existingReview));
              mutation.reset();
            }}
          >
            Discard changes
          </Button>
        ) : null}
      </div>
    </form>
  );
}
