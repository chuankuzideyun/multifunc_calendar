import { env } from '../config/env';

export interface WeatherCondition {
  temp: number;
  hasRain: boolean;
  pop: number; // Probability of precipitation (0 to 1)
  description: string;
  dateTime: Date; // The local date/time of this forecast
}

export interface WeekendWeatherForecast {
  saturday?: WeatherCondition;
  sunday?: WeatherCondition;
  timezoneOffsetSeconds: number; // Offset from UTC in seconds for the queried location
}

/**
 * Fetches the 5-day / 3-hour weather forecast for a city and extracts the weekend morning forecasts.
 */
export async function getWeekendWeather(city: string): Promise<WeekendWeatherForecast> {
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

    const forecast: WeekendWeatherForecast = {
      timezoneOffsetSeconds
    };

    // Get current date relative to the city's timezone
    const nowUtc = new Date();
    
    // We want to find the next Saturday and Sunday
    const todayLocal = new Date(nowUtc.getTime() + timezoneOffsetSeconds * 1000);
    const currentDay = todayLocal.getUTCDay(); // 0 (Sun) to 6 (Sat)
    
    let daysToSaturday = (6 - currentDay + 7) % 7;
    let daysToSunday = (7 - currentDay + 7) % 7;
    
    // If today is Friday, Saturday is tomorrow (+1), Sunday (+2).
    // If today is Saturday, Sat is today (+0), Sunday is tomorrow (+1).
    if (daysToSaturday === 0 && currentDay === 6) {
      // If today is Saturday, we plan for today (this morning). If it's already past 8:00 AM, we can still plan or check Sunday.
    }

    const targetSatDate = new Date(todayLocal);
    targetSatDate.setUTCDate(todayLocal.getUTCDate() + daysToSaturday);
    targetSatDate.setUTCHours(8, 0, 0, 0); // Target Sat 8:00 AM local

    const targetSunDate = new Date(todayLocal);
    targetSunDate.setUTCDate(todayLocal.getUTCDate() + daysToSunday);
    targetSunDate.setUTCHours(8, 0, 0, 0); // Target Sun 8:00 AM local

    let bestSatDiff = Infinity;
    let bestSunDiff = Infinity;

    for (const item of list) {
      const dtMs = item.dt * 1000;
      const itemLocalDate = new Date(dtMs + timezoneOffsetSeconds * 1000);
      
      const satDiff = Math.abs(itemLocalDate.getTime() - targetSatDate.getTime());
      const sunDiff = Math.abs(itemLocalDate.getTime() - targetSunDate.getTime());

      // Find closest slot within 4 hours
      if (satDiff < bestSatDiff && satDiff < 4 * 60 * 60 * 1000) {
        bestSatDiff = satDiff;
        forecast.saturday = parseForecastItem(item, itemLocalDate);
      }
      if (sunDiff < bestSunDiff && sunDiff < 4 * 60 * 60 * 1000) {
        bestSunDiff = sunDiff;
        forecast.sunday = parseForecastItem(item, itemLocalDate);
      }
    }

    return forecast;
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
