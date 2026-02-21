import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import Zones from "./pages/Zones";
import Leads from "./pages/Leads";
import AddLead from "./pages/AddLead";
import LeadDetail from "./pages/LeadDetail";
import Search from "./pages/Search";
import Scout from "./pages/Scout";
import SearchEngine from "./pages/SearchEngine";
import Layout from "./components/Layout";
import BulkWhatsapp from "./pages/BulkWhatsapp";
import WhatsAppAuto from "./pages/WhatsAppAuto";
import InstagramSearch from "./pages/InstagramSearch";
import WhatsApp from "./pages/WhatsApp";
import SearchHub from "./pages/SearchHub";
import UsersManagement from "./pages/UsersManagement";
import JoinPage from "./pages/JoinPage";
import Chats from "./pages/Chats";
import AISettings from "./pages/AISettings";
import WhatsAppAccounts from "./pages/WhatsAppAccounts";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/zones" component={Zones} />
        <Route path="/leads" component={Leads} />
        <Route path="/leads/add" component={AddLead} />
        <Route path="/leads/:id" component={LeadDetail} />
        <Route path="/search" component={Search} />
        <Route path="/scout" component={Scout} />
        <Route path="/engine" component={SearchEngine} />
        <Route path="/bulk-whatsapp" component={BulkWhatsapp} />
        <Route path="/whatsapp-auto" component={WhatsAppAuto} />
        <Route path="/instagram" component={InstagramSearch} />
        <Route path="/whatsapp" component={WhatsApp} />
        <Route path="/search-hub" component={SearchHub} />
        <Route path="/users" component={UsersManagement} />
        <Route path="/join" component={JoinPage} />
        <Route path="/chats" component={Chats} />
        <Route path="/ai-settings" component={AISettings} />
        <Route path="/whatsapp-accounts" component={WhatsAppAccounts} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
