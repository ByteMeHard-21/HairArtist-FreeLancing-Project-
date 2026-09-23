import Link from "next/link";

export default function NotFound() {
  return <main id="main" className="not-found container"><p className="eyebrow">404</p><h1>This page couldn&apos;t be found.</h1><Link href="/" className="action action--dark">Back to home</Link></main>;
}
