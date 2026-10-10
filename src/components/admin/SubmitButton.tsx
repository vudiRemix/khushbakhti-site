"use client";

import { useFormStatus } from "react-dom";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { pendingText?: string };

/** Submit button that shows progress and blocks double taps on slow mobile connections. */
export function SubmitButton({ children, className = "", pendingText = "Сохраняю…", disabled, ...rest }: Props) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" {...rest} disabled={pending || disabled} aria-busy={pending} className={`${className} disabled:opacity-60`}>
      {pending ? pendingText : children}
    </button>
  );
}
