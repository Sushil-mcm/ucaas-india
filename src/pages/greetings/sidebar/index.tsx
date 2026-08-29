import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '@/assets/icons/icon';
import type { IconType } from '@/assets/icons/type';
import { Accordion, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

/* Suffixes rather than absolute paths. This sidebar is mounted under two
   different bases — the standalone /greetings area and My Account > Greetings —
   and hard-coded absolute paths meant clicking any item from inside My Account
   navigated the person out of the admin area entirely. */
const greetingSidebarArr = [
  { title: 'All', suffix: '', value: 'greetings', type: 'normal', icon: 'MenuLines' },
  {
    title: 'Voicemail',
    suffix: '/voicemail',
    value: 'voicemail',
    type: 'normal',
    icon: 'VoicemailLineIcon',
  },
  {
    title: 'Greetings',
    suffix: '/greetings',
    type: 'normal',
    value: 'greeting',
    icon: 'MusicNote',
  },
  { title: 'Prompt', suffix: '/prompts', type: 'normal', value: 'prompt', icon: 'Chat' },
];

/* This sidebar is mounted only by the standalone /greetings area, so the base is
   fixed. It is resolved through one function rather than repeated per item so a
   second mount point stays a one-line change. */
const resolveBase = (): string => '/greetings';

const Sidebar = () => {
  const [activeItem, setActiveItem] = useState('');
  const base = resolveBase();
  return (
    <div className="flex flex-col w-full">
      <div className="divide-y divide-gray-200 h-full">
        {greetingSidebarArr?.map(({ type, icon = '', suffix, title, value }) => {
          const path = `${base}${suffix}`;
          if (type === 'accordion') {
            return (
              <Accordion
                key={value}
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
            return <Tile key={value} {...{ title, path, icon }} />;
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
