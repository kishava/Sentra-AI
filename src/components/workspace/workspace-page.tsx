import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type WorkspacePageProps = {
  children: ReactNode;
  className?: string;
};

/** Consistent max-width and vertical rhythm for workspace routes. */
export function WorkspacePage({ children, className }: WorkspacePageProps) {
  return <div className={cn("flex w-full flex-col gap-8", className)}>{children}</div>;
}

type WorkspacePageHeaderProps = {
  badge: string;
  badgeVariant?: "cyan" | "violet" | "risk" | "default";
  title: string;
  description: string;
  actions?: ReactNode;
  aside?: ReactNode;
};

export function WorkspacePageHeader({
  badge,
  badgeVariant = "cyan",
  title,
  description,
  actions,
  aside,
}: WorkspacePageHeaderProps) {
  return (
    <section>
      <Card className="overflow-hidden p-5 md:p-8" glow>
        <div
          className={cn(
            "grid gap-6",
            aside ? "xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start" : actions ? "md:grid-cols-[minmax(0,1fr)_auto] md:items-end" : undefined,
          )}
        >
          <div className="min-w-0">
            <Badge variant={badgeVariant}>{badge}</Badge>
            <h1 className="type-display-lg mt-4 text-white">{title}</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/58 md:text-base">{description}</p>
          </div>
          {aside}
          {!aside && actions && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
        </div>
      </Card>
    </section>
  );
}

type WorkspaceSectionProps = {
  id?: string;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function WorkspaceSection({ id, title, description, children, className }: WorkspaceSectionProps) {
  return (
    <section id={id} className={cn("grid gap-5", className)}>
      {(title || description) && (
        <div className="min-w-0">
          {title && <h2 className="text-xl font-semibold text-white md:text-2xl">{title}</h2>}
          {description && <p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">{description}</p>}
        </div>
      )}
      {children}
    </section>
  );
}
