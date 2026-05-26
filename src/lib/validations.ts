// Single source of truth for application form validation.
// The client validates against this for nice errors; the server
// re-validates the same way before writing to the database so a
// hostile client can't bypass the rules.

import { z } from "zod";

export const applicationSchema = z
  .object({
    type: z.enum(["couple", "solo"]),
    p1Name: z.string().trim().min(1, "Required"),
    p1Age: z.coerce.number().int().min(21, "21 or older"),
    p2Name: z.string().trim().optional(),
    p2Age: z.coerce.number().int().min(21).optional(),

    email: z.string().trim().email("Doesn't look like an email"),
    phone: z.string().trim().min(7, "Add a real number"),
    city: z.string().trim().min(1).default("Las Vegas"),

    // Socials are how we verify the applicant is real — at least one
    // public-facing page where we can confirm they exist. Required
    // for the primary applicant; for couples, required for both.
    p1Socials: z.string().trim().min(2, "Required"),
    p2Socials: z.string().trim().optional().default(""),

    essay: z.string().trim().min(60, "Tell us a little more — 60 chars minimum"),
    referral: z.string().trim().min(2, "Required"),
  })
  .superRefine((v, ctx) => {
    if (v.type === "couple") {
      if (!v.p2Name) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["p2Name"],
          message: "Both names required for a couple",
        });
      }
      if (v.p2Age === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["p2Age"],
          message: "Both ages required for a couple",
        });
      }
      if (!v.p2Socials || v.p2Socials.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["p2Socials"],
          message: "Required",
        });
      }
    }
  });

export type ApplicationInput = z.infer<typeof applicationSchema>;
