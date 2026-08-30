import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from "react-router-dom";

import QuestionReview
  from "./pages/QuestionReview";

import CreateTest from "./pages/CreateTest";
import TestDetails from "./pages/TestDetails";
import TestConfiguration from "./pages/TestConfiguration";
import PublicTestJoin from "./pages/PublicTestJoin";
import TestTaking from "./pages/TestTaking";
import TestResults from "./pages/TestResults";
import AttemptDetail from "./pages/AttemptDetail";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { Navbar } from "./components/layout/Navbar";
import { LoadingSpinner } from "./components/ui/LoadingSpinner";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner text="Loading session..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Navigate
            to="/dashboard"
            replace
          />
        }
      />

      <Route
        path="/tests/:id/questions"
        element={
          <ProtectedRoute>
            <QuestionReview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/register"
        element={<Register />}
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/tests/create"
        element={
          <ProtectedRoute>
            <CreateTest />
          </ProtectedRoute>
        }
      />

      <Route
        path="/tests/:id"
        element={
          <ProtectedRoute>
            <TestDetails />
          </ProtectedRoute>
        }
      />

      <Route
        path="/tests/:id/configure"
        element={
          <ProtectedRoute>
            <TestConfiguration />
          </ProtectedRoute>
        }
      />

      <Route
        path="/tests/:id/results"
        element={
          <ProtectedRoute>
            <TestResults />
          </ProtectedRoute>
        }
      />

      <Route
        path="/tests/:id/results/:attemptId"
        element={
          <ProtectedRoute>
            <AttemptDetail />
          </ProtectedRoute>
        }
      />

      <Route
        path="/join"
        element={<PublicTestJoin />}
      />

      <Route
        path="/join/:testCode"
        element={<PublicTestJoin />}
      />

      <Route
        path="/attempt/:attemptId"
        element={<TestTaking />}
      />
    </Routes>
  );
}
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;