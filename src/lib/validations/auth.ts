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
    .min(1, "Profile name is required")
    .transform((val) => val.trim().toLowerCase())
    .refine((val) => val.length >= 3, "Profile name must be at least 3 characters")
    .refine((val) => val.length <= 50, "Profile name must be less than 50 characters")
    .refine((val) => /^[a-z0-9_]+$/.test(val), "Profile name can only contain lowercase letters, numbers, and underscores")
    .refine((val) => !val.startsWith('_') && !val.endsWith('_'), "Profile name cannot start or end with underscore")
    .refine((val) => !/_{2,}/.test(val), "Profile name cannot contain consecutive underscores")
    .refine((val) => {
      const reserved = ['admin', 'administrator', 'root', 'system', 'moderator', 'support', 'help', 'api', 'www', 'mail', 'ftp'];
      return !reserved.includes(val);
    }, "This profile name is reserved"),
  display_name: z.string()
    .transform((val) => val?.trim() || '')
    .refine((val) => !val || val.length <= 100, "Display name must be less than 100 characters")
    .optional(),
  bio: z.string()
    .transform((val) => val?.trim() || '')
    .refine((val) => !val || val.length <= 1000, "Bio must be less than 1000 characters")
    .optional(),
  website: z.string()
    .transform((val) => val?.trim() || '')
    .refine((val) => {
      if (!val) return true;
      try {
        const url = new URL(val.startsWith('http') ? val : `https://${val}`);
        return url.protocol === 'http:' || url.protocol === 'https:';
      } catch {
        return false;
      }
    }, "Please enter a valid website URL")
    .transform((val) => {
      if (!val) return '';
      return val.startsWith('http') ? val : `https://${val}`;
    })
    .optional(),
  location: z.string()
    .transform((val) => val?.trim() || '')
    .refine((val) => !val || val.length <= 100, "Location must be less than 100 characters")
    .optional(),
})

export type LoginFormData = z.infer<typeof loginSchema>
export type SignupFormData = z.infer<typeof signupSchema>
export type ProfileFormData = z.infer<typeof profileSchema>