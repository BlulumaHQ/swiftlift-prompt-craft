import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Projects from "./pages/Projects";
import PromptLibrary from "./pages/PromptLibrary";
import ReferenceLibraryManager from "./pages/ReferenceLibraryManager";
import Revision from "./pages/Revision";
import SettingsPage from "./pages/Settings";
import QualityControl from "./pages/QualityControl";
import LockPreview from "./pages/LockPreview";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/prompt-library" element={<PromptLibrary />} />
          <Route path="/references" element={<ReferenceLibraryManager />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/revision" element={<Revision />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
