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
        <Bubble size={30} className="bg-soap-cyan-300 top-0 right-[-30]" />
        <Bubble size={25} className="bg-soap-purple-400 top-[-70] right-[80]" />

        {/* Bubbles at the bottom-left */}
        <Bubble
          size={25}
          className="bg-soap-purple-400 bottom-[200] left-[10]"
        />
        <Bubble
          size={25}
          className="bg-soap-cyan-300 bottom-[-50] left-[-40]"
        />
        <Bubble
          size={25}
          className="bg-soap-yellow-300 bottom-[-150] left-[150]"
        />

        <div className="z-[2] flex flex-col items-center">
          <h1 className="mt-4 text-center text-6xl font-extrabold">SOAP - E</h1>
          <h2 className="mt-4 text-center text-2xl font-bold">
            Making documentation easy, one note at a time
          </h2>
          <button className="bg-soap-slate-800 text-soap-gray-50 hover:bg-soap-slate-700 pointer mt-6 rounded-full px-8 py-2">
            Sign up
          </button>
        </div>
      </div>
    </div>
  );
}
