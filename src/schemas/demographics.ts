import { z } from "zod";

export const DemographicsSchema = z.object({
  firstName: z
    .string()
    .min(1, "Legal first name is required")
    .max(50)
    .trim(),
  lastName: z
    .string()
    .min(1, "Legal last name is required")
    .max(50)
    .trim(),
  // Ministry requires exact YYYYMMDD format for non-ODB claims verification
  dateOfBirth: z
    .string()
    .regex(/^\d{8}$/, "Date of birth must be exactly in YYYYMMDD format"),
  // Restricted strictly to the Ministry's F, M, U documentation options
  gender: z.enum(["F", "M", "U"], {
    message: "Gender must be Male (M), Female (F), or Unknown (U)",
  }),
  // Ontario Health Cards consist of a 10-digit string plus a 1-2 character version code
  healthCardNumber: z
    .string()
    .regex(/^\d{10}[A-Z]{0,2}$/, "Invalid Ontario Health Card number format"),
  isOdbRecipient: z.boolean({
    message: "Please specify your coverage status",
  }),
  pastYearAssessmentAttempt: z.enum(["YES", "NO", "NOT_SURE"], {
    message: "Please answer the 365-day tracking check",
  }),
  ailmentType: z.string().min(1, "Please select an ailment"),
});

export type DemographicsData = z.infer<typeof DemographicsSchema>;
