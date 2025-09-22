# Adventure Log

A social travel logging platform that transforms personal journeys into beautiful, shareable stories through interactive albums, photos, and an immersive 3D globe visualization.

## Features

- 🔐 **Authentication**: Complete Supabase Auth integration
- 📸 **Photo Management**: Upload, organize, and view photos with EXIF data
- 📱 **Album System**: Create and manage travel albums
- 🌍 **3D Globe**: Interactive visualization of your travels
- 💬 **Social Features**: Like and comment on albums and photos
- 📊 **Dashboard**: Travel statistics and insights

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **UI Components**: shadcn/ui
- **3D Visualization**: react-globe.gl
- **Deployment**: Vercel

## Project Structure

```
adventure-log/
├── src/                    # Source code
│   ├── app/               # Next.js app directory
│   ├── components/        # Reusable React components
│   ├── lib/              # Utility libraries and configurations
│   └── types/            # TypeScript type definitions
├── docs/                  # Project documentation
│   ├── API_DESIGN.md      # API design specifications
│   ├── CODING_STANDARDS.md # Code style guidelines
│   └── ...               # Other documentation
├── database/             # Database schemas and migrations
│   ├── database-setup.sql # Initial database setup
│   └── social-features-schema.sql # Social features schema
└── public/               # Static assets
```

## Production Status

This application is production-ready with:
- ✅ Zero TypeScript compilation errors
- ✅ Complete social features implementation
- ✅ Comprehensive error handling
- ✅ Mobile-responsive design
- ✅ Professional documentation
- ✅ ESLint errors resolved for production build
- ✅ Organized project structure
- ⚠️ Requires environment variables configuration in Vercel

### Deployment Configuration
To deploy to Vercel, configure these environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Built with [Claude Code](https://claude.ai/code)

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
