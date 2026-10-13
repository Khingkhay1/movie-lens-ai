import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    navigate("/profile");
  }

  return (
    <main className="min-h-screen bg-[#0F1115] px-6 py-16 text-[#F4F1EA]">
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center">
        <div className="w-full">
          <div className="mb-10 text-center">
            <Link to="/" className="text-2xl font-semibold">
              MovieLens <span className="text-[#D6A85F]">AI</span>
            </Link>

            <p className="mt-8 text-xs uppercase tracking-[0.25em] text-[#D6A85F]">
              Welcome back
            </p>

            <h1 className="mt-3 text-4xl font-semibold">
              Sign in
            </h1>

            <p className="mt-4 text-sm leading-6 text-[#737986]">
              Sign in to access your MovieLens AI profile and movie history.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#171A21] p-8 shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium"
                >
                  Email address
                </label>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-xl border border-white/10 bg-[#0F1115] px-4 py-3.5 text-white outline-none transition placeholder:text-[#555B67] focus:border-[#D6A85F]/50"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium"
                  >
                    Password
                  </label>

                  <button
                    type="button"
                    className="text-xs text-[#D6A85F] hover:text-white"
                  >
                    Forgot password?
                  </button>
                </div>

                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full rounded-xl border border-white/10 bg-[#0F1115] px-4 py-3.5 pr-16 text-white outline-none transition placeholder:text-[#555B67] focus:border-[#D6A85F]/50"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((visible) => !visible)
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#737986] hover:text-white"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-3 text-sm text-[#737986]">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#D6A85F]"
                />
                Remember me
              </label>

              {error && (
                <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#F4F1EA] px-6 py-3.5 font-medium text-[#0F1115] transition hover:bg-[#D6A85F] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <div className="mt-8 border-t border-white/10 pt-8 text-center">
              <p className="text-sm text-[#737986]">
                Don't have an account?
              </p>

              <Link
                to="/register"
                className="mt-2 inline-block text-sm font-medium text-[#D6A85F] hover:text-white"
              >
                Create an account
              </Link>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link
              to="/"
              className="text-sm text-[#555B67] hover:text-white"
            >
              ← Back to MovieLens
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default Login;