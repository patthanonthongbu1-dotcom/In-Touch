import { Suspense } from "react";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import AuthPanel from "@/components/AuthPanel";
import { IconBook, IconFlame, IconGear } from "@/components/icons";
import logo from "@/app/In0Touch.png";

export const dynamic = "force-dynamic";

export const metadata = { title: "Sign in — InTouch" };

const PERKS = [
  { icon: IconBook, title: "Your vocabulary bank", text: "Every word you save follows you to any device." },
  { icon: IconFlame, title: "Reading streak", text: "Read at least one story a day and watch it grow." },
  { icon: IconGear, title: "Synced settings", text: "Your feed preferences, everywhere you sign in." },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getUser();
  if (user) {
    const { next } = await searchParams;
    redirect(next?.startsWith("/") && !next.startsWith("//") ? next : "/");
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:py-16">
      <div className="glass grid overflow-hidden rounded-[2rem] sm:grid-cols-2">
        {/* Branding panel */}
        <div className="relative flex flex-col justify-between gap-10 p-8 sm:p-10">
          <div>
            <Image src={logo} alt="InTouch" className="h-9 w-auto" priority />
            <h1 className="mt-8 text-3xl font-extrabold leading-tight tracking-tight text-neutral-950 sm:text-4xl">
              Read the world.
              <br />
              <span className="text-gradient">Grow your English.</span>
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-neutral-500">
              One account keeps your learning together — on your phone, laptop, everywhere.
            </p>
          </div>

          <ul className="space-y-4">
            {PERKS.map((perk) => (
              <li key={perk.title} className="flex items-start gap-3">
                <span className="glass flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-neutral-700">
                  <perk.icon size={18} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-neutral-950">{perk.title}</p>
                  <p className="text-xs leading-relaxed text-neutral-500">{perk.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Auth panel — dark side, echoing the tas-33 sign-in card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-neutral-900 via-neutral-950 to-black p-8 sm:p-10">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(420px 300px at 85% 0%, rgb(16 185 129 / 0.25), transparent 70%), radial-gradient(420px 300px at 0% 100%, rgb(56 189 248 / 0.2), transparent 70%), radial-gradient(300px 240px at 100% 80%, rgb(167 139 250 / 0.18), transparent 70%)",
            }}
          />
          <div className="relative">
            <h2 className="text-xl font-bold text-white">Welcome back 👋</h2>
            <p className="mt-1 text-sm text-white/60">Sign in to keep your streak alive.</p>
            <div className="mt-6">
              <Suspense fallback={null}>
                <AuthPanel />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
