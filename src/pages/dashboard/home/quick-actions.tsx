import { useNavigate } from 'react-router-dom';
import { Ic } from '@/components/mcm/icons';

const ACTIONS = [
  {
    key: 'call',
    icon: 'phone',
    title: 'Make a call',
    description: 'Start a new call',
    to: '/phone',
    color: 'var(--accent)',
  },
  {
    key: 'sms',
    icon: 'chat',
    title: 'Send a message',
    description: 'Text a contact',
    to: '/messenger',
    color: '#7c3aed',
  },
  {
    key: 'meeting',
    icon: 'video',
    title: 'Start a meeting',
    description: 'Host a video meeting',
    to: '/video',
    color: '#0d9488',
  },
  {
    key: 'ai',
    icon: 'spark',
    title: 'AI agent',
    description: 'Create or manage an agent',
    to: '/admin-settings/knowledge/ai-agent',
    color: '#c96f1f',
  },
] as const;

/** One click to the four things you open Home to do — same idea as the
 * quick-dial panel below, just for the whole company instead of just
 * calling. */
const QuickActions = () => {
  const navigate = useNavigate();
  return (
    <div className="quick-actions">
      {ACTIONS.map((action) => (
        <button
          key={action.key}
          type="button"
          className="quick-action"
          onClick={() => navigate(action.to)}
        >
          <span
            className="quick-action-icon"
            style={{ background: `${action.color}1f`, color: action.color }}
          >
            <Ic n={action.icon} size={18} fill={action.icon === 'spark'} />
          </span>
          <span className="quick-action-text">
            <span className="quick-action-title">{action.title}</span>
            <span className="quick-action-desc">{action.description}</span>
          </span>
        </button>
      ))}
    </div>
  );
};

export default QuickActions;
