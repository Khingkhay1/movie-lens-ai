import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setConfirmationMessage("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      setError("Account could not be created.");
      setLoading(false);
      return;
    }

    setLoading(false);

    if (data.session) {
      navigate("/profile");
      return;
    }

    setConfirmationMessage(
      "Your account was created. Check your email to confirm it, then sign in."
    );
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
              Get started
            </p>

            <h1 className="mt-3 text-4xl font-semibold">
              Create an account
            </h1>

            <p className="mt-4 text-sm leading-6 text-[#737986]">
              Create your MovieLens AI account to save your movie history
              and manage your profile.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#171A21] p-8 shadow-2xl">

            <form onSubmit={handleSubmit} className="space-y-6">

              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium"
                >
                  Full name
                </label>

                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                  required
                  className="w-full rounded-xl border border-white/10 bg-[#0F1115] px-4 py-3.5 text-white outline-none transition placeholder:text-[#555B67] focus:border-[#D6A85F]/50"
                />
              </div>

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
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium"
                >
                  Password
                </label>

                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Create a password"
                  required
                  className="w-full rounded-xl border border-white/10 bg-[#0F1115] px-4 py-3.5 text-white outline-none transition placeholder:text-[#555B67] focus:border-[#D6A85F]/50"
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-2 block text-sm font-medium"
                >
                  Confirm password
                </label>

                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  placeholder="Confirm your password"
                  required
                  className="w-full rounded-xl border border-white/10 bg-[#0F1115] px-4 py-3.5 text-white outline-none transition placeholder:text-[#555B67] focus:border-[#D6A85F]/50"
                />
              </div>

              {error && (
                <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </p>
              )}

              {confirmationMessage && (
                <p className="rounded-xl border border-[#D6A85F]/20 bg-[#D6A85F]/10 px-4 py-3 text-sm text-[#D6A85F]">
                  {confirmationMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#F4F1EA] px-6 py-3.5 font-medium text-[#0F1115] transition hover:bg-[#D6A85F] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Creating account..." : "Create Account"}
              </button>

            </form>

            <div className="mt-8 border-t border-white/10 pt-8 text-center">
              <p className="text-sm text-[#737986]">
                Already have an account?
              </p>

              <Link
                to="/login"
                className="mt-2 inline-block text-sm font-medium text-[#D6A85F] hover:text-white"
              >
                Sign in
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

export default Register;
