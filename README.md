# AI-Powered Student Attendance Management System

A production-ready ERP system for colleges and schools, featuring Google Gemini AI-driven attendance forecasting, automated insights, chatbot query assistant, and markdown/PDF report generation.

---

## Technical Stack

- **Frontend**: React.js (Vite), React Router, Tailwind CSS, Axios, Recharts, React Toastify, Lucide icons.
- **Backend**: Node.js, Express.js.
- **Database**: MongoDB Atlas, Mongoose.
- **Authentication**: JWT, BCrypt password hashing.
- **AI Engine**: Google Gemini API (gemini-1.5-flash).

---

## Directory Structure

```
student/
├── backend/
│   ├── config/          # Configurations (Database, AI)
│   ├── controllers/     # Route logic
│   ├── middleware/      # JWT auth, NoSQL sanitization, error handler
│   ├── models/          # Mongoose models (User, Student, Attendance, Report, Settings)
│   ├── routes/          # Express API endpoints
│   ├── server.js        # Main server entrypoint
│   └── .env             # Environment variables
└── frontend/
    ├── src/
    │   ├── charts/      # Recharts visualizations
    │   ├── components/  # Navbars, Sidebars, Toast wrappers
    │   ├── context/     # AuthContext & AttendanceContext global state hooks
    │   ├── pages/       # Login, Dashboard, Student Database, Attendance Sheet, AI Predictor, AI Assistant, Backup
    │   ├── services/    # Axios API requests client
    │   ├── styles.css   # Styles (Tailwind directives + custom glassmorphic styling)
    │   └── main.jsx     # App mounting
    ├── tailwind.config.js
    └── postcss.config.js
```

---

## Environment Configuration

Create a `.env` file in the `backend/` directory:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/attendance_db?retryWrites=true&w=majority
JWT_SECRET=supersecretjwtkeyforstudentattendanceapp
GEMINI_API_KEY=your_gemini_api_key_here
```

---

## Installation & Running Locally

### 1. Run Backend
```bash
cd backend
npm install
npm start
```
*Port runs on `http://localhost:5000`*

### 2. Run Frontend
```bash
cd frontend
npm install
npm run dev
```
*Vite serves on `http://localhost:5173`*

---

## API Documentation

### Auth APIs
- `POST /api/auth/register` - Registers a new user. Body: `{ name, email, password, role }`.
- `POST /api/auth/login` - Authenticates credentials. Body: `{ email, password }` -> returns `{ token, user }`.
- `POST /api/auth/forgot-password` - Resets password for registered email. Body: `{ email, password }`.

### Student APIs
- `GET /api/students` - Query students with search, branch/section/year filtering, sorting, and pagination.
- `POST /api/students` - Add student. Body: `{ name, rollNumber, branch, section, year, mobile, email, gender }`.
- `PUT /api/students/:id` - Edit student.
- `DELETE /api/students/:id` - Cascades delete student and their logs.

### Attendance APIs
- `GET /api/attendance` - Query logs with date, student, branch, or year parameters.
- `POST /api/attendance` - Marks single or bulk student attendance. Prevents duplicates.
  - Single: `{ studentId, date, status }`
  - Bulk: `{ studentIds: [...], date, status }`
- `PUT /api/attendance/:id` - Modify record status.
- `DELETE /api/attendance/:id` - Remove record.

### Analytics APIs
- `GET /api/analytics/dashboard` - Fetches metrics: total student count, present/absent today, overall present %, students below 75% list, monthly trend logs, and recent activities.
- `GET /api/analytics/reports` - Compiles branch-wise stats, section-wise stats, and student attendance lists.

### AI (Gemini) APIs
- `POST /api/ai/predict` - Calls Gemini to predict a student's final semester attendance % and risk level (Low/Medium/High Risk).
- `POST /api/ai/insights` - Feeds aggregates to Gemini to compile natural language dashboard insights.
- `POST /api/ai/report` - Compiles daily, weekly, or monthly reports using Gemini analysis.
- `POST /api/ai/chat` - Chats with 'Dean Bot' assistant supplying student database context.

---

## Deployment Instructions

### Frontend (Vercel)
1. Install Vercel CLI: `npm i -g vercel`.
2. Run `vercel` in `frontend/` directory.
3. Configure `VITE_API_URL` to point to the hosted backend URL (e.g. `https://your-backend.render.com/api`).

### Backend (Render)
1. Push the repository to GitHub.
2. Link the repository to Render Web Service.
3. Set the Environment Variables (`MONGODB_URI`, `JWT_SECRET`, `GEMINI_API_KEY`).
4. Set Build Command: `npm install` and Start Command: `npm start`.
