import { Suspense, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import Loader from './loader';

interface RouteBlockLoaderProps {
  className?: string;
}

interface RouteSuspenseProps extends RouteBlockLoaderProps {
  children: ReactNode;
}

export const RouteBlockLoader = ({ className = '' }: RouteBlockLoaderProps) => (
  <div
    className={`flex h-full min-h-[240px] w-full items-center justify-center bg-transparent ${className}`}
    role="status"
    aria-label="Loading page"
  >
    <Loader variant="blue" size="lg" />
  </div>
);

export const RouteSuspense = ({ children, className }: RouteSuspenseProps) => (
  <Suspense fallback={<RouteBlockLoader className={className} />}>{children}</Suspense>
);

export const SuspenseOutlet = ({ className }: RouteBlockLoaderProps) => (
  <RouteSuspense className={className}>
    <Outlet />
  </RouteSuspense>
);
