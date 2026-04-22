# Personal Fitness and Workout Planner App

This project is a fitness planning and workout tracking application built with `Vue 3`, `Vite`, `Supabase`, and `Node.js`. It supports user registration and login, onboarding data collection, initial training recommendations, body-metric tracking, nutrition logging, and daily workout management.

The project is connected to a cloud-hosted Supabase database and already has a live deployed version.

## Online Demo

- Frontend: `https://www.keepfit.it.com/`
- Auth / API server: `https://api.keepfit.it.com`

## Core Features

- User registration, login, and logout
- Google OAuth sign-in
- New-user onboarding questionnaire
- Initial workout recommendation based on onboarding answers
- Dashboard with weight, training, nutrition, and trend summaries
- Plan page with goals, daily challenges, weight, and body-composition data
- Nutrition page for food intake logging and nutrition targets
- Workout Log and Schedule pages for training planning and execution
- Profile and Settings pages for personal data and app preferences
- Cloud data storage through Supabase

## Onboarding Questionnaire

The current onboarding flow covers the following key information:

- Biological sex
- Date of birth
- Height
- Weight
- Body fat percentage
- Training goal
- Weekly training frequency
- Nutrition outlook
- Training environment / equipment setup `training_setup`
- Injury / movement limitations `movement_limitations`
- Available session duration `session_duration`

The database migration for the newly added onboarding fields is:

- [supabase/migrations/20260421_user_onboarding_expansion.sql](/Users/ycr/Desktop/Fitness%20web%20代码/Fitness-project/supabase/migrations/20260421_user_onboarding_expansion.sql)

## Tech Stack

- Frontend: `Vue 3`, `Vite`, `Pinia`, `Vue Router`
- Backend: `Node.js`, `Express`
- Database: `Supabase Postgres`
- ORM / DB client: `Prisma`, `pg`
- Authentication: `Supabase Auth`, Google OAuth
- Deployment: Vercel frontend with a deployed Node API server

## Project Structure

```text
Fitness-project/
├── src/                    # Main frontend application
│   ├── components/         # Reusable UI components
│   ├── composables/        # Reusable composition logic
│   ├── lib/                # Cloud state, onboarding, and utility modules
│   ├── pages/              # Route-level pages
│   ├── router/             # Router configuration
│   └── stores/             # Pinia state stores
├── server/                 # Node.js auth and API service
├── supabase/
│   ├── migrations/         # Database migration SQL files
│   └── seeds/              # Seed data
├── scripts/                # Import and utility scripts
├── public/                 # Static assets
└── vercel.json             # Frontend deployment configuration
```

## Main Pages

- `/` Landing page
- `/register` Registration page
- `/login` Login page
- `/onboarding` Post-registration questionnaire
- `/dashboard` Main dashboard
- `/plan` Training plan and goal page
- `/progress` Progress and body-data page
- `/schedule` Workout schedule page
- `/nutrition` Nutrition tracking page
- `/logs` Workout and activity logs
- `/muscle-map` Muscle map page
- `/profile` User profile page
- `/settings` Settings page

## Local Development

### Quick Reproduction Guide

For supervisor / examiner local reproduction, the startup commands should be documented explicitly.

Recommended local startup flow:

1. Open a terminal in the project root:

```bash
cd Fitness-project
npm install
npm run dev
```

2. Open a second terminal for the API server:

```bash
cd Fitness-project/server
npm install
npm run dev
```

3. Open the app in the browser:

- Frontend: `http://localhost:5173`
- API server: `http://localhost:4000`

If the supervisor only needs to review the final system behavior, the deployed version can be used directly:

- Frontend: `https://www.keepfit.it.com/`
- Auth / API server: `https://api.keepfit.it.com`

### 1. Install dependencies

Install frontend dependencies from the project root:

```bash
npm install
```

Install backend dependencies inside the `server` directory:

```bash
cd server
npm install
```

### 2. Configure environment variables

The frontend uses the root `.env` / `.env.local` files. See:

- [.env.example](/Users/ycr/Desktop/Fitness%20web%20代码/Fitness-project/.env.example)

The backend uses:

- [server/.env.example](/Users/ycr/Desktop/Fitness%20web%20代码/Fitness-project/server/.env.example)

Minimum frontend variables:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_AUTH_SERVER_ORIGIN=
```

Minimum backend variables:

```env
PORT=4000
APP_ORIGIN=http://localhost:5173
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
JWT_SECRET=
DATABASE_URL=
```

If Google login, email verification, or AI features are enabled, the following should also be configured:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `RESEND_API_KEY`
- `AI_CHAT_API_URL`
- `AI_CHAT_API_KEY`

Important note for AI reproduction:

- The AI service currently depends on a RunPod-hosted machine.
- If that RunPod machine is deleted or recreated, `AI_CHAT_API_URL` may change.
- If the AI feature does not open or respond during reproduction, first check the latest GitHub version of this project and update the backend `.env` accordingly.
- For any future maintenance or reproduction after handover, treat the latest GitHub repository state as the primary source of truth for AI endpoint updates.

### 3. Start the project

Start the frontend development server:

```bash
npm run dev
```

Start the backend development server:

```bash
cd server
npm run dev
```

Default local addresses:

- Frontend: `http://localhost:5173`
- Server: `http://localhost:4000`

### 4. Handover Notes

For supervisor, examiner, or future-maintainer reproduction, the following handover notes should be read together with the startup steps above:

- Use `Node.js 20.x` for local reproduction.
- Prepare the required `.env` files before starting either the frontend or backend.
- Run the frontend from the project root and the backend from `Fitness-project/server` in two separate terminals.
- Confirm whether the Supabase schema and seed data already exist, or whether the SQL files in `supabase/` must be executed first.
- Google OAuth is optional for evaluation unless that specific sign-in path is being tested.
- The AI service depends on a RunPod-hosted machine, so `AI_CHAT_API_URL` is not guaranteed to stay constant over time.
- If the RunPod machine is deleted, recreated, or replaced, update the backend `.env` with the current `AI_CHAT_API_URL` before testing AI features.
- If the AI chat endpoint stops working in a later reproduction, use the latest GitHub repository version as the primary reference for endpoint updates and deployment notes.

## Available Scripts

### Frontend

```bash
npm run dev
npm run build
npm run preview
npm run import:free-exercise-db
npm run import:nutrition-foods
```

### Server

```bash
cd server
npm run dev
npm run prisma:generate
npm run prisma:migrate
```

## Database

The project uses Supabase as the cloud database. It stores:

- User profiles
- Onboarding questionnaire answers
- User plans
- Weight and body-metric records
- Nutrition logs
- Water intake records
- Workout entries and workout logs
- User client state and settings

Database migration files are located in:

- [supabase/migrations](/Users/ycr/Desktop/Fitness%20web%20代码/Fitness-project/supabase/migrations)

Nutrition seed data is located in:

- [supabase/seeds/nutrition_foods_seed.sql](/Users/ycr/Desktop/Fitness%20web%20代码/Fitness-project/supabase/seeds/nutrition_foods_seed.sql)

## Deployment

The frontend uses a Vercel SPA rewrite configuration:

- [vercel.json](/Users/ycr/Desktop/Fitness%20web%20代码/Fitness-project/vercel.json)

Its purpose is to route frontend refreshes back to `index.html` so client-side routes do not return `404`.

## Notes

- `README.md` is a project documentation file and does not affect application runtime.
- `.sql` files are used for schema creation, schema updates, constraints, and seed data.
- `.env` files store local environment variables and real secrets should not be exposed publicly.
- Plaintext passwords should not be stored in the browser.

## Current Status

The current version already includes:

- Expanded onboarding fields with cloud synchronization
- Closed-loop initial workout recommendation logic
- Fixed dashboard and plan weight-trend behavior
- Logout flash fix
- Restored native birthday picker on the registration page
- Cleanup of unused isolated frontend files

## Author

Graduation project by `ycr`.
