const MinuteMark = ({ position }: any) => (
  <div className="absolute top-0 h-full w-px" style={{ left: `${position}%` }} />
);

export default MinuteMark;
