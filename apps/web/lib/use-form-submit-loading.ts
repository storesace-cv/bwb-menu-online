"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const SUBMIT_LOADING_TIMEOUT_MS = 45000;

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
    // #region agent log
    fetch("http://127.0.0.1:7601/ingest/52367c06-eb17-45e9-837c-183658165c22", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "2129fe" }, body: JSON.stringify({ sessionId: "2129fe", location: "use-form-submit-loading.ts:formState_effect", message: "formState changed", data: { formState: formState != null ? String(formState) : "null", clearingSubmitting: true }, timestamp: Date.now(), hypothesisId: "H2" }) }).catch(() => {});
    // #endregion
  }, [formState]);

  useEffect(() => {
    return () => {
      const hadTimeout = !!timeoutRef.current;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      // #region agent log
      fetch("http://127.0.0.1:7601/ingest/52367c06-eb17-45e9-837c-183658165c22", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "2129fe" }, body: JSON.stringify({ sessionId: "2129fe", location: "use-form-submit-loading.ts:unmount", message: "hook unmount", data: { hadTimeout }, timestamp: Date.now(), hypothesisId: "H3" }) }).catch(() => {});
      // #endregion
    };
  }, []);

  const onSubmit = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setSubmitting(true);
    // #region agent log
    fetch("http://127.0.0.1:7601/ingest/52367c06-eb17-45e9-837c-183658165c22", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "2129fe" }, body: JSON.stringify({ sessionId: "2129fe", location: "use-form-submit-loading.ts:onSubmit", message: "submit start", data: { timeoutMs: SUBMIT_LOADING_TIMEOUT_MS }, timestamp: Date.now(), hypothesisId: "H1" }) }).catch(() => {});
    // #endregion
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      setSubmitting(false);
      // #region agent log
      fetch("http://127.0.0.1:7601/ingest/52367c06-eb17-45e9-837c-183658165c22", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "2129fe" }, body: JSON.stringify({ sessionId: "2129fe", location: "use-form-submit-loading.ts:timeout", message: "timeout fired", data: {}, timestamp: Date.now(), hypothesisId: "H3" }) }).catch(() => {});
      // #endregion
    }, SUBMIT_LOADING_TIMEOUT_MS);
  }, []);

  return [submitting, { onSubmit }];
}
