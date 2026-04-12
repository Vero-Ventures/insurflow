"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Forces one fresh dashboard payload after submit redirect, then removes
 * the query flag so normal navigation remains unchanged.
 */
export function PostSubmitRefresh() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasRefreshedRef = useRef(false);

  useEffect(() => {
    const shouldRefresh = searchParams.get("refresh") === "post-submit";
    if (!shouldRefresh || hasRefreshedRef.current) return;

    hasRefreshedRef.current = true;

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("refresh");
    const nextUrl =
      nextParams.size > 0 ? `${pathname}?${nextParams.toString()}` : pathname;

    router.replace(nextUrl, { scroll: false });
    router.refresh();
  }, [pathname, router, searchParams]);

  return null;
}
