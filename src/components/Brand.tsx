import Link from "next/link";

export default function Brand({ href = "/dashboard" }: { href?: string }) {
  return <Link className="oa-brand" href={href} aria-label="OpenAsset"><span className="oa-mark" aria-hidden="true" /><span className="oa-brand-text">OpenAsset</span></Link>;
}
