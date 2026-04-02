/**
 * Itinerary Parser
 * =================
 * Detects itinerary day structures in Fēi's markdown responses
 * and converts them into structured data for ItineraryCard rendering.
 *
 * This is intentionally lenient — it tries to parse what it can
 * and falls back gracefully to plain text for anything it can't.
 */

export interface ParsedActivity {
  time: string;
  title: string;
  details: string[];
  suitability: string[];
  prePlan: boolean;
}

export interface ParsedDay {
  dayNumber: number;
  title: string;
  activities: ParsedActivity[];
}

export interface ParseResult {
  preText: string;       // Text before the itinerary
  days: ParsedDay[];     // Parsed day cards
  postText: string;      // Text after the itinerary
  hasItinerary: boolean; // Whether we found parseable days
}

const DAY_PATTERN = /^#{1,3}\s*(?:\*\*)?Day\s+(\d+)[:\s—–-]*(.+?)(?:\*\*)?$/im;
const TIME_PATTERN = /^(?:\*\*)?(?:🌅|🌞|☀️|🌆|🌙|🍽️?)?\s*((?:Morning|Afternoon|Evening|Night|Lunch|Dinner|Breakfast|\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?(?:\s*[–-]\s*\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)?))[:\s—–-]*(.+?)(?:\*\*)?$/;
const SUITABILITY_PATTERN = /^(⚠️|👶|✅|⏰|🧓|♿|👴|👵).+$/;
const PREPLAN_PATTERN = /📋\s*(?:Suggest to\s+)?(?:pre-?plan|book ahead|advance booking)/i;

export function parseItinerary(markdown: string): ParseResult {
  const lines = markdown.split("\n");
  const days: ParsedDay[] = [];
  let preLines: string[] = [];
  let postLines: string[] = [];
  let currentDay: ParsedDay | null = null;
  let currentActivity: ParsedActivity | null = null;
  let foundFirstDay = false;
  let afterLastDay = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for day header
    const dayMatch = trimmed.match(DAY_PATTERN);
    if (dayMatch) {
      // Save previous day
      if (currentDay) {
        if (currentActivity) currentDay.activities.push(currentActivity);
        days.push(currentDay);
      }
      currentDay = {
        dayNumber: parseInt(dayMatch[1]),
        title: dayMatch[2].trim().replace(/\*\*/g, ""),
        activities: [],
      };
      currentActivity = null;
      foundFirstDay = true;
      afterLastDay = false;
      continue;
    }

    // Before any day header — accumulate as pre-text
    if (!foundFirstDay) {
      preLines.push(line);
      continue;
    }

    // Inside a day — look for time blocks
    if (currentDay) {
      const timeMatch = trimmed.match(TIME_PATTERN);
      if (timeMatch) {
        if (currentActivity) currentDay.activities.push(currentActivity);
        currentActivity = {
          time: timeMatch[1].trim(),
          title: timeMatch[2].trim().replace(/\*\*/g, ""),
          details: [],
          suitability: [],
          prePlan: PREPLAN_PATTERN.test(trimmed),
        };
        continue;
      }

      // Check for suitability notes
      if (currentActivity && SUITABILITY_PATTERN.test(trimmed)) {
        currentActivity.suitability.push(trimmed);
        continue;
      }

      // Check for pre-plan markers on their own line
      if (currentActivity && PREPLAN_PATTERN.test(trimmed)) {
        currentActivity.prePlan = true;
        currentActivity.details.push(trimmed);
        continue;
      }

      // Regular content line inside an activity
      if (currentActivity && trimmed) {
        // Check if this detail line mentions pre-planning
        if (PREPLAN_PATTERN.test(trimmed)) {
          currentActivity.prePlan = true;
        }
        currentActivity.details.push(trimmed.replace(/^[-*•]\s*/, ""));
        continue;
      }
    }

    // Empty lines or unmatched content after days started
    if (foundFirstDay && !trimmed && !currentDay) {
      afterLastDay = true;
    }
    if (afterLastDay) {
      postLines.push(line);
    }
  }

  // Save last day and activity
  if (currentDay) {
    if (currentActivity) currentDay.activities.push(currentActivity);
    days.push(currentDay);
  }

  // Find post-text: everything after the last day's content
  // Re-scan from the end to find trailing text
  if (days.length > 0) {
    const lastDayPattern = new RegExp(
      `Day\\s+${days[days.length - 1].dayNumber}`,
      "i"
    );
    let lastDayLine = 0;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lastDayPattern.test(lines[i])) {
        lastDayLine = i;
        break;
      }
    }
    // Look for content after all activities of the last day
    let contentEndLine = lines.length;
    for (let i = lines.length - 1; i > lastDayLine; i--) {
      if (lines[i].trim()) {
        // Check if this line could be part of the last day
        const isActivity = TIME_PATTERN.test(lines[i].trim());
        const isSuitability = SUITABILITY_PATTERN.test(lines[i].trim());
        const isBullet = /^[-*•]/.test(lines[i].trim());
        if (!isActivity && !isSuitability && !isBullet) {
          // Might be post-text — check for a blank line separator
          for (let j = i; j > lastDayLine; j--) {
            if (!lines[j].trim()) {
              postLines = lines.slice(j + 1).filter((l) => l.trim());
              contentEndLine = j;
              break;
            }
          }
        }
        break;
      }
    }
  }

  return {
    preText: preLines.join("\n").trim(),
    days,
    postText: postLines.join("\n").trim(),
    hasItinerary: days.length > 0,
  };
}
