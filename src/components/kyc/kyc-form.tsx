"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Steps } from "@/components/ui/steps";
import { formatCPF } from "@/lib/validations/cpf";
import { kycFormSchema, type KycFormValues } from "@/lib/validations/kyc";

const STEPS = ["Documento", "Verso e selfie", "Revisão"];
const STEP_FIELDS: (keyof KycFormValues)[][] = [["documentType", "cpf", "front"], ["back", "selfie"], []];

function FileField({
  label,
  file,
  error,
  onChange,
  capture,
}: {
  label: string;
  file: File | undefined;
  error?: string;
  onChange: (file: File | undefined) => void;
  capture?: "user";
}) {
  const id = `file-${label}`;
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-paper-soft">
        {label}
      </label>
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture={capture}
        aria-invalid={error ? true : undefined}
        onChange={(e) => onChange(e.target.files?.[0])}
        className="block w-full rounded-md border border-line bg-ink-2 p-2.5 text-sm text-steel-light file:mr-3 file:rounded file:border-0 file:bg-ink-3 file:px-3 file:py-1.5 file:text-paper"
      />
      <p className="text-sm text-steel">{file ? file.name : "JPG, PNG ou WebP, até 5 MB."}</p>
      {error ? (
        <p role="alert" className="text-sm text-danger-text">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function KycForm({ rejectionReason }: { rejectionReason?: string | null }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    register,
    trigger,
    getValues,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<KycFormValues>({ resolver: zodResolver(kycFormSchema), defaultValues: { cpf: "" }, mode: "onTouched" });

  async function next() {
    if (await trigger(STEP_FIELDS[step])) setStep((s) => s + 1);
  }

  async function onSubmit(values: KycFormValues) {
    setFormError(null);
    const body = new FormData();
    body.set("documentType", values.documentType);
    body.set("cpf", values.cpf);
    body.set("front", values.front);
    body.set("back", values.back);
    body.set("selfie", values.selfie);

    const res = await fetch("/api/kyc/submit", { method: "POST", body }).catch(() => null);
    if (!res) return setFormError("Sem conexão. Tente novamente.");
    // 201 ou 409 (já enviado): em ambos o servidor passa a mostrar a tela de status.
    if (res.ok || res.status === 409) return router.refresh();
    const data = await res.json().catch(() => ({}));
    setFormError(data.error ?? "Não foi possível enviar. Tente novamente.");
  }

  const review = getValues();

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-8">
      <Steps steps={STEPS} current={step} />

      {rejectionReason ? (
        <p role="alert" className="rounded-md border border-danger-text/40 p-3 text-sm text-danger-text">
          Sua verificação anterior foi recusada: {rejectionReason} Envie os dados novamente.
        </p>
      ) : null}

      {step === 0 ? (
        <section className="grid gap-5" aria-label="Documento">
          <fieldset className="grid gap-1.5">
            <legend className="text-sm font-medium text-paper-soft">Tipo de documento</legend>
            <div className="flex gap-3">
              {(["RG", "CNH"] as const).map((type) => (
                <label key={type} className="flex h-11 flex-1 cursor-pointer items-center gap-2 rounded-md border border-line bg-ink-2 px-3.5 text-paper has-checked:border-paper">
                  <input type="radio" value={type} className="accent-current" {...register("documentType")} />
                  {type}
                </label>
              ))}
            </div>
            {errors.documentType ? (
              <p role="alert" className="text-sm text-danger-text">
                {errors.documentType.message}
              </p>
            ) : null}
          </fieldset>

          <Controller
            control={control}
            name="cpf"
            render={({ field }) => (
              <Field
                label="CPF"
                inputMode="numeric"
                autoComplete="off"
                placeholder="000.000.000-00"
                maxLength={14}
                error={errors.cpf?.message}
                name={field.name}
                ref={field.ref}
                onBlur={field.onBlur}
                value={field.value}
                onChange={(e) => field.onChange(formatCPF(e.target.value))}
              />
            )}
          />

          <Controller
            control={control}
            name="front"
            render={({ field }) => (
              <FileField label="Frente do documento" file={field.value} error={errors.front?.message} onChange={(f) => field.onChange(f)} />
            )}
          />
        </section>
      ) : null}

      {step === 1 ? (
        <section className="grid gap-5" aria-label="Verso e selfie">
          <Controller
            control={control}
            name="back"
            render={({ field }) => (
              <FileField label="Verso do documento" file={field.value} error={errors.back?.message} onChange={(f) => field.onChange(f)} />
            )}
          />
          <Controller
            control={control}
            name="selfie"
            render={({ field }) => (
              <FileField label="Selfie" capture="user" file={field.value} error={errors.selfie?.message} onChange={(f) => field.onChange(f)} />
            )}
          />
        </section>
      ) : null}

      {step === 2 ? (
        <section aria-label="Revisão">
          <dl className="grid gap-3 rounded-md border border-line p-4 text-sm">
            {[
              ["Tipo de documento", review.documentType],
              ["CPF", review.cpf],
              ["Frente", review.front?.name],
              ["Verso", review.back?.name],
              ["Selfie", review.selfie?.name],
            ].map(([term, value]) => (
              <div key={term} className="flex justify-between gap-4">
                <dt className="text-steel">{term}</dt>
                <dd className="truncate text-paper">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-sm text-steel">Confira os dados. Após o envio, a análise não pode ser alterada.</p>
        </section>
      ) : null}

      {formError ? (
        <p role="alert" className="text-sm text-danger-text">
          {formError}
        </p>
      ) : null}

      <div className="flex justify-between gap-3">
        {step > 0 ? (
          <Button type="button" variant="secondary" onClick={() => setStep((s) => s - 1)} disabled={isSubmitting}>
            Voltar
          </Button>
        ) : (
          <span />
        )}
        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={next}>
            Continuar
          </Button>
        ) : (
          <Button type="submit" loading={isSubmitting}>
            Enviar para análise
          </Button>
        )}
      </div>
    </form>
  );
}
