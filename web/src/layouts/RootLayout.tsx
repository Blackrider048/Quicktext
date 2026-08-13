import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { Navigate, Outlet, useLocation, useSearchParams } from "react-router-dom";
import AppSidebar, {
  MobileAppHeader,
  MobileAppSidebar,
  QuickFindDialog,
  SIDEBAR_WIDTH_VAR,
  SidebarResizeHandle,
  useSidebarWidth,
} from "@/components/AppSidebar";
import { AppSidebarProvider } from "@/contexts/AppSidebarContext";
import { useInstance } from "@/contexts/InstanceContext";
import { MemoFilterProvider, useMemoFilterContext } from "@/contexts/MemoFilterContext";
import useCurrentUser from "@/hooks/useCurrentUser";
import useMediaQuery from "@/hooks/useMediaQuery";
import { useReminders } from "@/hooks/useReminders";
import { buildAuthRoute, shouldGatePrivateInstance } from "@/utils/auth-redirect";
import { useTranslate } from "@/utils/i18n";

const MEMOS_DEPLOY_URL = "https://usememos.com/docs/deploy";

const DemoBanner = () => {
  const t = useTranslate();

  return (
    <div className="static w-full border-b border-border bg-muted/70 px-4 py-2 text-sm text-muted-foreground sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-center sm:gap-2">
        <span className="font-medium text-foreground">{t("demo.banner-title")}</span>
        <span>{t("demo.banner-description")}</span>
        <a className="font-medium text-primary underline-offset-4 hover:underline" href={MEMOS_DEPLOY_URL} target="_blank" rel="noreferrer">
          {t("demo.deploy-link")}
        </a>
      </div>
    </div>
  );
};

const RootLayoutContent = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const currentUser = useCurrentUser();
  const md = useMediaQuery("md");
  const { profile } = useInstance();
  const { removeFilter } = useMemoFilterContext();
  const { pathname } = location;
  const prevPathnameRef = useRef<string | undefined>(undefined);
  const shellRef = useRef<HTMLDivElement>(null);
  const { width: sidebarWidth, minWidth, maxWidth, setWidth: setSidebarWidth } = useSidebarWidth();

  useEffect(() => {
    const prevPathname = prevPathnameRef.current;

    // When the route changes and there is no filter in the search params, remove all filters.
    if (prevPathname !== undefined && prevPathname !== pathname && !searchParams.has("filter")) {
      removeFilter(() => true);
    }

    prevPathnameRef.current = pathname;
  }, [pathname, searchParams, removeFilter]);

  const { reminders, toggleReminder } = useReminders();
  useEffect(() => {
    if (!currentUser) return;
    const now = Date.now();
    Object.entries(reminders).forEach(([memoId, time]) => {
      if (now >= time) {
        toast.success(`Reminder for memo ${memoId.split("/")[1]}!`, { duration: 6000 });
        toggleReminder(memoId);
      }
    });
  }, [currentUser, reminders, toggleReminder]);

  // Private instance (no InstanceURL configured): anonymous visitors may only reach
  // share links; everything else redirects to the sign-in page, preserving the intended
  // destination. Public instances keep the open Explore behavior for logged-out users.
  if (shouldGatePrivateInstance({ isPrivateInstance: !profile.instanceUrl, isAuthenticated: !!currentUser, pathname })) {
    const redirect = `${pathname}${location.search}${location.hash}`;
    return <Navigate to={buildAuthRoute({ redirect })} replace />;
  }

  return (
    <AppSidebarProvider>
      <div ref={shellRef} className="min-h-full w-full" style={{ [SIDEBAR_WIDTH_VAR]: `${sidebarWidth}px` } as CSSProperties}>
        {md && (
          <div className="fixed inset-y-3 left-3 z-30 w-(--app-sidebar-width) rounded-3xl border border-white/20 bg-sidebar/50 shadow-2xl backdrop-blur-2xl transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
            <AppSidebar className="rounded-3xl bg-transparent" />
            <SidebarResizeHandle
              width={sidebarWidth}
              minWidth={minWidth}
              maxWidth={maxWidth}
              onWidthChange={setSidebarWidth}
              targetRef={shellRef}
            />
          </div>
        )}
        <MobileAppSidebar />
        <main className="flex min-h-full w-full min-w-0 flex-col items-center md:pl-[calc(var(--app-sidebar-width)+1.5rem)] md:pr-4 md:py-3">
          <MobileAppHeader />
          {profile.demo && <DemoBanner />}
          <Outlet />
        </main>
        <QuickFindDialog />
      </div>
    </AppSidebarProvider>
  );
};

const RootLayout = () => (
  <MemoFilterProvider>
    <RootLayoutContent />
  </MemoFilterProvider>
);

export default RootLayout;
