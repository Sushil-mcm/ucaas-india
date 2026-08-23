import Loader from './loader';

const FullPageLoader = () => (
  <div className="w-screen min-h-screen bg-white flex items-center justify-center">
    <Loader variant="blue" size="lg" />
  </div>
);

export default FullPageLoader;
