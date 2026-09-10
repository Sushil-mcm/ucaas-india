const CaptainComingSoon = ({ title }: { title: string }) => (
  <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center">
    <div className="text-lg font-semibold text-gray-800 dark:text-foreground">{title}</div>
    <div className="text-sm text-gray-500 dark:text-muted-foreground">This section is coming soon.</div>
  </div>
);

export default CaptainComingSoon;
