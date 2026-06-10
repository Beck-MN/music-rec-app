import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { HomePage } from "./pages/HomePage";
import { QdrantSearchPage } from "./pages/QdrantSearchPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="qdrant" element={<QdrantSearchPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
