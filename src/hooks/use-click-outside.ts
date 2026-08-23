import { useEffect } from 'react';
const useClickOutside = (ref: any, fn: () => void = () => null) => {
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      let callFunction = true;
      if (ref.current && ref.current.length > 0) {
        for (let i = 0; i < ref.current.length; i++) {
          const element = ref.current[i];
          if (element && element.contains(event.target as Node)) {
            callFunction = false;
            break;
          }
        }
        if (callFunction) {
          fn();
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ref, fn]);
};
export default useClickOutside;
