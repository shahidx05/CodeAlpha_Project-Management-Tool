import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import ProjectBoardPage from './pages/ProjectBoardPage';
import { useAuth } from './context/AuthContext';

function App() {
  const { user } = useAuth();

  return (
    <div className="app-layout">
      {user && <Navbar />}
      <main className="main-content">
        <Routes>
          <Route
            path="/login"
            element={user ? <Navigate to="/" replace /> : <AuthPage />}
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:id"
            element={
              <ProtectedRoute>
                <ProjectBoardPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;

