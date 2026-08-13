import { BellIcon, BookmarkIcon, CopyIcon, ListChecksIcon, ListRestartIcon } from "lucide-react";
import { useCallback } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import RelativeTime from "@/components/RelativeTime";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNewMemo } from "@/contexts/NewMemoContext";
import { useUpdateMemo } from "@/hooks/useMemoQueries";
import useNavigateTo from "@/hooks/useNavigateTo";
import { useReminders } from "@/hooks/useReminders";
import i18n from "@/i18n";
import { cn } from "@/lib/utils";
import { Visibility } from "@/types/proto/api/v1/memo_service_pb";
import type { User } from "@/types/proto/api/v1/user_service_pb";
import { useTranslate } from "@/utils/i18n";
import { checkAllTasks, uncheckAllTasks } from "@/utils/markdown-task-actions";
import { convertVisibilityToString } from "@/utils/memo";
import MemoActionMenu from "../../MemoActionMenu";
import UserAvatar from "../../UserAvatar";
import VisibilityIcon from "../../VisibilityIcon";
import { useMemoActions } from "../hooks";
import { useMemoViewContext, useMemoViewDerived } from "../MemoViewContext";
import type { MemoHeaderProps } from "../types";

const MemoHeader: React.FC<MemoHeaderProps> = ({ showCreator, showVisibility, showPinned }) => {
  const t = useTranslate();

  const { memo, creator, parentPage, isArchived, readonly, openEditor } = useMemoViewContext();
  const { createTime, updateTime, displayTime: memoDisplayTime, isDisplayingUpdatedTime, relativeTimeFormat } = useMemoViewDerived();
  const { newMemoName } = useNewMemo();
  const { hasReminder, toggleReminder } = useReminders();

  const navigateTo = useNavigateTo();
  const handleGotoMemoDetailPage = useCallback(() => {
    navigateTo(`/${memo.name}`, { state: { from: parentPage } });
  }, [memo.name, parentPage, navigateTo]);

  const { unpinMemo } = useMemoActions(memo);

  const handleCopy = useCallback(() => {
    navigator.clipboard
      .writeText(memo.content)
      .then(() => {
        toast.success(t("message.succeed-copy-content"));
      })
      .catch(() => {
        toast.error("Failed to copy");
      });
  }, [memo.content, t]);

  const { mutateAsync: updateMemo } = useUpdateMemo();

  const handleCheckAllTasks = useCallback(async () => {
    try {
      await updateMemo({
        update: { name: memo.name, content: checkAllTasks(memo.content) },
        updateMask: ["content", "update_time"],
      });
      toast.success(t("memo.task-actions.updated"));
    } catch {
      toast.error("An error occurred");
    }
  }, [memo.name, memo.content, updateMemo, t]);

  const handleUncheckAllTasks = useCallback(async () => {
    try {
      await updateMemo({
        update: { name: memo.name, content: uncheckAllTasks(memo.content) },
        updateMask: ["content", "update_time"],
      });
      toast.success(t("memo.task-actions.updated"));
    } catch {
      toast.error("An error occurred");
    }
  }, [memo.name, memo.content, updateMemo, t]);

  const timeValue = isArchived ? (
    memoDisplayTime?.toLocaleString(i18n.language)
  ) : (
    <RelativeTime date={memoDisplayTime} format={relativeTimeFormat} />
  );
  const displayTime = isDisplayingUpdatedTime ? (
    <>
      {t("common.last-updated-at")} {timeValue}
    </>
  ) : (
    timeValue
  );
  const timeTooltip = {
    createdAt: createTime ? `${t("common.created-at")}: ${createTime.toLocaleString(i18n.language)}` : undefined,
    updatedAt:
      updateTime && (!createTime || updateTime.getTime() !== createTime.getTime())
        ? `${t("common.last-updated-at")}: ${updateTime.toLocaleString(i18n.language)}`
        : undefined,
  };

  return (
    <div className="w-full flex flex-row justify-between items-center gap-2">
      <div className="w-auto max-w-[calc(100%-8rem)] grow flex flex-row justify-start items-center">
        {showCreator && creator ? (
          <CreatorDisplay creator={creator} displayTime={displayTime} timeTooltip={timeTooltip} onGotoDetail={handleGotoMemoDetailPage} />
        ) : (
          <TimeDisplay displayTime={displayTime} timeTooltip={timeTooltip} onGotoDetail={handleGotoMemoDetailPage} />
        )}
        {memo.name === newMemoName && (
          <span className="ml-2 shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-medium leading-none text-primary">
            {t("memo.new-badge")}
          </span>
        )}
      </div>

      <div className="flex flex-row justify-end items-center select-none shrink-0 gap-2">
        {showVisibility && memo.visibility !== Visibility.PRIVATE && (
          <Tooltip>
            <TooltipTrigger>
              <span className="flex justify-center items-center rounded-md hover:opacity-80">
                <VisibilityIcon visibility={memo.visibility} />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {t(`memo.visibility.${convertVisibilityToString(memo.visibility).toLowerCase()}` as Parameters<typeof t>[0])}
            </TooltipContent>
          </Tooltip>
        )}

        {showPinned && memo.pinned && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger render={<span className="cursor-pointer" />}>
                <BookmarkIcon className="w-4 h-auto text-primary" onClick={unpinMemo} />
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("common.unpin")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger render={<span className="cursor-pointer" />}>
              <BellIcon
                className={cn(
                  "w-4 h-auto transition-colors",
                  hasReminder(memo.name) ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => {
                  toggleReminder(memo.name);
                  if (!hasReminder(memo.name)) {
                    toast.success("Alarm set for tomorrow!");
                  } else {
                    toast.success("Alarm removed");
                  }
                }}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>{hasReminder(memo.name) ? "Remove Alarm" : "Set Alarm"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Tooltip>
          <TooltipTrigger render={<span className="cursor-pointer flex items-center justify-center rounded-md hover:opacity-80" />}>
            <CopyIcon className="w-4 h-auto text-muted-foreground hover:text-foreground transition-colors" onClick={handleCopy} />
          </TooltipTrigger>
          <TooltipContent>
            <p>{t("common.copy")}</p>
          </TooltipContent>
        </Tooltip>

        {Boolean(memo.property?.hasTaskList) && !readonly && (
          <>
            <Tooltip>
              <TooltipTrigger render={<span className="cursor-pointer flex items-center justify-center rounded-md hover:opacity-80" />}>
                <ListChecksIcon
                  className="w-4 h-auto text-muted-foreground hover:text-foreground transition-colors"
                  onClick={handleCheckAllTasks}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("memo.task-actions.check-all")}</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger render={<span className="cursor-pointer flex items-center justify-center rounded-md hover:opacity-80" />}>
                <ListRestartIcon
                  className="w-4 h-auto text-muted-foreground hover:text-foreground transition-colors"
                  onClick={handleUncheckAllTasks}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("memo.task-actions.uncheck-all")}</p>
              </TooltipContent>
            </Tooltip>
          </>
        )}

        <MemoActionMenu memo={memo} readonly={readonly} onEdit={openEditor} />
      </div>
    </div>
  );
};

interface CreatorDisplayProps {
  creator: User;
  displayTime: React.ReactNode;
  timeTooltip: TimeTooltipContent;
  onGotoDetail: () => void;
}

const CreatorDisplay: React.FC<CreatorDisplayProps> = ({ creator, displayTime, timeTooltip, onGotoDetail }) => (
  <div className="w-full flex flex-row justify-start items-center">
    <Link className="w-auto hover:opacity-80 rounded-md transition-colors" to={`/u/${encodeURIComponent(creator.username)}`} viewTransition>
      <UserAvatar className="mr-2 shrink-0" avatarUrl={creator.avatarUrl} />
    </Link>
    <div className="w-full flex flex-col justify-center items-start">
      <Link
        className="block leading-tight hover:opacity-80 rounded-md transition-colors truncate text-muted-foreground"
        to={`/u/${encodeURIComponent(creator.username)}`}
        viewTransition
      >
        {creator.displayName || creator.username}
      </Link>
      <TimeTooltip content={timeTooltip}>
        <span
          className="w-auto -mt-0.5 text-xs leading-tight text-muted-foreground select-none cursor-pointer hover:opacity-80 transition-colors text-left"
          onClick={onGotoDetail}
        >
          {displayTime}
        </span>
      </TimeTooltip>
    </div>
  </div>
);

interface TimeTooltipContent {
  createdAt?: string;
  updatedAt?: string;
}

const TimeTooltip = ({ children, content }: { children: React.ReactElement; content: TimeTooltipContent }) => (
  <Tooltip>
    <TooltipTrigger render={children} />
    <TooltipContent align="start" className="flex flex-col items-start gap-0.5 whitespace-nowrap text-left">
      {content.createdAt && <span>{content.createdAt}</span>}
      {content.updatedAt && <span>{content.updatedAt}</span>}
    </TooltipContent>
  </Tooltip>
);

interface TimeDisplayProps {
  displayTime: React.ReactNode;
  timeTooltip: TimeTooltipContent;
  onGotoDetail: () => void;
}

const TimeDisplay: React.FC<TimeDisplayProps> = ({ displayTime, timeTooltip, onGotoDetail }) => (
  <TimeTooltip content={timeTooltip}>
    <span
      className="w-auto text-sm leading-tight text-muted-foreground select-none cursor-pointer hover:text-foreground transition-colors text-left"
      onClick={onGotoDetail}
    >
      {displayTime}
    </span>
  </TimeTooltip>
);

export default MemoHeader;
