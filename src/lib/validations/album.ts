import { z } from "zod"

// Helper to get today's date at midnight (to allow today's date)
const getTodayMidnight = () => {
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  return today
}

export const albumSchema = z.object({
  title: z.string()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters"),
  description: z.string()
    .max(1000, "Description must be less than 1000 characters")
    .optional(),
  visibility: z.enum(['private', 'friends', 'public'], {
    message: "Visibility is required"
  }),
  location_name: z.string()
    .max(200, "Location name must be less than 200 characters")
    .optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
}).refine((data) => {
  // Validate that end date is not before start date
  if (data.start_date && data.end_date) {
    return new Date(data.start_date) <= new Date(data.end_date)
  }
  return true
}, {
  message: "End date must be after or equal to start date",
  path: ["end_date"]
}).refine((data) => {
  // Validate that start date is not in the future
  if (data.start_date) {
    const startDate = new Date(data.start_date)
    const today = getTodayMidnight()
    return startDate <= today
  }
  return true
}, {
  message: "Start date cannot be in the future",
  path: ["start_date"]
}).refine((data) => {
  // Validate that end date is not in the future
  if (data.end_date) {
    const endDate = new Date(data.end_date)
    const today = getTodayMidnight()
    return endDate <= today
  }
  return true
}, {
  message: "End date cannot be in the future",
  path: ["end_date"]
})

export type AlbumFormData = z.infer<typeof albumSchema>