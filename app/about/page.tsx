import Nav from '../nav';

export default function AboutPage() {
  return (
    <div>
      <Nav />
      <section className="bg-gray-100 py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-soap-slate-800 mb-4 text-4xl font-bold md:text-5xl">
            About Us
          </h1>
          <p className="text-soap-slate-800 mx-auto max-w-2xl text-lg md:text-xl">
            Learn more about our mission to make SOAP notes easier, and help
            work stay at work
          </p>
        </div>
      </section>
    </div>
  );
}
