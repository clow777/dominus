"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { signInSchema, type SignInValues } from "@/lib/validations/auth";

export function SignInForm() {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({ resolver: zodResolver(signInSchema) });

  async function onSubmit(values: SignInValues) {
    setFormError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    }).catch(() => null);
    if (!res) return setFormError("Sem conexão. Tente novamente.");
    const data = await res.json().catch(() => ({}));
    // Navegação completa: garante que o próximo request já leve o cookie de sessão novo.
    if (res.ok) {
      window.location.assign(data.redirectTo ?? "/dashboard");
      return;
    }
    setFormError(data.error ?? "Não foi possível entrar.");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5">
      <Field label="E-mail" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
      <Field
        label="Senha"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register("password")}
      />
      {formError ? (
        <p role="alert" className="text-sm text-danger-text">
          {formError}
        </p>
      ) : null}
      <Button type="submit" size="lg" loading={isSubmitting}>
        Entrar
      </Button>
      <p className="text-sm text-steel">
        Ainda não tem conta?{" "}
        <Link href="/criar-conta" className="text-paper underline underline-offset-4">
          Criar conta
        </Link>
      </p>
    </form>
  );
}
