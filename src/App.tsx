import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './presentation/components/Layout/Layout';
import { SimpleSearchPage } from './presentation/pages/SimpleSearchPage/SimpleSearchPage';
import { AdvancedSearchPage } from './presentation/pages/AdvancedSearchPage/AdvancedSearchPage';
import { NinjaDetailPage } from './presentation/pages/NinjaDetailPage/NinjaDetailPage';
import styles from './App.module.css';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<SimpleSearchPage />} />
          <Route path="/search" element={<AdvancedSearchPage />} />
          <Route path="/ninja/:id" element={<NinjaDetailPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
