import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { RequireAuth, RequireCompany } from "@/components/RequireAuth";
import AppLayout from "@/components/layout/AppLayout";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/app/Dashboard";
import Projects from "./pages/app/Projects";
import Products from "./pages/app/Products";
import ProductDetail from "./pages/app/ProductDetail";
import Contracts from "./pages/app/Contracts";
import Tokens from "./pages/app/Tokens";
import Documents from "./pages/app/Documents";
import Updates from "./pages/app/Updates";
import Users from "./pages/app/Users";
import AuditLog from "./pages/app/AuditLog";
import Catalog from "./pages/public/Catalog";
import CatalogProduct from "./pages/public/CatalogProduct";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/catalog/:id" element={<CatalogProduct />} />
            <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />

            <Route path="/app" element={<RequireAuth><RequireCompany><AppLayout /></RequireCompany></RequireAuth>}>
              <Route index element={<Dashboard />} />
              <Route path="projects" element={<Projects />} />
              <Route path="products" element={<Products />} />
              <Route path="products/:id" element={<ProductDetail />} />
              <Route path="contracts" element={<Contracts />} />
              <Route path="tokens" element={<Tokens />} />
              <Route path="documents" element={<Documents />} />
              <Route path="updates" element={<Updates />} />
              <Route path="users" element={<Users />} />
              <Route path="audit" element={<AuditLog />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
