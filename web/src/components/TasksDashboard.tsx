import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { useMemos, useUpdateMemo } from "@/hooks/useMemoQueries";
import { cn } from "@/lib/utils";
import { State } from "@/types/proto/api/v1/common_pb";
import { Memo } from "@/types/proto/api/v1/memo_service_pb";
import { extractTasks, type TaskItem, toggleTaskAtIndex } from "@/utils/markdown-manipulation";

const TaskRow = ({
  task,
  memo,
  onToggle,
}: {
  task: TaskItem;
  memo: Memo;
  onToggle: (memo: Memo, taskIndex: number, checked: boolean) => void;
}) => {
  return (
    <div
      className={cn(
        "flex flex-row items-start gap-3 p-3 rounded-lg border border-border/50 bg-card hover:bg-accent/20 transition-colors",
        task.checked && "opacity-60",
      )}
    >
      <Checkbox className="mt-1" checked={task.checked} onCheckedChange={(checked) => onToggle(memo, task.taskIndex, Boolean(checked))} />
      <div className="flex flex-col gap-1 flex-1">
        <span className={cn("text-sm font-medium", task.checked && "line-through text-muted-foreground")}>{task.content}</span>
        <span className="text-xs text-muted-foreground">
          From memo:{" "}
          <Link to={`/m/` + memo.name.split("/")[1]} className="hover:underline">
            {memo.snippet.substring(0, 30)}...
          </Link>
        </span>
      </div>
    </div>
  );
};

const TasksDashboard = () => {
  const { mutate: updateMemo } = useUpdateMemo();

  // Fetch memos that have task lists
  const { data: memoResponse } = useMemos({
    filter: "has_task_list == true",
    state: State.NORMAL,
  });

  const memos = memoResponse?.memos || [];

  const handleToggle = (memo: Memo, taskIndex: number, checked: boolean) => {
    const newContent = toggleTaskAtIndex(memo.content, taskIndex, checked);
    updateMemo({
      update: {
        name: memo.name,
        content: newContent,
      },
      updateMask: ["content", "update_time"],
    });
  };

  const { active, completed } = useMemo(() => {
    const activeTasks: { task: TaskItem; memo: Memo }[] = [];
    const completedTasks: { task: TaskItem; memo: Memo }[] = [];

    memos.forEach((memo) => {
      const tasks = extractTasks(memo.content);
      tasks.forEach((task) => {
        if (task.checked) {
          completedTasks.push({ task, memo });
        } else {
          activeTasks.push({ task, memo });
        }
      });
    });

    return { active: activeTasks, completed: completedTasks };
  }, [memos]);

  return (
    <div className="flex flex-col gap-8 w-full pb-8 pt-4">
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold px-2">Active Tasks ({active.length})</h2>
        {active.length === 0 ? (
          <div className="text-muted-foreground text-sm px-2">No active tasks!</div>
        ) : (
          <div className="flex flex-col gap-2">
            {active.map((t, i) => (
              <TaskRow key={`active-${i}`} task={t.task} memo={t.memo} onToggle={handleToggle} />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold px-2">Completed Tasks ({completed.length})</h2>
        {completed.length === 0 ? (
          <div className="text-muted-foreground text-sm px-2">No completed tasks yet.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {completed.map((t, i) => (
              <TaskRow key={`completed-${i}`} task={t.task} memo={t.memo} onToggle={handleToggle} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TasksDashboard;
