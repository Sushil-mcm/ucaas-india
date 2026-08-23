import Loader from '@/components/custom/loader';
import { useUser } from '@/hooks/use-user';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const VerifyAccessToken = () => {
  const [searchParams] = useSearchParams();
  const { handleSetUser } = useUser();

  const rawToken = searchParams.get('token');
  const token = rawToken ? decodeURIComponent(rawToken) : null;

  useEffect(() => {
    if (!token) return;

    if (token.includes('…')) {
      console.error('Invalid / truncated token');
      return;
    }

    sessionStorage.setItem('welcomePopup', 'true');
    handleSetUser({ token });
  }, [token, handleSetUser]);

  return (
    <div className="flex items-center justify-center h-screen">
      <Loader variant="blue" size="lg" />
    </div>
  );
};

export default VerifyAccessToken;
