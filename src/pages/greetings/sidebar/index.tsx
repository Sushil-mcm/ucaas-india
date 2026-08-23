import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '@/assets/icons/icon';
import type { IconType } from '@/assets/icons/type';
import { Accordion, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const greetingSidebarArr = [
  {
    title: 'All',
    path: '/greetings',
    value: 'greetings',
    type: 'normal',
    icon: 'MenuLines',
  },
  {
    title: 'Voicemail',
    path: '/greetings/type-voicemail',
    value: 'voicemail',
    type: 'normal',
    icon: 'VoicemailLineIcon',
  },
  {
    title: 'Greetings',
    path: '/greetings/type-greeting',
    type: 'normal',
    value: 'greeting',
    icon: 'MusicNote',
  },
  {
    title: 'Prompt',
    path: '/greetings/type-prompt',
    type: 'normal',
    value: 'prompt',
    icon: 'Chat',
  },
];

const Sidebar = () => {
  const [activeItem, setActiveItem] = useState('');
  return (
    <div className="flex flex-col w-full">
      <div className="divide-y divide-gray-200 h-full">
        {greetingSidebarArr?.map(({ type, icon = '', path, title, value }) => {
          if (type === 'accordion') {
            return (
              <Accordion
                type="single"
                collapsible
                value={activeItem}
                onValueChange={(v) => {
                  setActiveItem((p) => (p === v ? '' : v));
                }}
              >
                <AccordionItem value={value} className="">
                  <AccordionTrigger className="p-0 items-center">
                    <Tile {...{ title, path, icon }} isAccordionTrigger={true} className="w-full" />
                  </AccordionTrigger>
                </AccordionItem>
              </Accordion>
            );
          } else {
            return <Tile {...{ title, path, icon }} />;
          }
        })}
      </div>
    </div>
  );
};

export default Sidebar;

const Tile = ({ title, path, icon, isAccordionTrigger = false }: any) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isActive = pathname === path;

  const handleClick = () => {
    if (isAccordionTrigger) return;
    navigate(path);
  };

  return (
    <div
      className={`flex items-center w-full px-3 h-14 gap-2 cursor-pointer ${isActive ? 'text-primary bg-ucass-primary-200/50 border-r-2 border-r-primary' : 'text-gray-900/80'}`}
      onClick={handleClick}
    >
      <Icon name={icon as IconType} className="w-5 h-5 p-0.5" />
      <p className="font-medium truncate text-sm">{title}</p>
    </div>
  );
};
