import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './presentation/components/Layout/Layout';
import { SimpleSearchPage } from './presentation/pages/SimpleSearchPage/SimpleSearchPage';
import { NinjaDetailPage } from './presentation/pages/NinjaDetailPage/NinjaDetailPage';
import { NinjaEditPage } from './presentation/pages/NinjaEditPage/NinjaEditPage';
import { EpisodesEditPage } from './presentation/pages/EpisodesEditPage/EpisodesEditPage';
import { OrganizationsEditPage } from './presentation/pages/OrganizationsEditPage/OrganizationsEditPage';
import { NinjaEditProvider } from './presentation/context/NinjaEditContext';
import { EpisodeEditProvider } from './presentation/context/EpisodeEditContext';
import { OrganizationEditProvider } from './presentation/context/OrganizationEditContext';

function App() {
  return (
    <BrowserRouter>
      <NinjaEditProvider>
        <EpisodeEditProvider>
          <OrganizationEditProvider>
            <Layout>
              <Routes>
                <Route path="/" element={<SimpleSearchPage />} />
                {/* /search は / にリダイレクト（後方互換性） */}
                <Route path="/search" element={<Navigate to="/" replace />} />
                <Route path="/ninja/:id" element={<NinjaDetailPage />} />
                {/* 編集ルートは開発時のみ登録。import.meta.env.DEV は本番ビルドで false に置換され、
                    これらのルートはバンドルから除外されるため URL 直打ちでもアクセス不可 */}
                {import.meta.env.DEV && <Route path="/ninja/:id/edit" element={<NinjaEditPage />} />}
                {import.meta.env.DEV && <Route path="/edit/episodes" element={<EpisodesEditPage />} />}
                {import.meta.env.DEV && <Route path="/edit/organizations" element={<OrganizationsEditPage />} />}
              </Routes>
            </Layout>
          </OrganizationEditProvider>
        </EpisodeEditProvider>
      </NinjaEditProvider>
    </BrowserRouter>
  );
}

export default App;
