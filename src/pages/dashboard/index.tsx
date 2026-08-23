import { WelcomeModalPopup } from './welcome-modal';
import Home from './home';
import '@/components/mcm/mcm-page.css';
import './dashboard.css';

/**
 * Home.
 *
 * This used to carry a tab strip — Home, Enterprise Live Wallboard, AI
 * Wallboard, Call Queue, Video Dashboard — which put a "Home" tab inside Home
 * and a second row of navigation directly under the area nav. The wallboards
 * are performance surfaces, so they moved to Performance and this is Home now.
 */
const Dashboard = () => (
  <div className="mcm-page dash-shell">
    <div className="dash-body">
      <Home />
    </div>
    <WelcomeModalPopup />
  </div>
);

export default Dashboard;
