import Nav from './nav';

const Bubble = ({ size, className }: { size: number; className: string }) => {
  return (
    <div
      className={`absolute rounded-full ${className}`}
      style={{
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
      <div className="align-start bg-soap-gray-50 text-soap-slate-800 relative flex h-[200px] w-full flex-col flex-wrap justify-center overflow-hidden py-20 sm:h-[300px] md:h-[430px] lg:h-[524px]">
        <Bubble size={30} className="right-[-30] top-0 bg-soap-cyan-300" />
        <Bubble size={25} className="right-[80] top-[-70] bg-soap-purple-400" />

        {/* Bubbles at the bottom-left */}
        <Bubble
          size={25}
          className="bottom-[200] left-[10] bg-soap-purple-400"
        />
        <Bubble
          size={25}
          className="bottom-[-50] left-[-40] bg-soap-cyan-300"
        />
        <Bubble
          size={25}
          className="bottom-[-150] left-[150] bg-soap-yellow-300"
        />

        <div className="z-[2] flex flex-col items-center">
          <h1 className="mt-4 text-center text-6xl font-extrabold">SOAP - E</h1>
          <h2 className="mt-4 text-center text-2xl font-bold">
            Making documentation easy, one note at a time
          </h2>
          <button className="mt-6 rounded-full bg-soap-slate-800 px-8 py-2 text-soap-gray-50 hover:bg-soap-slate-700 pointer">
            Sign up
          </button>
        </div>
      </div>
    </div>
  );
}
