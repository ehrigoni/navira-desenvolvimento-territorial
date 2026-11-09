"use client";

import { startTransition, useEffect, useRef, type FormEvent } from "react";

export function useFormularioComValidacao(acao: (dados: FormData) => void, estado: { sucesso?: string }) {
  const formulario = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.sucesso) formulario.current?.reset();
  }, [estado]);

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    startTransition(() => acao(dados));
  }

  return { formulario, enviar };
}
