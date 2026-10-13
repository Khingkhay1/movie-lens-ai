import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0F1115]/80 px-6 py-5 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between">

        {/* Logo */}
        <Link
          to="/"
          className="group flex items-center gap-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D6A85F]/30 bg-[#D6A85F]/10 text-xl transition group-hover:bg-[#D6A85F]/20">
            ◉
          </div>

          <div>
            <h1 className="text-lg font-semibold tracking-wide text-[#F4F1EA]">
              MovieLens
            </h1>

            <p className="text-[10px] uppercase tracking-[0.25em] text-[#737986]">
              AI Cinema
            </p>
          </div>
        </Link>

        {/* Navigation */}
        <div className="flex items-center gap-5 sm:gap-8">

          <Link
            to="/"
            className="text-sm text-[#9298A5] transition hover:text-[#D6A85F]"
          >
            Home
          </Link>

          <Link
            to="/search"
            className="text-sm text-[#9298A5] transition hover:text-[#D6A85F]"
          >
            Search
          </Link>

          <Link
            to="/profile"
            className="text-sm text-[#9298A5] transition hover:text-[#D6A85F]"
          >
            Profile
          </Link>

          <Link
            to="/login"
            className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-[#F4F1EA] transition hover:border-[#D6A85F]/40 hover:bg-[#D6A85F]/10"
          >
            Sign In
          </Link>

        </div>
      </div>
    </nav>
  );
}

export default Navbar;