import os
import requests
import datetime

def get_weekend_weather(location: str) -> dict:
    """
    Check the weather forecast for this weekend in a specified location.
    
    Args:
        location: Name of the city/location to query (e.g., 'London', 'Beijing').
        
    Returns:
        dict: A dictionary containing:
            - status (str): "success" or "error"
            - saturday (dict): Saturday weather info with keys: temp, condition, rain_prob, suitable.
            - sunday (dict): Sunday weather info with keys: temp, condition, rain_prob, suitable.
            - recommendation (str): Proactive suggestion.
    """
    api_key = os.getenv("OPENWEATHERMAP_API_KEY")
    if not api_key:
        return {"status": "error", "message": "OPENWEATHERMAP_API_KEY environment variable not set"}
        
    try:
        url = "https://api.openweathermap.org/data/2.5/forecast"
        params = {
            "q": location,
            "units": "metric",
            "appid": api_key
        }
        res = requests.get(url, params=params)
        if res.status_code != 200:
            return {"status": "error", "message": f"OpenWeatherMap API returned status {res.status_code}: {res.text}"}
            
        data = res.json()
        timezone_offset = data.get("city", {}).get("timezone", 0)
        forecast_list = data.get("list", [])
        
        # Calculate current time in target city's timezone
        now_utc = datetime.datetime.now(datetime.timezone.utc)
        now_local = now_utc + datetime.timedelta(seconds=timezone_offset)
        
        # Find next Saturday and Sunday
        # Monday is 0, Sunday is 6
        current_weekday = now_local.weekday()
        
        days_to_sat = (5 - current_weekday) % 7
        days_to_sun = (6 - current_weekday) % 7
        
        # Target local datetime for Saturday and Sunday at 8:00 AM
        sat_date = now_local.date() + datetime.timedelta(days=days_to_sat)
        sun_date = now_local.date() + datetime.timedelta(days=days_to_sun)
        
        sat_target = datetime.datetime.combine(sat_date, datetime.time(8, 0))
        sun_target = datetime.datetime.combine(sun_date, datetime.time(8, 0))
        
        sat_closest = None
        sun_closest = None
        sat_min_diff = datetime.timedelta(hours=4)  # Must be within 4 hours
        sun_min_diff = datetime.timedelta(hours=4)
        
        for item in forecast_list:
            dt = item.get("dt", 0)
            # Item local time
            item_local = datetime.datetime.fromtimestamp(dt, datetime.timezone.utc).replace(tzinfo=None) + datetime.timedelta(seconds=timezone_offset)
            
            sat_diff = abs(item_local - sat_target)
            if sat_diff < sat_min_diff:
                sat_min_diff = sat_diff
                sat_closest = item
                
            sun_diff = abs(item_local - sun_target)
            if sun_diff < sun_min_diff:
                sun_min_diff = sun_diff
                sun_closest = item

        # Helper to parse forecast item
        def parse_forecast(item):
            if not item:
                return None
            temp = item.get("main", {}).get("temp", 0)
            weather = item.get("weather", [{}])[0]
            condition = weather.get("main", "Clear")
            description = weather.get("description", "clear sky").lower()
            pop = item.get("pop", 0.0)
            
            unfavorable = ['rain', 'storm', 'snow', 'drizzle', 'thunderstorm']
            has_rain = any(kw in condition.lower() or kw in description for kw in unfavorable)
            
            # Suitable criteria: temp < 25 and no rain and pop < 0.3
            suitable = temp < 25 and not has_rain and pop < 0.3
            
            return {
                "temp": temp,
                "condition": condition,
                "rain_prob": pop,
                "suitable": suitable
            }
            
        sat_info = parse_forecast(sat_closest)
        sun_info = parse_forecast(sun_closest)
        
        # Build recommendation
        if sat_info and sun_info:
            sat_ok = sat_info["suitable"]
            sun_ok = sun_info["suitable"]
            if sat_ok and sun_ok:
                rec = "Both Saturday and Sunday look great for a morning run!"
            elif sat_ok:
                rec = "Saturday looks good for a morning run!"
            elif sun_ok:
                rec = "Sunday looks good for a morning run!"
            else:
                rec = "The weather doesn't look optimal for running this weekend."
        elif sat_info:
            rec = "Saturday looks good for a morning run!" if sat_info["suitable"] else "The weather doesn't look optimal for running this weekend."
        elif sun_info:
            rec = "Sunday looks good for a morning run!" if sun_info["suitable"] else "The weather doesn't look optimal for running this weekend."
        else:
            rec = "Could not find weekend weather forecast."
            
        return {
            "status": "success",
            "saturday": sat_info,
            "sunday": sun_info,
            "recommendation": rec
        }
        
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }
