"use client";

import * as React from "react";
import { Menu } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CommandPalette } from "@/components/command-palette";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export function AdminTopbar({ mobileNav }: { mobileNav: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-base/90 px-4 py-2.5 backdrop-blur">
      <div className="flex min-w-0 items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Open navigation"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="size-4" />
        </Button>
        <Breadcrumbs />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <CommandPalette />
        <ThemeToggle />
        <UserButton appearance={{ elements: { avatarBox: "width:32px;height:32px" } }} />
      </div>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[248px] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <div className="flex h-full flex-col" onClick={() => setMobileOpen(false)}>
            {mobileNav}
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
