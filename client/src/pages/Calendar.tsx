import { useState, useEffect } from 'react';
import { api } from '@/shared/api/client';

export default function Calendar() {
  const [data, setData] = useState<{ year: number; month: number; created: Record<string,number>; reviewed: Record<string,number> } | null>(null);

  useEffect(() => {
    api.getDailyStats().then(setData).catch(() => {});
  }, []);

  if (!data) return null;

  const { year, month, created, reviewed } = data;
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().getDate();

  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const rows: number[][] = [];
  let week: number[] = new Array(7).fill(0);
  for (let i = 0; i < firstDay; i++) week[i] = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    week[(firstDay + d - 1) % 7] = d;
    if ((firstDay + d) % 7 === 0 || d === daysInMonth) {
      rows.push(week);
      week = new Array(7).fill(0);
    }
  }

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="font-semibold text-sm tracking-tight">{monthNames[month]} {year}</span>
        <span className="text-[10px] text-muted">
          <span className="text-accent">■</span> new <span className="text-warning ml-1">■</span> reviewed
        </span>
      </div>
      <div className="panel-body p-3">
        <div className="grid grid-cols-7 gap-0.5 text-center">
          {dayNames.map(d => <div key={d} className="text-[10px] text-muted pb-1">{d}</div>)}
          {rows.map((week, wi) =>
            week.map((day, di) => {
              const key = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
              const c = created[key] || 0;
              const r = reviewed[key] || 0;
              const isToday = day === today;
              return (
                <div key={`${wi}-${di}`} className={`aspect-square rounded-md flex flex-col items-center justify-center text-[11px] relative ${day === 0 ? 'text-transparent' : isToday ? 'bg-accent-soft font-bold' : ''}`}>
                  {day > 0 && <span className={isToday ? 'text-accent' : ''}>{day}</span>}
                  <div className="flex gap-0.5 absolute bottom-0.5">
                    {c > 0 && <span className="w-1 h-1 rounded-full bg-accent" title={`${c} new`}/>}
                    {r > 0 && <span className="w-1 h-1 rounded-full bg-warning" title={`${r} reviewed`}/>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
