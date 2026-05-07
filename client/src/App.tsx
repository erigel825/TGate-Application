import { Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Pipeline from './pages/Pipeline';
import GateReviews from './pages/GateReviews';

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
      <p className="text-6xl font-bold mb-4">404</p>
      <p className="text-lg">Page not found</p>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/gates" element={<GateReviews />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </AppProvider>
  );
}
