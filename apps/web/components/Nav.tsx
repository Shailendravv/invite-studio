"use client";

import { usePathname, useRouter } from "next/navigation";

export function Nav() {
  const path = usePathname();
  const router = useRouter();
  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };
  return (
    <nav className="nav" aria-label="Main">
      <a href="/" aria-current={path === "/" ? "page" : undefined}>
        New
      </a>
      <a href="/orders" aria-current={path.startsWith("/orders") ? "page" : undefined}>
        Orders
      </a>
      <button type="button" onClick={logout}>
        Log out
      </button>
    </nav>
  );
}
