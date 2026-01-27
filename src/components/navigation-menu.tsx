"use client";

import * as React from "react";
import Link from "next/link";

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

const navItems = [
  { title: "Team", href: "/team" },
  { title: "Clients", href: "/clients" },
];

export function AppNavigationMenu() {
  return (
    <header className="bg-background/95 supports-backdrop-filter:bg-background/0 sticky top-0 z-5 w-full border-b backdrop-blur">
      <div className="container m-auto flex h-14 w-full flex-row items-center justify-center">
        <NavigationMenu>
          <NavigationMenuList>
            {navItems.map((item) => (
              <NavigationMenuItem key={item.title}>
                <NavigationMenuLink asChild>
                  <Link
                    href={item.href}
                    className={navigationMenuTriggerStyle()}
                  >
                    {item.title}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>
      </div>
    </header>
  );
}
