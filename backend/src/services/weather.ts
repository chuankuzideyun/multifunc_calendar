import { env } from '../config/env';

export interface WeatherCondition {
  temp: number;
  hasRain: boolean;
  pop: number; // Probability of precipitation (0 to 1)
  description: string;
  dateTime: Date; // The local date/time of this forecast
}

export interface WeatherSuggestion {
  date: string;
  weekday: string;
  temp: number;
  condition: string;
  suitable: boolean;
  reason: string;
  startTime: Date;
  endTime: Date;
}

/**
 * Fetches the 5-day / 3-hour weather forecast for a city and extracts the next 7 days morning forecasts.
 */
export async function getFutureWeather(city: string): Promise<WeatherSuggestion[]> {
  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&units=metric&appid=${env.OPENWEATHERMAP_API_KEY}`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenWeatherMap error status ${res.status}: ${errText}`);
    }

    const data = await res.json() as any;
    const list = data.list || [];
    const timezoneOffsetSeconds = data.city?.timezone ?? 0; // timezone offset from UTC in seconds

    // Get current date relative to the city's timezone
    const nowUtc = new Date();
    const todayLocal = new Date(nowUtc.getTime() + timezoneOffsetSeconds * 1000);

    const suggestions: WeatherSuggestion[] = [];
    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    // Check tomorrow and the next 7 days (7 days in total, i from 1 to 7)
    for (let i = 1; i <= 7; i++) {
      const targetDate = new Date(todayLocal);
      targetDate.setUTCDate(todayLocal.getUTCDate() + i);
      targetDate.setUTCHours(8, 0, 0, 0); // Target 8:00 AM local

      let bestDiff = Infinity;
      let bestItem: any = null;

      for (const item of list) {
        const dtMs = item.dt * 1000;
        const itemLocalDate = new Date(dtMs + timezoneOffsetSeconds * 1000);
        const diff = Math.abs(itemLocalDate.getTime() - targetDate.getTime());

        // Find closest slot within 4 hours
        if (diff < bestDiff && diff < 4 * 60 * 60 * 1000) {
          bestDiff = diff;
          bestItem = item;
        }
      }

      if (bestItem) {
        const parsed = parseForecastItem(bestItem, targetDate);
        const suitable = checkRunningCriteria(parsed);

        const cond = bestItem.weather?.[0]?.main || 'Clear';
        const weatherName = cond.charAt(0).toUpperCase() + cond.slice(1).toLowerCase();

        // Build reason
        let reason = '';
        const tempRound = Math.round(parsed.temp);
        if (suitable) {
          reason = `${weatherName}, ${tempRound}°C, suitable for a morning run`;
        } else {
          if (parsed.temp >= 25) {
            reason = `Temperature too high (${tempRound}°C), not suitable for a morning run`;
          } else if (parsed.hasRain) {
            reason = `Weather is unfavorable (${weatherName}), not suitable for a morning run`;
          } else if (parsed.pop >= 0.3) {
            reason = `Precipitation probability too high (${Math.round(parsed.pop * 100)}%), not suitable for a morning run`;
          } else {
            reason = `${weatherName}, not suitable for a morning run`;
          }
        }

        const year = targetDate.getUTCFullYear();
        const month = String(targetDate.getUTCMonth() + 1).padStart(2, '0');
        const dateStr = String(targetDate.getUTCDate()).padStart(2, '0');
        const date = `${year}-${month}-${dateStr}`;

        const weekday = weekdays[targetDate.getUTCDay()];

        // Calculate UTC start and end time
        const startTime = new Date(targetDate.getTime() - timezoneOffsetSeconds * 1000);
        const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 9:00 AM local

        suggestions.push({
          date,
          weekday,
          temp: tempRound,
          condition: cond,
          suitable,
          reason,
          startTime,
          endTime
        });
      }
    }

    return suggestions;
  } catch (error) {
    console.error(`[Weather Service Error] Failed to fetch weather for ${city}:`, error);
    throw error;
  }
}

function parseForecastItem(item: any, localDate: Date): WeatherCondition {
  const temp = item.main?.temp;
  const pop = item.pop ?? 0;
  
  const weatherArray = item.weather || [];
  const mainCondition = weatherArray[0]?.main?.toLowerCase() || '';
  const description = weatherArray[0]?.description?.toLowerCase() || '';

  const unfavorableKeywords = ['rain', 'storm', 'snow', 'drizzle', 'thunderstorm'];
  const hasRain = unfavorableKeywords.some(keyword => 
    mainCondition.includes(keyword) || description.includes(keyword)
  );

  return {
    temp,
    hasRain,
    pop,
    description: weatherArray[0]?.description || 'clear sky',
    dateTime: localDate
  };
}

export function checkRunningCriteria(weather: WeatherCondition): boolean {
  return weather.temp < 25 && !weather.hasRain && weather.pop < 0.3;
}
