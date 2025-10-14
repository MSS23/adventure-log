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
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .refine((password) => /[a-z]/.test(password), "Password must contain at least one lowercase letter")
    .refine((password) => /[A-Z]/.test(password), "Password must contain at least one uppercase letter")
    .refine((password) => /\d/.test(password), "Password must contain at least one number")
    .refine((password) => /[!@#$%^&*(),.?":{}|<>]/.test(password), "Password must contain at least one special character"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export const profileSchema = z.object({
  username: z.string()
    .min(3, "Profile name must be at least 3 characters")
    .max(50, "Profile name must be less than 50 characters")
    .refine((val) => !/\s/.test(val), "Profile name cannot contain spaces")
    .regex(/^[a-zA-Z0-9_]+$/, "Profile name can only contain letters, numbers, and underscores")
    .refine((val) => {
      const lower = val.toLowerCase()
      return !lower.startsWith('_') && !lower.endsWith('_')
    }, "Profile name cannot start or end with underscore")
    .refine((val) => !/_{2,}/.test(val), "Profile name cannot contain consecutive underscores")
    .refine((val) => {
      const reserved = ['admin', 'administrator', 'root', 'system', 'moderator', 'support', 'help', 'api', 'www', 'mail', 'ftp']
      return !reserved.includes(val.toLowerCase())
    }, "This profile name is reserved"),
  display_name: z.string().max(100, "Display name must be less than 100 characters").optional().or(z.literal('')),
  bio: z.string().max(1000, "Bio must be less than 1000 characters").optional().or(z.literal('')),
  website: z.string()
    .optional()
    .or(z.literal(''))
    .refine((val) => {
      if (!val) return true
      try {
        const url = new URL(val.startsWith('http') ? val : `https://${val}`)
        return url.protocol === 'http:' || url.protocol === 'https:'
      } catch {
        return false
      }
    }, "Please enter a valid website URL"),
  location: z.string().max(100, "Location must be less than 100 characters").optional().or(z.literal('')),
})

export type LoginFormData = z.infer<typeof loginSchema>
export type SignupFormData = z.infer<typeof signupSchema>
export type ProfileFormData = z.infer<typeof profileSchema>