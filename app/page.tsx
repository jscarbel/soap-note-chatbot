import Nav from './nav';

const colorOptions = {
  purple: 'A78CE3',
  teal: '8CD9E3',
  yellow: 'E3CA8C',
} as const;

const Bubble = ({
  size,
  color,
  className,
}: {
  size: number;
  color: (typeof colorOptions)[keyof typeof colorOptions];
  className: string;
}) => {
  return (
    <div
      className={`absolute rounded-full ${className}`}
      style={{
        backgroundColor: `#${color}`,
        height: `${size}vw`,
        width: `${size}vw`,
      }}
    />
  );
};

export default function Home() {
  return (
    <div>
      <Nav />
      <div className="align-start bg-hero-200 text-customFont-200 relative flex h-[200px] w-full flex-col flex-wrap justify-center overflow-hidden py-20 sm:h-[300px] md:h-[430px] lg:h-[524px]">
        <Bubble
          color={colorOptions.teal}
          size={30}
          className="right-[-30] top-0"
        />
        <Bubble
          color={colorOptions.purple}
          size={25}
          className="right-[80] top-[-70]"
        />

        {/* Bubbles at the bottom-left */}
        <Bubble
          color={colorOptions.purple}
          size={25}
          className="bottom-[200] left-[10]"
        />
        <Bubble
          color={colorOptions.teal}
          size={25}
          className="bottom-[-50] left-[-40]"
        />
        <Bubble
          color={colorOptions.yellow}
          size={25}
          className="bottom-[-150] left-[150]"
        />

        <div className="z-[2] flex flex-col items-center">
          <h1 className="mt-4 text-center text-6xl font-extrabold">SOAP - E</h1>
          <h2 className="mt-4 text-center text-2xl font-bold">
            Making documentation easy, one note at a time
          </h2>
          <button className="mt-6 rounded-full bg-buttonBackground px-8 py-2 text-hero">
            Sign up
          </button>
        </div>
      </div>
    </div>
  );
}
