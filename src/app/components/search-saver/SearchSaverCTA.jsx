import Link from 'next/link';

export default function SearchSaverCTA() {
  return (
    <section className="bg-[#0b0616] text-white py-20 sm:py-24">
      <div className="max-w-5xl mx-auto px-6 sm:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-semibold mb-4">
          Ready to save the sale?
        </h2>
        <p className="text-white/70 text-lg mb-8">
          Search Saver activates only when search fails. Keep what works, rescue what doesn’t.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <Link
            href="/contact"
            className="inline-flex items-center justify-center rounded-full border border-white/30 text-white px-6 py-3 hover:border-white/70 transition-colors"
          >
            Book a 10-minute demo
          </Link>
        </div>
      </div>
    </section>
  );
}
