export default function SearchSaverWhyDifferent() {
  const cards = [
    {
      title: 'Plug & Play',
      description:
        'Runs alongside your current search and only activates when needed. No migrations or redesigns.',
    },
    {
      title: 'Revenue-first',
      description:
        'Rescues high-intent shoppers and measures recovered add-to-carts and purchases.',
    },
    {
      title: 'Zero risk',
      description:
        'If your search is already working, Search Saver stays invisible. You keep full control.',
    },
  ];

  return (
    <section className="bg-[#0b0616] text-white py-20 sm:py-24">
      <div className="max-w-6xl mx-auto px-6 sm:px-8">
        <div className="max-w-3xl mb-12">
          <h2 className="text-3xl sm:text-4xl font-semibold mb-4">Why it’s different</h2>
          <p className="text-white/70 text-lg">
            We are not asking you to rip anything out. Search Saver is a focused rescue layer that
            only shows up when shoppers are about to bounce.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {cards.map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-6"
            >
              <h3 className="text-xl font-semibold mb-3">{card.title}</h3>
              <p className="text-white/70">{card.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
