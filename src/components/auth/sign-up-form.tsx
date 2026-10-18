"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { signUpSchema, type SignUpValues } from "@/lib/validations/auth";

export function SignUpForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({ resolver: zodResolver(signUpSchema) });

  async function onSubmit(values: SignUpValues) {
    setFormError(null);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    }).catch(() => null);
    if (!res) return setFormError("Sem conexão. Tente novamente.");
    const data = await res.json().catch(() => ({}));
    if (res.ok) return router.push(data.redirectTo ?? "/kyc");
    if (res.status === 422 && data.fields) {
      for (const [name, messages] of Object.entries(data.fields as Record<string, string[]>)) {
        setError(name as keyof SignUpValues, { message: messages[0] });
      }
      return;
    }
    setFormError(data.error ?? "Não foi possível criar a conta.");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5">
      <Field label="Nome completo" autoComplete="name" error={errors.name?.message} {...register("name")} />
      <Field label="E-mail" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
      <Field
        label="Senha"
        type="password"
        autoComplete="new-password"
        hint="Mínimo de 10 caracteres."
        error={errors.password?.message}
        {...register("password")}
      />
      <Field
        label="Confirmar senha"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />
      {formError ? (
        <p role="alert" className="text-sm text-danger-text">
          {formError}
        </p>
      ) : null}
      <Button type="submit" size="lg" loading={isSubmitting}>
        Criar conta
      </Button>
      <p className="text-sm text-steel">
        Já tem conta?{" "}
        <Link href="/entrar" className="text-paper underline underline-offset-4">
          Entrar
        </Link>
      </p>
    </form>
  );
}
