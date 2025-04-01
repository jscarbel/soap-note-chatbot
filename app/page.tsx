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
    <div className="flex flex-col justify-center align-start flex-wrap py-20 h-[200px] sm:h-[300px] md:h-[430px] lg:h-[524px] bg-hero-200 text-customFont-200 w-full overflow-hidden relative">
      <Bubble
        color={colorOptions.teal}
        size={30}
        className="top-0 right-[-30]"
      />
      <Bubble
        color={colorOptions.purple}
        size={25}
        className="top-[-70] right-[80]"
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

      <div className="flex flex-col items-center z-[2]">
        <h1 className="text-6xl font-extrabold text-center mt-4">SOAP - E</h1>
        <h2 className="text-2xl text-center font-bold mt-4">
          Making documentation easy, one note at a time
        </h2>
        <button className="bg-buttonBackground rounded-full text-hero py-2 px-8 mt-6">
          Sign up
        </button>
      </div>
    </div>
  );
}
