# ⚡ TaskFlow — MERN Project Management App

A full-stack project & task management application built with the MERN stack, featuring role-based access control, kanban boards, and real-time dashboards.

---

## 🚀 Live Demo

> **Live URL:** [Deploy to Railway using steps below]  
> **Demo Admin:** admin@demo.com / demo123  
> **Demo Member:** member@demo.com / demo123

---

## ✨ Features

| Feature | Details |
|---|---|
| 🔐 Auth | JWT-based signup/login with role selection |
| 👑 RBAC | Admin (full control) vs Member (contribute) |
| 📁 Projects | Create, edit, delete with colors, status, priority, due dates |
| 🧩 Team | Invite members by email, manage roles, remove members |
| ✅ Tasks | Create/assign tasks with status, priority, due dates |
| 🗂 Kanban | Drag-style status updates in a 4-column board |
| 📊 Dashboard | Stats, progress bars, my tasks, overdue alerts |
| 🔍 Filters | Filter tasks by status, priority, overdue, search |
| 💬 Comments | Add comments to tasks |
| 📱 Responsive | Works on mobile, tablet, desktop |

---

## 🛠 Tech Stack

**Backend**
- Node.js + Express — REST API
- MongoDB + Mongoose — Database & ODM
- JWT (jsonwebtoken) — Authentication
- bcryptjs — Password hashing
- express-validator — Input validation

**Frontend**
- React 18 — UI framework
- React Router v6 — Client-side routing
- Axios — HTTP client
- react-hot-toast — Notifications
- lucide-react — Icons
- date-fns — Date formatting

---

## 📁 Project Structure

```
taskflow/
├── backend/
│   ├── models/
│   │   ├── User.js         # User schema (name, email, password, role)
│   │   ├── Project.js      # Project schema (members, status, priority)
│   │   └── Task.js         # Task schema (assignee, status, comments)
│   ├── routes/
│   │   ├── auth.js         # POST /register, /login, GET /me
│   │   ├── projects.js     # Full CRUD + member management
│   │   ├── tasks.js        # Full CRUD + comments + dashboard
│   │   └── users.js        # User search
│   ├── middleware/
│   │   └── auth.js         # JWT protect, project role check
│   └── server.js           # Express app entry point
├── frontend/
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── context/
│       │   └── AuthContext.js   # Global auth state
│       ├── utils/
│       │   └── api.js           # Axios instance + API helpers
│       ├── pages/
│       │   ├── LoginPage.js
│       │   ├── RegisterPage.js
│       │   ├── DashboardPage.js
│       │   ├── ProjectsPage.js
│       │   ├── ProjectDetailPage.js  # Kanban board
│       │   ├── TasksPage.js
│       │   └── ProfilePage.js
│       └── components/
│           └── layout/
│               └── Layout.js    # Sidebar navigation
├── railway.toml
├── nixpacks.toml
└── README.md
```

---

## 🔌 API Reference

### Auth
| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/api/auth/register` | Register new user | Public |
| POST | `/api/auth/login` | Login | Public |
| GET | `/api/auth/me` | Get current user | Private |
| PUT | `/api/auth/profile` | Update profile | Private |

### Projects
| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/projects` | Get user's projects | Member |
| POST | `/api/projects` | Create project | Any |
| GET | `/api/projects/:id` | Project details | Member |
| PUT | `/api/projects/:id` | Update project | Admin |
| DELETE | `/api/projects/:id` | Delete project | Admin |
| POST | `/api/projects/:id/members` | Add member by email | Admin |
| DELETE | `/api/projects/:id/members/:userId` | Remove member | Admin |
| PUT | `/api/projects/:id/members/:userId/role` | Change role | Admin |

### Tasks
| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/tasks` | Get tasks (with filters) | Member |
| GET | `/api/tasks/dashboard` | Dashboard stats | Member |
| GET | `/api/tasks/project/:id` | Project tasks | Member |
| POST | `/api/tasks` | Create task | Member |
| PUT | `/api/tasks/:id` | Update task | Member |
| DELETE | `/api/tasks/:id` | Delete task | Admin/Reporter |
| POST | `/api/tasks/:id/comments` | Add comment | Member |

---

## ⚙️ Local Development

### Prerequisites
- Node.js 18+
- MongoDB (local) or MongoDB Atlas

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/yourusername/taskflow.git
cd taskflow

# 2. Setup Backend
cd backend
cp .env.example .env
# Edit .env with your MONGO_URI and JWT_SECRET
npm install
npm run dev

# 3. Setup Frontend (new terminal)
cd frontend
npm install
npm start
```

App runs at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api

### Seed Demo Users (optional)

```bash
# In /backend directory, run this in mongo shell or Compass:
# OR use the register endpoint twice:
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Demo Admin","email":"admin@demo.com","password":"demo123","role":"admin"}'

curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Demo Member","email":"member@demo.com","password":"demo123","role":"member"}'
```

---

## 🚂 Deployment on Railway

### Step 1: Setup MongoDB Atlas

1. Go to [mongodb.com/atlas](https://cloud.mongodb.com)
2. Create a free cluster
3. Create a database user with password
4. Whitelist `0.0.0.0/0` in Network Access
5. Copy the connection string:  
   `mongodb+srv://username:password@cluster.mongodb.net/taskflow`

### Step 2: Deploy to Railway

1. Push your code to GitHub
2. Go to [railway.app](https://railway.app) → New Project
3. Select **"Deploy from GitHub repo"** → choose `taskflow`
4. Railway auto-detects `nixpacks.toml` for build instructions

### Step 3: Set Environment Variables in Railway

In your Railway project → **Variables** tab, add:

```
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/taskflow
JWT_SECRET=your_super_secret_key_minimum_32_chars
CLIENT_URL=https://your-app.railway.app
```

### Step 4: Configure Domain

1. In Railway → **Settings** → **Networking** → Generate Domain
2. Your app will be live at `https://taskflow-xxx.railway.app`

### Step 5: Seed Demo Accounts

After deployment, call these endpoints once:

```bash
curl -X POST https://your-app.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Demo Admin","email":"admin@demo.com","password":"demo123","role":"admin"}'

curl -X POST https://your-app.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Demo Member","email":"member@demo.com","password":"demo123","role":"member"}'
```

---

## 🔐 Role-Based Access Control

### Global Roles (User Model)
| Role | Description |
|---|---|
| `admin` | Platform admin — can create projects |
| `member` | Standard user — joins via invite |

### Project Roles (Per-project membership)
| Role | Permissions |
|---|---|
| `admin` | Edit project, add/remove members, change roles, delete tasks |
| `member` | View project, create tasks, update own tasks, add comments |

> Project **owner** always has admin role and cannot be removed.

---

## 📄 License

MIT — free to use and modify.
