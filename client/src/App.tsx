import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ReportPage } from './pages/ReportPage';
import { SettingsPage } from './pages/SettingsPage';
import { DashboardPage } from './pages/DashboardPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import JobMonitoringPage from './pages/JobMonitoringPage';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/report/:id" element={<ReportPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/jobs" element={<JobMonitoringPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
