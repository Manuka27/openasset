import Image from "next/image";
import Brand from "@/components/Brand";
import { ThemeToggle } from "@/components/WorkspacePreferences";
import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <main className="oa-login">
      <section className="oa-login-content">
        <div className="flex items-center justify-between gap-4"><Brand href="/login" /><ThemeToggle /></div>
        <div className="oa-login-form">
          <p className="oa-kicker mb-3">Inventory workspace</p>
          <h1 className="oa-page-title mb-2">Sign in to OpenAsset</h1>
          <p className="oa-muted mb-7 text-sm">Use your organization account to manage equipment and assignments.</p>
          <LoginForm />
        </div>
      </section>
      <div className="oa-login-visual">
        <Image src="/openasset-equipment.webp" alt="Stylized illustration of IT equipment and an asset tag" fill sizes="(min-width: 992px) 56vw, 1px" className="object-cover" />
        <div className="oa-login-copy">
          <h2 className="mb-2 max-w-lg text-3xl font-semibold tracking-tight 2xl:text-5xl">IT inventory and assignment history.</h2>
          <p className="max-w-md text-sm leading-relaxed">Track equipment from registration through issue, return, and archival.</p>
        </div>
      </div>
    </main>
  );
}
