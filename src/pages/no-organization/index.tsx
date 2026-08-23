import MetaLogo from '@/assets/images/Error-404.svg';

const NoOrganization = () => {
  return (
    <div className="w-screen min-h-screen bg-white">
      <div className="w-full h-full min-h-screen flex flex-col items-center justify-center gap-4 bg-white p-4">
        <img src={MetaLogo} alt="Error" className="w-full max-w-56" />
        <h1 className="text-xl font-bold text-gray-800 text-center">No organization found</h1>
        <p className="text-gray-600 text-center max-w-md">
          We couldn&apos;t find an organization for this domain. Please check the URL or try again
          later.
        </p>
      </div>
    </div>
  );
};

export default NoOrganization;
