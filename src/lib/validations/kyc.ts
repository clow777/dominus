import { z } from "zod";

import { cpfSchema } from "./cpf";

export const KYC_MAX_FILE_BYTES = 5 * 1024 * 1024;
export const KYC_ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;

export const documentTypeSchema = z.enum(["RG", "CNH"], { message: "Selecione o tipo de documento" });

export const kycFileSchema = z
  .instanceof(File, { message: "Envie um arquivo" })
  .refine((f) => f.size > 0, "Arquivo vazio")
  .refine((f) => f.size <= KYC_MAX_FILE_BYTES, "O arquivo deve ter no máximo 5 MB")
  .refine((f) => (KYC_ALLOWED_MIME as readonly string[]).includes(f.type), "Use JPG, PNG ou WebP");

export const kycFieldsSchema = z.object({
  documentType: documentTypeSchema,
  cpf: cpfSchema,
});

export const kycFormSchema = kycFieldsSchema.extend({
  front: kycFileSchema,
  back: kycFileSchema,
  selfie: kycFileSchema,
});

export type KycFormValues = z.input<typeof kycFormSchema>;
