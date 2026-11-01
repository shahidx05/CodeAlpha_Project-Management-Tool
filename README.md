# TaskBoard: Project Management Tool

A simple Trello/Asana-style collaborative tool built with the MERN stack. Users can create group projects, assign tasks, and discuss inside tasks, with live updates and notifications through WebSockets.

**Built by:** Shahid Khan
**Submitted for:** CodeAlpha Internship, Task 3

---

## Features

- User registration and login (JWT authentication)
- Create projects and add members by email
- Project board with 3 columns: To Do, In Progress, Done
- Create, edit, assign, move, and delete tasks
- Comments inside each task
- Real-time board updates with Socket.io
- Notification bell with unread count (on task assignment and new comments)

## Tech Stack

| Layer     | Technology                                  |
|-----------|---------------------------------------------|
| Frontend  | React (Vite), React Router, Axios, plain CSS |
| Backend   | Node.js, Express                            |
| Database  | MongoDB with Mongoose                       |
| Auth      | JWT, bcryptjs                               |
| Real-time | Socket.io                                   |

---

## Project Structure

```
project-root/
├── server/
│   ├── models/          # Mongoose schemas
│   │   ├── User.js
│   │   ├── Project.js
│   │   ├── Task.js
│   │   ├── Comment.js
│   │   └── Notification.js
│   ├── routes/          # API route definitions
│   ├── controllers/     # Logic for each route
│   ├── middleware/      # JWT auth middleware
│   ├── server.js        # Entry point (Express + Socket.io)
│   ├── .env.example
│   └── package.json
│
├── client/
│   ├── src/
│   │   ├── pages/       # Login, Dashboard, ProjectBoard
│   │   ├── components/  # Navbar, TaskCard, TaskModal, ProtectedRoute
│   │   ├── api.js       # Axios setup with token interceptor
│   │   ├── App.jsx      # Routes
│   │   └── main.jsx
│   └── package.json
│
└── README.md
```

## How It Works

1. A user registers or logs in and receives a JWT, which is stored in localStorage.
2. Axios attaches the token to every request, and the backend middleware verifies it.
3. Users create projects and add other users as members.
4. Tasks belong to a project and can be assigned to any project member.
5. Only project members can view or change that project's tasks and comments.
6. When a task or comment changes, the server emits a Socket.io event to the project room, so everyone's board updates instantly.
7. Assigning a task or commenting on an assigned task creates a notification for that user, delivered live to their bell icon.

---

## Setup and Installation

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local install or a free MongoDB Atlas URI)

### 1. Clone the repository
```bash
git clone https://github.com/shahidx05/CodeAlpha_Project-Management-Tool.git
cd CodeAlpha_Project-Management-Tool
```

### 2. Backend setup
```bash
cd server
npm install
cp .env.example .env
```

Edit `.env`:
```
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=any_long_random_string
```

Start the server:
```bash
npm run dev
```

### 3. Frontend setup
Open a new terminal:
```bash
cd client
npm install
npm run dev
```

The app runs at `http://localhost:5173` and the API at `http://localhost:5000`.

---

## API Overview

| Method | Endpoint                        | Description                    |
|--------|---------------------------------|--------------------------------|
| POST   | /api/auth/register              | Register a new user            |
| POST   | /api/auth/login                 | Login and get a token          |
| GET    | /api/auth/me                    | Get the current user           |
| GET    | /api/users                      | List users                     |
| POST   | /api/projects                   | Create a project               |
| GET    | /api/projects                   | List my projects               |
| GET    | /api/projects/:id               | Get one project                |
| POST   | /api/projects/:id/members       | Add a member by email          |
| POST   | /api/projects/:id/tasks         | Create a task                  |
| GET    | /api/projects/:id/tasks         | List a project's tasks         |
| PUT    | /api/tasks/:id                  | Update, assign, or move a task |
| DELETE | /api/tasks/:id                  | Delete a task                  |
| POST   | /api/tasks/:id/comments         | Add a comment                  |
| GET    | /api/tasks/:id/comments         | List a task's comments         |
| GET    | /api/notifications              | List my notifications          |
| PUT    | /api/notifications/read-all     | Mark all as read               |

## Socket.io Events

| Event             | Direction        | Purpose                          |
|-------------------|------------------|----------------------------------|
| join-project      | client → server  | Join a project's room            |
| task-created      | server → client  | A new task was added             |
| task-updated      | server → client  | A task was edited or moved       |
| task-deleted      | server → client  | A task was removed               |
| comment-added     | server → client  | A new comment was posted         |
| notification      | server → client  | A new notification for the user  |

---

## How to Test (Quick Manual Check)

1. Register two users in two different browsers.
2. User A creates a project and adds User B by email.
3. User A creates a task and assigns it to User B.
4. User B should see the task appear and get a notification live.
5. Move the task between columns and add comments from both users.

## Known Limitations / Future Improvements

- No drag-and-drop (status changes use a dropdown)
- No automated tests (manual testing only)
- Basic UI by design
- Possible additions: due dates, labels, file attachments, project roles

## Author

Shahid Khan  
- **GitHub:** [shahidx05/CodeAlpha_Project-Management-Tool](https://github.com/shahidx05/CodeAlpha_Project-Management-Tool)  
- **LinkedIn:** [shahidx05](https://www.linkedin.com/in/shahidx05)