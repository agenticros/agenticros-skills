import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Browse from "./pages/Browse";
import SkillDetail from "./pages/SkillDetail";
import Submit from "./pages/Submit";
import EditSkill from "./pages/EditSkill";
import MySkills from "./pages/MySkills";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import MaintainerProfile from "./pages/MaintainerProfile";
import LegacySlugRedirect from "./pages/LegacySlugRedirect";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <div className="min-h-screen bg-bg-deep text-text-primary font-body flex flex-col">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/submit" element={<Submit />} />
          <Route path="/my-skills" element={<MySkills />} />
          <Route path="/login" element={<Login />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/s/:slug" element={<LegacySlugRedirect />} />
          <Route path="/s/:slug/edit" element={<LegacySlugRedirect />} />
          <Route path="/:owner/:skill/edit" element={<EditSkill />} />
          <Route path="/:owner/:skill" element={<SkillDetail />} />
          <Route path="/:owner" element={<MaintainerProfile />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
