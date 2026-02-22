import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { ThemeProvider } from './context/ThemeContext';
import { SettingsProvider } from './context/SettingsContext';
import { Layout } from './components/Layout';
import Dashboard from './pages/Dashboard';
import Workouts from './pages/Workouts';
import WorkoutDetail from './pages/WorkoutDetail';
import Progress from './pages/Progress';
import Profile from './pages/Profile';
import WorkoutChat from './pages/WorkoutChat';
import Plans from './pages/Plans';
import { Skeleton } from './components/ui/Skeleton';
import { Dumbbell } from 'lucide-react';

function LoadingScreen() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-zinc-950 gap-4">
      <Dumbbell size={48} className="text-blue-500 animate-pulse" />
      <Skeleton className="h-4 w-48" />
      <p className="text-zinc-500 dark:text-zinc-400 text-sm">{t('common.connecting')}</p>
    </div>
  );
}

function AuthenticatedApp() {
  const { initialized, authenticated } = useAuth();

  if (!initialized) return <LoadingScreen />;
  if (!authenticated) return <LoadingScreen />;

  return (
    <SettingsProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/workouts" element={<Workouts />} />
            <Route path="/workouts/new" element={<WorkoutChat />} />
            <Route path="/workouts/:id" element={<WorkoutDetail />} />
            <Route path="/plans" element={<Plans />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SettingsProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthenticatedApp />
      </AuthProvider>
    </ThemeProvider>
  );
}
