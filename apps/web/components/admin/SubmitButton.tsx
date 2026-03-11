"use client";

import { Button, Spinner } from "@/components/admin";

type ButtonVariant = "primary" | "secondary" | "success" | "danger" | "warning" | "outline";

type SubmitButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  submitting: boolean;
  loadingText: string;
  children: React.ReactNode;
};

export function SubmitButton({
  submitting,
  loadingText,
  children,
  disabled,
  ...rest
}: SubmitButtonProps) {
  return (
    <Button type="submit" disabled={disabled ?? submitting} {...rest}>
      {submitting ? (
        <>
          <Spinner className="w-4 h-4 mr-2 inline" aria-hidden />
          {loadingText}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
