import { z } from "zod";

export const signUpSchema = z
  .object({
    name: z.string().trim().min(2, "Informe seu nome completo").max(200),
    email: z.string().trim().toLowerCase().email("E-mail inválido").max(320),
    password: z.string().min(10, "Use ao menos 10 caracteres").max(128),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não conferem",
  });

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido").max(320),
  password: z.string().min(1, "Informe a senha").max(128),
});

export type SignUpValues = z.input<typeof signUpSchema>;
export type SignInValues = z.input<typeof signInSchema>;
