import { UsersDirectoryContext } from '@/context/users-directory-context';
import { useContext, useEffect } from 'react';

export const useUsersDirectory = () => {
  const directory = useContext(UsersDirectoryContext);

  useEffect(() => {
    directory.ensureUsersDirectory();
  }, [directory.ensureUsersDirectory]);

  return directory;
};
