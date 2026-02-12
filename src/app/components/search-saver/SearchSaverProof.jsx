export default function SearchSaverProof() {
  const metrics = [
    {
      title: '$40K',
      subtitle: 'Recovered revenue',
      description: 'From complex & zero-result searches',
    },
    {
      title: '40,195',
      subtitle: 'Searches recovered',
      description: 'Converted from search to Add to Cart',
    },
    {
      title: 'Minutes',
      subtitle: 'Time to launch',
      description: 'No migration. No redesign. Live fast.',
    },
  ];

  return (
    <section className="bg-[#120a22] text-white py-20 sm:py-24">
      <div className="max-w-6xl mx-auto px-6 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-start">
          <div>
            <h2 className="text-3xl sm:text-4xl font-semibold mb-4">Proof you can believe</h2>
            <p className="text-white/70 text-lg mb-8">
              Real production outcomes from Search Saver in the wild.
            </p>

            <div className="grid gap-4 sm:grid-cols-3">
              {metrics.map((metric) => (
                <div
                  key={metric.subtitle}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5"
                >
                  <div className="text-2xl font-semibold mb-2">{metric.title}</div>
                  <div className="text-sm text-white/80">{metric.subtitle}</div>
                  <div className="text-xs text-white/50 mt-2">{metric.description}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="text-sm text-white/50 mb-2">Real story</div>
            <h3 className="text-xl font-semibold mb-3">The non-alcoholic aperitif save</h3>
            <p className="text-white/70">
              A customer searched for “non-alcoholic aperitif.” The store had none. Search Saver
              surfaced alcohol-free spritz alternatives and the shopper bought a 4-pack.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
