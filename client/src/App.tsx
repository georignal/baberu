import { Routes, Route } from 'react-router-dom';
import Layout from '@/shared/ui/Layout';
import HomePage from '@/pages/HomePage';
import DocumentsPage from '@/pages/DocumentsPage';
import ImportPage from '@/pages/ImportPage';
import ReaderPage from '@/pages/ReaderPage';
import CardsPage from '@/pages/CardsPage';
import SourceContextPage from '@/pages/SourceContextPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/import" element={<ImportPage />} />
        <Route path="/documents/:id" element={<ReaderPage />} />
        <Route path="/cards" element={<CardsPage />} />
        <Route path="/source/:cardId" element={<SourceContextPage />} />
      </Route>
    </Routes>
  );
}
