import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import ArchivePage from "@/pages/ArchivePage";
import ArchiveDetailPage from "@/pages/ArchiveDetailPage";
import SettingsPage from "@/pages/SettingsPage";
import { useSettings } from "@/store/useSettings";

export default function App() {
  const reduceMotion = useSettings((s) => s.reduceMotion);

  // reduceMotion 开启时给 body 加 class，CSS 里全局禁用动画
  useEffect(() => {
    document.body.classList.toggle('reduce-motion', reduceMotion);
  }, [reduceMotion]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/archive" element={<ArchivePage />} />
        <Route path="/archive/:id" element={<ArchiveDetailPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Router>
  );
}
