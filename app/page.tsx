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
    <div className="flex justify-center align-start flex-wrap py-20 h-[200px] sm:h-[300px] md:h-[430px] lg:h-[524px] bg-gray-200 w-full overflow-hidden relative">
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
      <div className="container mx-auto px-6 z-[2]">
        <h1 className="text-4xl w-full text-center ">SOAP - E</h1>
        <h2 className="w-full text-center ">
          Making documentation easy one note at a time
        </h2>
      </div>
    </div>
  );
}
