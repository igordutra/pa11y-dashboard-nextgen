import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { UrlList } from './components/UrlList';
import { AddUrlModal } from './components/AddUrlModal';
import { ReportPage } from './pages/ReportPage';
import { SettingsPage } from './pages/SettingsPage';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={
            <>
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <AddUrlModal />
              </div>
              <UrlList />
            </>
          } />
          <Route path="/report/:id" element={<ReportPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
