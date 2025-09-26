import { Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import Home from "./pages/Home";
import Donations from "./pages/Donations";
import Castrations from "./pages/Castrations";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

export const AppRoutes = () => (
  <Routes>
    <Route path="/auth" element={<Auth />} />
    <Route path="/admin" element={<Admin />} />
    <Route
      path="*"
      element={
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/donations" element={<Donations />} />
            <Route path="/castrations" element={<Castrations />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      }
    />
  </Routes>
);
