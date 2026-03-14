"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/** Max time to show loading when Server Action response never arrives (e.g. RSC fetch fails). */
const SUBMIT_LOADING_TIMEOUT_MS = 8000;

/**
 * Hook para mostrar estado de carregamento em formulários que usam useFormState.
 * Retorna submitting (true após submit até a action devolver) e formBind para colocar no <form>.
 * Se a resposta não chegar em SUBMIT_LOADING_TIMEOUT_MS, submitting volta a false para desbloquear o botão.
 */
export function useFormSubmitLoading(formState: unknown): [boolean, { onSubmit: () => void }] {
  const [submitting, setSubmitting] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setSubmitting(false);
  }, [formState]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const onSubmit = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setSubmitting(true);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      setSubmitting(false);
    }, SUBMIT_LOADING_TIMEOUT_MS);
  }, []);

  return [submitting, { onSubmit }];
}
