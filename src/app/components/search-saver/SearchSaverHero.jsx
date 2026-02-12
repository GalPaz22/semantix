import Link from 'next/link';
import SearchSaverAnimation from './SearchSaverAnimation';

export default function SearchSaverHero() {
  return (
    <section className="relative overflow-hidden bg-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(141,92,255,0.12),_transparent_55%)]" />

      <div className="relative max-w-6xl mx-auto px-6 sm:px-8 py-20 sm:py-28 grid gap-12 lg:grid-cols-[1.1fr_0.9fr] items-center text-[#120a22]">
        <div className="space-y-6">
          <span className="inline-flex items-center rounded-full border border-[#2a1850]/20 px-4 py-1 text-sm tracking-wide text-[#2a1850]/70">
            Search Saver by Semantix
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold leading-tight">
            Turn “No Results” into Revenue.
          </h1>
          <p className="text-lg sm:text-xl text-[#3d2c5f]/80 max-w-2xl">
            Search Saver is a lightweight rescue layer that activates only when search fails. It
            surfaces intent-based alternatives and saves the sale without replacing your existing
            search.
          </p>
          <p className="text-base sm:text-lg text-[#3d2c5f]/70">
            Activates only when search fails. No migration. No redesign. Live in minutes.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-full border border-[#2a1850]/30 text-[#2a1850] px-6 py-3 hover:border-[#2a1850]/60 transition-colors"
            >
              Book a 10-minute demo
            </Link>
          </div>

          <div className="pt-4 text-sm text-[#3d2c5f]/60">
            Measure recovered Add to Carts and Purchases from day one.
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <SearchSaverAnimation />
        </div>
      </div>
    </section>
  );
}
