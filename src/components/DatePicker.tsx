// DatePicker — 自定义日期选择器（对齐应用视觉风格，替代原生 date input）
// 值格式: "YYYY-MM-DD"（空字符串表示未设置）
// 三级视图：日期网格 → 点击标题进入月选择 → 点击年份进入年选择

import React, { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";

interface DatePickerProps {
  value: string; // YYYY-MM-DD 或 ""
  onChange: (v: string) => void;
}

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
const MONTHS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

/** 友好中文格式：2026-08-27 → 2026年8月27日 */
function formatCn(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${Number(y)}年${Number(m)}月${Number(d)}日`;
}

export const DatePicker: React.FC<DatePickerProps> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"date" | "month" | "year">("date");
  const btnRef = React.useRef<HTMLDivElement>(null);
  // 弹层 fixed 定位（相对视口，避免被滚动容器裁剪）；top 根据下方空间自适应
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // 视图月份（0-based；有值时锚定该月，否则当月）
  const [viewYear, setViewYear] = useState(() => value ? Number(value.slice(0, 4)) : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => value ? Number(value.slice(5, 7)) - 1 : today.getMonth());
  // 年份选择窗口起点（year 视图显示 yearPage..yearPage+11）
  const [yearPage, setYearPage] = useState(() => viewYear - 6);

  const openPicker = () => {
    if (value) {
      setViewYear(Number(value.slice(0, 4)));
      setViewMonth(Number(value.slice(5, 7)) - 1);
    } else {
      setViewYear(today.getFullYear());
      setViewMonth(today.getMonth());
    }
    setViewMode("date");
    // 测量触发按钮位置：下方空间不足 340px 时向上展开（弹层高约 300px）
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom;
      const top = spaceBelow < 340 ? Math.max(8, rect.top - 308) : rect.bottom + 4;
      const left = Math.min(rect.left, Math.max(8, window.innerWidth - 264));
      setAnchor({ top, left });
    }
    setOpen(true);
  };

  // 导航：按当前视图模式切换 ◀▶ 语义
  const navPrev = () => {
    if (viewMode === "date") {
      if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
      else setViewMonth(m => m - 1);
    } else if (viewMode === "month") {
      setViewYear(y => y - 1);
    } else {
      setYearPage(p => p - 12);
    }
  };
  const navNext = () => {
    if (viewMode === "date") {
      if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
      else setViewMonth(m => m + 1);
    } else if (viewMode === "month") {
      setViewYear(y => y + 1);
    } else {
      setYearPage(p => p + 12);
    }
  };

  // 标题：date 显示 年月 → 点击进月选择；month 显示 年 → 点击进年选择
  const title = viewMode === "date"
    ? `${viewYear}年${viewMonth + 1}月`
    : viewMode === "month"
      ? `${viewYear}年`
      : `${yearPage} - ${yearPage + 11}`;
  const onTitleClick = () => {
    if (viewMode === "date") setViewMode("month");
    else if (viewMode === "month") { setYearPage(viewYear - 6); setViewMode("year"); }
  };

  // 当月日历格（null 为前导空白）
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const dateStr = (d: number) => `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  return (
    <div className="relative">
      {/* 触发按钮（清除按钮内嵌右侧，与密码框 Eye 按钮同款） */}
      <div className="relative" ref={btnRef}>
        <button
          type="button"
          onClick={openPicker}
          className={`w-full flex items-center justify-between bg-slate-50 border border-slate-200 hover:border-indigo-400 rounded-lg px-3 py-2 text-xs cursor-pointer transition-all ${
            value ? "text-slate-800" : "text-slate-400"
          }`}
        >
          <span className="flex items-center space-x-2 min-w-0">
            <CalendarDays className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="truncate">{value ? formatCn(value) : "选择到期日期"}</span>
          </span>
        </button>
        {value && (
          <button
            type="button"
            // pointerdown 阶段处理清除：早于 click，且 preventDefault 阻断 click 派发，
            // 杜绝"点击 X 边缘误触触发按钮弹出日历"的瞬闪问题
            onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onChange(""); }}
            title="清除日期"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 日历弹层（fixed 视口定位，不被滚动容器裁剪，空间不足自动向上） */}
      {open && anchor && (
        <>
          <div className="fixed inset-0 z-30 cursor-default" onClick={() => setOpen(false)} />
          <div className="fixed bg-white border border-slate-200/90 rounded-lg shadow-lg p-2.5 z-40 w-64"
            style={{ top: anchor.top, left: anchor.left }}>
            {/* 标题导航 */}
            <div className="flex items-center justify-between mb-2">
              <button type="button" onClick={navPrev}
                className="p-1 hover:bg-slate-100 rounded transition-colors cursor-pointer" title="上一步">
                <ChevronLeft className="w-3.5 h-3.5 text-slate-500" />
              </button>
              <button
                type="button"
                onClick={onTitleClick}
                className="text-xs font-bold text-slate-700 hover:text-indigo-600 transition-colors cursor-pointer px-1.5 py-0.5 rounded hover:bg-indigo-50"
                title={viewMode === "date" ? "选择月份" : viewMode === "month" ? "选择年份" : ""}
              >
                {title}
                {viewMode !== "year" && <span className="text-slate-300 ml-0.5 text-[9px]">▾</span>}
              </button>
              <button type="button" onClick={navNext}
                className="p-1 hover:bg-slate-100 rounded transition-colors cursor-pointer" title="下一步">
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>

            {viewMode === "date" && (
              <>
                {/* 周表头 */}
                <div className="grid grid-cols-7 mb-1">
                  {WEEKDAYS.map(w => (
                    <span key={w} className="text-center text-[9px] font-bold text-slate-400 py-0.5">{w}</span>
                  ))}
                </div>
                {/* 日期格 */}
                <div className="grid grid-cols-7 gap-0.5">
                  {cells.map((d, i) => {
                    if (d === null) return <span key={i} />;
                    const ds = dateStr(d);
                    const isSelected = value === ds;
                    const isToday = todayStr === ds;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => { onChange(ds); setOpen(false); }}
                        className={`text-center text-[10px] py-1 rounded-md transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-indigo-600 text-white font-bold"
                            : isToday
                              ? "text-indigo-600 font-bold hover:bg-indigo-50"
                              : "text-slate-600 hover:bg-indigo-50"
                        }`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
                {/* 快捷操作 */}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => { onChange(todayStr); setOpen(false); }}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                  >
                    今天
                  </button>
                  {value && (
                    <button
                      type="button"
                      onClick={() => { onChange(""); setOpen(false); }}
                      className="text-[10px] font-bold text-slate-400 hover:text-rose-500 cursor-pointer"
                    >
                      清除日期
                    </button>
                  )}
                </div>
              </>
            )}

            {viewMode === "month" && (
              <div className="grid grid-cols-3 gap-1">
                {MONTHS.map((m, i) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setViewMonth(i); setViewMode("date"); }}
                    className={`text-center text-[10px] py-1.5 rounded-md transition-colors cursor-pointer ${
                      viewMonth === i
                        ? "bg-indigo-600 text-white font-bold"
                        : "text-slate-600 hover:bg-indigo-50"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}

            {viewMode === "year" && (
              <div className="grid grid-cols-3 gap-1">
                {Array.from({ length: 12 }, (_, i) => yearPage + i).map(y => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => { setViewYear(y); setViewMode("month"); }}
                    className={`text-center text-[10px] py-1.5 rounded-md transition-colors cursor-pointer ${
                      viewYear === y
                        ? "bg-indigo-600 text-white font-bold"
                        : y === today.getFullYear()
                          ? "text-indigo-600 font-bold hover:bg-indigo-50"
                          : "text-slate-600 hover:bg-indigo-50"
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
