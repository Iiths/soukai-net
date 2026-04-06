import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './presentation/components/Layout/Layout';
import { SimpleSearchPage } from './presentation/pages/SimpleSearchPage/SimpleSearchPage';
import { NinjaDetailPage } from './presentation/pages/NinjaDetailPage/NinjaDetailPage';
import styles from './App.module.css';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<SimpleSearchPage />} />
          {/* /search は / にリダイレクト（後方互換性） */}
          <Route path="/search" element={<Navigate to="/" replace />} />
          <Route path="/ninja/:id" element={<NinjaDetailPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
