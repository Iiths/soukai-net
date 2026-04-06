import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './presentation/components/Layout/Layout';
import { SimpleSearchPage } from './presentation/pages/SimpleSearchPage/SimpleSearchPage';
import { NinjaDetailPage } from './presentation/pages/NinjaDetailPage/NinjaDetailPage';
import { NinjaEditPage } from './presentation/pages/NinjaEditPage/NinjaEditPage';
import { NinjaEditProvider } from './presentation/context/NinjaEditContext';

function App() {
  return (
    <BrowserRouter>
      <NinjaEditProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<SimpleSearchPage />} />
            {/* /search は / にリダイレクト（後方互換性） */}
            <Route path="/search" element={<Navigate to="/" replace />} />
            <Route path="/ninja/:id" element={<NinjaDetailPage />} />
            <Route path="/ninja/:id/edit" element={<NinjaEditPage />} />
          </Routes>
        </Layout>
      </NinjaEditProvider>
    </BrowserRouter>
  );
}

export default App;
