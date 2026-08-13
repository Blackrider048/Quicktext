import { create } from "@bufbuild/protobuf";
import { ClockIcon, CornerDownLeftIcon, SearchIcon } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAppSidebar } from "@/contexts/AppSidebarContext";
import { useAuth } from "@/contexts/AuthContext";
import { type MemoFilter, replaceFiltersByFactor, stringifyFilters, useMemoFilterContext } from "@/contexts/MemoFilterContext";
import useCurrentUser from "@/hooks/useCurrentUser";
import { useMemoViews, useUpdateUserSetting } from "@/hooks/useUserQueries";
import { BUILTIN_TASKS_VIEW_ID, getMemoViewId, isMemoScopeRoute } from "@/lib/memo-views";
import { ROUTES } from "@/router/routes";
import { UserSetting_SearchHistorySettingSchema, UserSettingSchema } from "@/types/proto/api/v1/user_service_pb";
import { useTranslate } from "@/utils/i18n";

export const isQuickFindCollectionRoute = (pathname: string) => isMemoScopeRoute(pathname) || pathname.startsWith("/u/");

export const buildQuickFindFilters = (query: string, currentFilters: MemoFilter[], preserveCurrentScope: boolean): MemoFilter[] => {
  const words = Array.from(new Set(query.trim().split(/\s+/).filter(Boolean)));
  const contentFilters: MemoFilter[] = words.map((value) => ({ factor: "contentSearch", value }));
  return preserveCurrentScope ? replaceFiltersByFactor(currentFilters, "contentSearch", contentFilters) : contentFilters;
};

const getScopeLabel = (pathname: string, t: ReturnType<typeof useTranslate>) => {
  if (pathname === ROUTES.ARCHIVED) return t("common.archived");
  if (pathname === ROUTES.EXPLORE) return t("common.explore");
  if (pathname.startsWith("/u/")) return t("common.profile");
  return t("common.Quicktext");
};

const QuickFindDialog = () => {
  const t = useTranslate();
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const { userSearchHistorySetting, refetchSettings } = useAuth();
  const { mutateAsync: updateUserSetting } = useUpdateUserSetting();
  const { data: memoViews = [] } = useMemoViews(currentUser?.name);
  const { filters, setFilters, setMemoView, memoView } = useMemoFilterContext();
  const { quickFindOpen, setQuickFindOpen } = useAppSidebar();
  const [query, setQuery] = useState("");
  const collectionRoute = isQuickFindCollectionRoute(location.pathname);
  const viewApplies = isMemoScopeRoute(location.pathname);
  const selectedMemoView = viewApplies ? memoViews.find((item) => getMemoViewId(item.name) === memoView) : undefined;
  const scopeLabel =
    viewApplies && memoView === BUILTIN_TASKS_VIEW_ID ? t("common.tasks") : selectedMemoView?.title || getScopeLabel(location.pathname, t);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setQuickFindOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setQuickFindOpen]);

  useEffect(() => {
    if (!quickFindOpen) return;
    setQuery(
      filters
        .filter((filter) => filter.factor === "contentSearch")
        .map((filter) => filter.value)
        .join(" "),
    );
  }, [filters, quickFindOpen]);

  const submitQuery = () => {
    const nextFilters = buildQuickFindFilters(query, filters, collectionRoute);

    if (collectionRoute) {
      setFilters(nextFilters);
    } else {
      const filterQuery = stringifyFilters(nextFilters);
      setFilters(nextFilters);
      setMemoView(undefined);
      navigate(filterQuery ? `${ROUTES.HOME}?filter=${filterQuery}` : ROUTES.HOME);
    }

    if (query.trim()) {
      const history = userSearchHistorySetting?.searchHistory || [];
      const newHistory = [query.trim(), ...history.filter((h) => h !== query.trim())].slice(0, 10);
      updateUserSetting({
        setting: create(UserSettingSchema, {
          name: `${currentUser?.name}/settings/SEARCH_HISTORY`,
          value: {
            case: "searchHistorySetting",
            value: create(UserSetting_SearchHistorySettingSchema, { searchHistory: newHistory }),
          },
        }),
        updateMask: ["search_history"],
      }).then(() => refetchSettings());
    }

    setQuickFindOpen(false);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    submitQuery();
  };

  return (
    <Dialog open={quickFindOpen} onOpenChange={setQuickFindOpen}>
      <DialogContent
        size="lg"
        className="top-[12vh]! translate-y-0! overflow-hidden border-border/70 p-0! shadow-xl sm:top-[16vh]! [&>div:first-child]:gap-0!"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">{t("common.search")}</DialogTitle>
        <DialogDescription className="sr-only">
          {t("common.search")} {scopeLabel}
        </DialogDescription>
        <form onSubmit={handleSubmit} className="flex h-[52px] shrink-0 items-center gap-2.5 px-4">
          <SearchIcon className="size-[17px] shrink-0 text-muted-foreground" strokeWidth={1.8} />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              submitQuery();
            }}
            className="h-10 border-0 bg-transparent px-0 !text-[14px] shadow-none focus-visible:ring-0"
            placeholder={`${t("common.search")} ${scopeLabel}`}
            aria-label={`${t("common.search")} ${scopeLabel}`}
          />
          <Button
            type="submit"
            variant="ghost"
            size="icon-sm"
            className="size-7 shrink-0 rounded-md text-muted-foreground"
            aria-label={t("common.search")}
          >
            <CornerDownLeftIcon className="size-3.5" />
          </Button>
        </form>
        {query === "" && userSearchHistorySetting?.searchHistory && userSearchHistorySetting.searchHistory.length > 0 && (
          <div className="flex flex-col border-t border-border/70 py-2">
            <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Recent Searches</div>
            {userSearchHistorySetting.searchHistory.map((historyItem) => (
              <button
                key={historyItem}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent hover:text-accent-foreground w-full text-left cursor-pointer"
                onClick={() => {
                  setQuery(historyItem);
                  const nextFilters = buildQuickFindFilters(historyItem, filters, collectionRoute);
                  if (collectionRoute) {
                    setFilters(nextFilters);
                  } else {
                    const filterQuery = stringifyFilters(nextFilters);
                    setFilters(nextFilters);
                    setMemoView(undefined);
                    navigate(filterQuery ? `${ROUTES.HOME}?filter=${filterQuery}` : ROUTES.HOME);
                  }
                  setQuickFindOpen(false);
                }}
              >
                <ClockIcon className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{historyItem}</span>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default QuickFindDialog;
