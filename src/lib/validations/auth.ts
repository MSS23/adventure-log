import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

export const signupSchema = z.object({
  email: z.string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .transform((email) => email.toLowerCase().trim())
    .refine((email) => {
      // Basic email format validation
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
      return emailRegex.test(email)
    }, "Please enter a valid email address")
    .refine((email) => {
      // Only block obviously invalid formats
      if (email.includes('..') || email.includes(' ') || email.includes('\t') || email.includes('\n')) {
        return false
      }
      const domain = email.split('@')[1]
      if (!domain || domain.endsWith('.') || domain.startsWith('.')) {
        return false
      }
      return true
    }, "Email format is invalid"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export const profileSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must be less than 50 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  display_name: z.string().max(100, "Display name must be less than 100 characters").optional(),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
  website: z.string().optional().refine((val) => !val || val === "" || z.string().url().safeParse(val).success, "Please enter a valid URL"),
  location: z.string().max(100, "Location must be less than 100 characters").optional(),
})

export type LoginFormData = z.infer<typeof loginSchema>
export type SignupFormData = z.infer<typeof signupSchema>
export type ProfileFormData = z.infer<typeof profileSchema>