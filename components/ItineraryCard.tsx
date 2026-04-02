"use client";

interface Activity {
  time: string;
  title: string;
  details: string[];
  suitability: string[];
  prePlan?: boolean;
}

interface DayData {
  dayNumber: number;
  title: string;
  activities: Activity[];
}

interface ItineraryCardProps {
  day: DayData;
}

export default function ItineraryCard({ day }: ItineraryCardProps) {
  return (
    <div className="my-3 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-200">
      {/* Day header */}
      <div className="border-b border-stone-100 bg-stone-50 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-fei-500 text-[11px] font-semibold text-white">
            {day.dayNumber}
          </span>
          <span className="text-sm font-medium text-stone-800">
            {day.title}
          </span>
        </div>
      </div>

      {/* Activities */}
      <div className="divide-y divide-stone-50">
        {day.activities.map((activity, i) => (
          <div key={i} className="px-4 py-3">
            {/* Time + Title row */}
            <div className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0 text-[11px] font-medium text-fei-600">
                {activity.time}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-stone-900">
                    {activity.title}
                  </span>
                  {activity.prePlan && (
                    <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700 ring-1 ring-red-100">
                      📋 Pre-plan
                    </span>
                  )}
                </div>

                {/* Detail lines */}
                {activity.details.map((detail, j) => (
                  <p key={j} className="mt-1 text-xs leading-relaxed text-stone-600">
                    {detail}
                  </p>
                ))}

                {/* Suitability notes */}
                {activity.suitability.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {activity.suitability.map((note, k) => (
                      <p key={k} className="text-[11px] leading-snug text-stone-500">
                        {note}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
