"use client";

import type { ChangeEvent } from "react";
import { mascararData } from "@/lib/data";

export default function DataInput({ id, name, invalid = false }: { id: string; name: string; invalid?: boolean }) {
  function atualizar(evento: ChangeEvent<HTMLInputElement>) {
    const campo = evento.currentTarget;
    let original = campo.value;
    let posicao = campo.selectionStart ?? original.length;
    const tipoEdicao = evento.nativeEvent instanceof InputEvent ? evento.nativeEvent.inputType : "";
    if (tipoEdicao === "deleteContentBackward" && (posicao === 2 || posicao === 5) && original[posicao] !== "/" && original[posicao - 1] !== "/") {
      original = original.slice(0, posicao - 1) + original.slice(posicao);
      posicao--;
    }
    const digitosAntes = original.slice(0, posicao).replace(/\D/g, "").length;
    const formatado = mascararData(original);
    campo.value = formatado;
    let cursor = 0;
    let digitos = 0;
    while (cursor < formatado.length && digitos < digitosAntes) {
      if (/\d/.test(formatado[cursor])) digitos++;
      cursor++;
    }
    if (posicao === original.length) cursor = formatado.length;
    campo.setSelectionRange(cursor, cursor);
  }

  return <input id={id} name={name} type="text" inputMode="numeric" placeholder="DD/MM/AAAA" maxLength={10} aria-invalid={invalid} onChange={atualizar} />;
}
