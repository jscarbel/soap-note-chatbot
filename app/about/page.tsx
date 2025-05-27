import Nav from '../nav';

export default function AboutPage() {
  return (
    <div>
      <Nav />
      <section className="bg-gray-100 py-20">
  <div className="container mx-auto px-4 text-center">
    <h1 className="text-4xl md:text-5xl font-bold text-customFont-800 mb-4">
      About Us
    </h1>
    <p className="text-lg md:text-xl text-cuustomFont-600 max-w-2xl mx-auto">
      Learn more about our mission to make notes SOAP notes easier, and work stay at work
    </p>
  </div>
</section>

    </div>
  );
}
