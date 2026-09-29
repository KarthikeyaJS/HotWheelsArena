/**
 * ui-kit barrel: `import { Button, Modal, toast… } from '@/components/ui'`.
 * Docs: docs/components/ui-kit.md.
 */

/* Actions */
export { Button, type ButtonProps, type ButtonSize, type ButtonVariant } from './Button';
export {
  IconButton,
  type IconButtonProps,
  type IconButtonSize,
  type IconButtonVariant,
} from './IconButton';
export {
  buttonClasses,
  buttonGapClass,
  isExternalHref,
  type ButtonClassOptions,
} from './buttonStyles';

/* Tags, counts, status */
export { Chip, type ChipProps, type ChipSize, type ChipTone, type ChipVariant } from './Chip';
export { RarityChip, type RarityChipProps } from './RarityChip';
export { CountBadge, type CountBadgeProps, type CountBadgeTone } from './CountBadge';
export { Spinner, type SpinnerProps, type SpinnerSize } from './Spinner';
export { Skeleton, type SkeletonProps, type SkeletonVariant } from './Skeleton';
export {
  ProgressBar,
  type ProgressBarProps,
  type ProgressSize,
  type ProgressTone,
} from './ProgressBar';
export { StatBar, type StatBarProps } from './StatBar';
export { StarRating, type StarRatingProps, type StarRatingSize } from './StarRating';
export { PriceTag, type PriceTagProps, type PriceTagSize } from './PriceTag';
export {
  HudReadout,
  type HudReadoutProps,
  type HudReadoutSize,
  type HudReadoutTone,
} from './HudReadout';
export { Kbd, type KbdProps } from './Kbd';

/* Overlays & feedback */
export { Modal, type ModalProps, type ModalSize, type ModalTone } from './Modal';
export { Drawer, type DrawerProps, type DrawerSide, type DrawerSize } from './Drawer';
export { Toaster, type ToasterPosition, type ToasterProps } from './Toaster';
export { EmptyState, type EmptyStateProps } from './EmptyState';
export { ErrorState, type ErrorStateProps } from './ErrorState';
export { Portal, type PortalProps } from './Portal';

/* Navigation */
export { Tabs, type TabItem, type TabsProps } from './Tabs';
export { TabPanel, type TabPanelProps } from './TabPanel';
export { tabId, tabPanelId } from './tabIds';

/* Forms */
export { FormField, type FormFieldProps, type FormFieldRenderProps } from './FormField';
export { Input, type InputProps } from './Input';
export { Textarea, type TextareaProps } from './Textarea';
export { Select, type SelectOption, type SelectProps } from './Select';
export { Checkbox, type CheckboxProps } from './Checkbox';
export { RadioGroup, type RadioGroupProps, type RadioOption } from './RadioGroup';
export { StarRatingInput, type StarRatingInputProps } from './StarRatingInput';
export { RangeSlider, type RangeSliderProps, type RangeValue } from './RangeSlider';
export { QuantityStepper, type QuantityStepperProps } from './QuantityStepper';
export { fieldClasses, type FieldClassOptions, type FieldSize } from './fieldStyles';
export { fieldDescribedBy, fieldErrorId, fieldHintId, joinIds } from './formFieldIds';

/* Layout & typography */
export { Container, type ContainerProps, type ContainerSize } from './Container';
export {
  SectionHeading,
  type SectionHeadingProps,
  type SectionHeadingSize,
} from './SectionHeading';
export { VisuallyHidden, type VisuallyHiddenProps } from './VisuallyHidden';

/* Hooks & utilities */
export { useFocusTrap, getTabbableElements, type FocusTrapOptions } from './useFocusTrap';
export { useOverlayBehavior, type OverlayBehaviorOptions } from './useOverlayBehavior';
export { mergeRefs } from './mergeRefs';
