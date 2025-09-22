import { z } from "zod"

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
  if (data.start_date && data.end_date) {
    return new Date(data.start_date) <= new Date(data.end_date)
  }
  return true
}, {
  message: "End date must be after start date",
  path: ["end_date"]
})

export type AlbumFormData = z.infer<typeof albumSchema>