import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { JoinPage } from './pages/JoinPage';
import { WaitingPage } from './pages/WaitingPage';
import { RacePage } from './pages/RacePage';
import { PodiumPage } from './pages/PodiumPage';
import { TeacherLoginPage } from './pages/TeacherLoginPage';
import { TeacherDashboardPage } from './pages/TeacherDashboardPage';
import { TeacherControlPage } from './pages/TeacherControlPage';
import { QuestionsAdminPage } from './pages/QuestionsAdminPage';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/unirse" element={<JoinPage />} />
          <Route path="/sala/:gameId" element={<WaitingPage />} />
          <Route path="/carrera/:gameId" element={<RacePage />} />
          <Route path="/podio/:gameId" element={<PodiumPage />} />
          <Route path="/admin" element={<TeacherLoginPage />} />
          <Route path="/admin/panel" element={<TeacherDashboardPage />} />
          <Route path="/admin/partida/:gameId" element={<TeacherControlPage />} />
          <Route path="/admin/preguntas" element={<QuestionsAdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
