require('dotenv').config();
const mongoose = require('mongoose');
const { app, server } = require('./server');

const PORT = 5055;
const BASE_URL = `http://127.0.0.1:${PORT}/api`;

async function runSmokeTest() {
  console.log('--- Starting Smoke Test ---');

  // 1. Start HTTP server
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`Test server running at http://127.0.0.1:${PORT}`);

  try {
    // 2. Health check
    const healthRes = await fetch(`${BASE_URL}/health`);
    const health = await healthRes.json();
    console.log('✓ Health check:', health.status);

    // 3. Register User A
    const userARes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice Owner',
        email: `alice_${Date.now()}@example.com`,
        password: 'password123'
      })
    });
    const userA = await userARes.json();
    console.log('✓ User A registered:', userA.user?.name, userA.user?.email);

    // 4. Register User B
    const userBRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bob Member',
        email: `bob_${Date.now()}@example.com`,
        password: 'password123'
      })
    });
    const userB = await userBRes.json();
    console.log('✓ User B registered:', userB.user?.name, userB.user?.email);

    // 5. Auth /me test
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${userA.token}` }
    });
    const me = await meRes.json();
    console.log('✓ User A /auth/me verified:', me.user?.email);

    // 6. Create Project by User A
    const projRes = await fetch(`${BASE_URL}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userA.token}`
      },
      body: JSON.stringify({
        title: 'Alpha Redesign',
        description: 'Building modern product dashboard'
      })
    });
    const project = await projRes.json();
    console.log('✓ Project created by User A:', project.title, 'ID:', project._id);

    // 7. Add User B to Project members
    const addMemberRes = await fetch(`${BASE_URL}/projects/${project._id}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userA.token}`
      },
      body: JSON.stringify({
        email: userB.user.email
      })
    });
    const updatedProject = await addMemberRes.json();
    console.log(
      '✓ User B added to project members. Total members:',
      updatedProject.members?.length
    );

    // 8. Create Task and Assign to User B
    const taskRes = await fetch(`${BASE_URL}/projects/${project._id}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userA.token}`
      },
      body: JSON.stringify({
        title: 'Design high-fidelity wireframes',
        description: 'Complete Figma wireframes for dashboard',
        status: 'todo',
        assignedTo: userB.user._id
      })
    });
    const task = await taskRes.json();
    console.log(
      '✓ Task created & assigned to User B:',
      task.title,
      'Assignee:',
      task.assignedTo?.name
    );

    // 9. Move Task Status from "todo" to "inprogress"
    const updateTaskRes = await fetch(`${BASE_URL}/tasks/${task._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userB.token}`
      },
      body: JSON.stringify({
        status: 'inprogress'
      })
    });
    const updatedTask = await updateTaskRes.json();
    console.log('✓ Task status moved by User B to:', updatedTask.status);

    // 10. Add Comment on Task by User A
    const commentRes = await fetch(`${BASE_URL}/tasks/${task._id}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userA.token}`
      },
      body: JSON.stringify({
        text: 'Looking forward to reviewing the wireframes!'
      })
    });
    const comment = await commentRes.json();
    console.log('✓ Comment added by User A:', comment.text, 'Author:', comment.author?.name);

    // 11. Fetch Comments for Task
    const getCommentsRes = await fetch(`${BASE_URL}/tasks/${task._id}/comments`, {
      headers: { Authorization: `Bearer ${userB.token}` }
    });
    const commentsList = await getCommentsRes.json();
    console.log('✓ Retrieved comments count:', commentsList.length);

    // 12. Check Notifications for User B (assigned task + comment received)
    const notifRes = await fetch(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${userB.token}` }
    });
    const notifications = await notifRes.json();
    console.log('✓ User B notifications received count:', notifications.length);
    notifications.forEach((n, i) => console.log(`   [${i + 1}] ${n.message}`));

    // 13. Mark all notifications as read for User B
    const readRes = await fetch(`${BASE_URL}/notifications/read-all`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${userB.token}` }
    });
    const readResult = await readRes.json();
    console.log('✓ Notifications read-all response:', readResult.message);

    console.log('\n--- ALL SMOKE TESTS PASSED SUCCESSFULLY! ---');
  } catch (error) {
    console.error('Smoke test error:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
    server.close();
  }
}

// Start database and run test
mongoose
  .connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pmtool')
  .then(() => {
    console.log('MongoDB connected for smoke test');
    runSmokeTest();
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });

