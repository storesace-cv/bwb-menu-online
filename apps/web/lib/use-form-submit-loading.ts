"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Hook para mostrar estado de carregamento em formulários que usam useFormState.
 * Retorna submitting (true após submit até a action devolver) e formBind para colocar no <form>.
 */
export function useFormSubmitLoading(formState: unknown): [boolean, { onSubmit: () => void }] {
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setSubmitting(false);
  }, [formState]);

  const onSubmit = useCallback(() => {
    setSubmitting(true);
  }, []);

  return [submitting, { onSubmit }];
}
