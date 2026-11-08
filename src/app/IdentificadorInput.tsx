"use client";

import { useState, type ChangeEvent } from "react";

type Props = {
  id: string;
  name: string;
  autoComplete?: string;
  defaultValue?: string;
  placeholder?: string;
  "aria-invalid"?: boolean;
};

function formatarTelefone(valor: string) {
  const digitos = valor.replace(/\D/g, "").slice(0, 11);
  if (digitos.length < 2) return digitos ? `(${digitos}` : "";
  if (digitos.length === 2) return `(${digitos})`;

  const ddd = digitos.slice(0, 2);
  const numero = digitos.slice(2);
  const tamanhoPrimeiraParte = digitos.length > 10 ? 5 : 4;
  const primeiraParte = numero.slice(0, tamanhoPrimeiraParte);
  const segundaParte = numero.slice(tamanhoPrimeiraParte);

  return `(${ddd}) ${primeiraParte}${segundaParte ? `-${segundaParte}` : ""}`;
}

function formatarIdentificador(valor: string, veioDeTelefone = false) {
  if (/[a-zA-Z@]/.test(valor)) {
    return veioDeTelefone ? valor.replace(/[() -]/g, "") : valor;
  }
  return formatarTelefone(valor);
}

export default function IdentificadorInput(props: Props) {
  const [valor, setValor] = useState(() => formatarIdentificador(props.defaultValue ?? ""));

  function atualizar(e: ChangeEvent<HTMLInputElement>) {
    const formatado = formatarIdentificador(e.target.value, !/[a-zA-Z@]/.test(valor));
    setValor(formatado);
  }

  return (
    <input
      {...props}
      value={valor}
      onChange={atualizar}
      autoCapitalize="none"
      spellCheck={false}
    />
  );
}
