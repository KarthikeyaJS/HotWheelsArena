import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { IconButton, type IconButtonSize } from '@/components/ui/IconButton';
import { toast } from '@/store/toastStore';

export interface CopyButtonProps {
  value: string;
  /** Accessible name, e.g. "Copy order ID". */
  label: string;
  size?: IconButtonSize;
  className?: string;
}

async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall through to the legacy path (permissions / insecure context).
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    textarea.remove();
    return ok;
  } catch {
    return false;
  }
}

/** Copy-to-clipboard icon button with a ✓ confirmation and a polite announcement. */
export function CopyButton({ value, label, size = 'sm', className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <>
      <IconButton
        label={copied ? 'Copied' : label}
        icon={copied ? <Check className="text-success" /> : <Copy />}
        variant="outline"
        size={size}
        className={className}
        onClick={() => {
          void copyText(value).then((ok) => {
            if (ok) setCopied(true);
            else toast.error("Couldn't copy", 'Select the text and copy it manually.');
          });
        }}
      />
      <span className="sr-only" aria-live="polite">
        {copied ? 'Copied to clipboard' : ''}
      </span>
    </>
  );
}
