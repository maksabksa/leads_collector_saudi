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
import InterestKeywords from "./pages/InterestKeywords";
import Segments from "./pages/Segments";
import DataSettings from "./pages/DataSettings";
import BulkImport from "./pages/BulkImport";
import KnowledgeBase from "./pages/KnowledgeBase";
import WhatsAppReport from "./pages/WhatsAppReport";
import NumberHealth from "./pages/NumberHealth";
import EmployeePerformance from "./pages/EmployeePerformance";
import DigitalMarketing from "./pages/DigitalMarketing";
import Reminders from "./pages/Reminders";
import WeeklyReports from "./pages/WeeklyReports";
import Activation from "./pages/Activation";
import Settings from "./pages/Settings";
import Reports from "./pages/Reports";
import DataQuality from "./pages/DataQuality";
import MessagesHub from "./pages/MessagesHub";
import SocialAccounts from "./pages/SocialAccounts";
import UnifiedInbox from "./pages/UnifiedInbox";
import StaffLogin from "./pages/StaffLogin";
import AcceptInvitation from "./pages/AcceptInvitation";
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
        <Route path="/interest-keywords" component={InterestKeywords} />
        <Route path="/segments" component={Segments} />
        <Route path="/data-settings" component={DataSettings} />
        <Route path="/bulk-import" component={BulkImport} />
        <Route path="/knowledge-base" component={KnowledgeBase} />
        <Route path="/whatsapp-report" component={WhatsAppReport} />
        <Route path="/number-health" component={NumberHealth} />
        <Route path="/employee-performance" component={EmployeePerformance} />
        <Route path="/digital-marketing" component={DigitalMarketing} />
        <Route path="/reminders" component={Reminders} />
        <Route path="/weekly-reports" component={WeeklyReports} />
        <Route path="/activation" component={Activation} />
        <Route path="/settings" component={Settings} />
        <Route path="/reports" component={Reports} />
        <Route path="/data-quality" component={DataQuality} />
        <Route path="/messages" component={MessagesHub} />
        <Route path="/social-accounts" component={SocialAccounts} />
        <Route path="/unified-inbox" component={UnifiedInbox} />
        <Route path="/staff-login" component={StaffLogin} />
        <Route path="/accept-invitation" component={AcceptInvitation} />
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
