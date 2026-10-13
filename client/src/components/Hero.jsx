function Hero() {
  function scrollToUpload() {
    document
      .getElementById("upload-section")
      ?.scrollIntoView({
        behavior: "smooth",
      });
  }

  return (
    <section className="relative overflow-hidden px-6 pb-24 pt-28">

      {/* Cinematic background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-250px] h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-[#D6A85F]/[0.07] blur-[140px]" />

        <div className="absolute bottom-0 left-1/4 h-[300px] w-[400px] rounded-full bg-[#52677D]/[0.05] blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-5xl text-center">

        {/* Eyebrow */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#9298A5]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#D6A85F]" />
          AI-Powered Cinema Discovery
        </div>

        {/* Heading */}
        <h2 className="text-5xl font-semibold leading-[1.05] tracking-tight text-[#F4F1EA] md:text-7xl">

          What movie is this?

          <span className="mt-3 block bg-gradient-to-r from-[#D6A85F] via-[#E4C58B] to-[#9B7A45] bg-clip-text text-transparent">
            Let MovieLens find it.
          </span>

        </h2>

        {/* Description */}
        <p className="mx-auto mt-8 max-w-2xl text-lg leading-8 text-[#9298A5]">
          Upload a short scene and let AI analyze the visuals,
          characters, dialogue, and sequence to uncover the film.
        </p>

        {/* CTA */}
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">

          <button
            type="button"
            onClick={scrollToUpload}
            className="group flex items-center gap-3 rounded-full bg-[#F4F1EA] px-7 py-3.5 font-medium text-[#0F1115] transition duration-300 hover:-translate-y-0.5 hover:bg-[#D6A85F]"
          >
            Choose a movie clip

            <span className="transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </button>

          <button
            type="button"
            onClick={scrollToUpload}
            className="rounded-full border border-white/10 px-7 py-3.5 text-sm font-medium text-[#9298A5] transition hover:border-white/20 hover:bg-white/[0.04] hover:text-[#F4F1EA]"
          >
            See how it works
          </button>

        </div>

        {/* Trust indicators */}
        <div className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-[#626875]">

          <span>Visual analysis</span>
          <span className="h-1 w-1 rounded-full bg-[#D6A85F]" />
          <span>Scene recognition</span>
          <span className="h-1 w-1 rounded-full bg-[#D6A85F]" />
          <span>TMDb verification</span>

        </div>

      </div>
    </section>
  );
}

export default Hero;