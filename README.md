# Elite Insights Dashboard (Next.js)

A clean, modern SaaS dashboard built with Next.js (App Router), Tailwind CSS v4, and Gemini AI. This project serves as a comprehensive analytical tool, switching seamlessly between local CSV data and a live Supabase database.

## 🚀 Deployment (Vercel)
This project is optimized for deployment on Vercel.

### **How to Deploy:**
1.  **Push to GitHub**: Ensure all changes are committed and pushed to your repo: `https://github.com/locus-1026/vc-dashboard-8.git`.
2.  **Connect to Vercel**: 
    - Go to [Vercel](https://vercel.com/) and click "Add New" -> "Project".
    - Import your GitHub repository.
3.  **Configure Environment Variables**: In your Vercel project settings, add:
    - `NEXT_PUBLIC_GEMINI_API_KEY`: Your Google AI Studio key.
    - `NEXT_PUBLIC_GEMINI_MODEL`: `gemini-2.5-flash`.
    - `DATA_SOURCE`: `supabase`.
    - `SUPABASE_URL`: Your Supabase project URL.
    - `SUPABASE_ANON_KEY`: Your Supabase API key.
4.  **Deploy**: Click "Deploy". Your dashboard is now live!

## ☁️ Supabase Cloud Setup
To use a real database in production:
1.  **SQL Editor**: Run the code in `schema.sql` to create the `sales_data` table.
2.  **Import Data**: Use the Supabase Table Editor to upload `public/data/sales_data.csv`.
3.  **Connect**: Ensure your env vars are set correctly.

## 🛠 Features
- **Next.js App Router**: Optimized performance and SEO.
- **API Routes**: Serverless functions for data fetching.
- **AI Intelligence**: Advanced insights powered by Google Gemini.
- **Hybrid Data Layer**: Local CSV fallback for easy development.
- **Elite UI**: Responsive, high-contrast design with Recharts.

## 📦 Tech Stack
- **Framework**: Next.js, React.
- **Styling**: Tailwind CSS v4, Lucide Icons.
- **Backend/DB**: Supabase, Next.js API Routes.
- **AI**: @google/generative-ai.

## 🛠 Local Setup
1. `npm install`
2. Create `.env.local` based on `.env.example`.
3. `npm run dev`
