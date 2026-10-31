
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 text-white">
      <div className="w-full max-w-3xl text-center">
        <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-cyan-400">
          My First Full-Stack Web Application
        </p>

        <h1 className="mb-6 text-5xl font-bold tracking-tight">
          Welcome to OpenAsset!
        </h1>

        <p className="mb-10 text-lg leading-relaxed text-slate-300">
          An open-source Asset and Inventory Management System
          built using Next.js, React, TypeScript and Tailwind CSS.
        </p>

        <div className="rounded-2xl border border-slate-700 bg-slate-900 p-8 text-left shadow-xl">
          <h2 className="mb-4 text-2xl font-semibold">
            Application Dashboard
          </h2>

          <p className="mb-6 text-slate-400">
            Our journey to professional full-stack development
            starts here.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-800 p-5">
              <p className="text-sm text-slate-400">
                Total Assets
              </p>
              <p className="mt-2 text-3xl font-bold text-cyan-400">
                0
              </p>
            </div>

            <div className="rounded-xl bg-slate-800 p-5">
              <p className="text-sm text-slate-400">
                Issued Assets
              </p>
              <p className="mt-2 text-3xl font-bold text-amber-400">
                0
              </p>
            </div>

            <div className="rounded-xl bg-slate-800 p-5">
              <p className="text-sm text-slate-400">
                Available Assets
              </p>
              <p className="mt-2 text-3xl font-bold text-green-400">
                0
              </p>
            </div>
          </div>
        </div>

        <p className="mt-10 text-sm text-slate-500">
          OpenAsset | Learning Full-Stack Development
        </p>
      </div>
    </main>
  );
}
