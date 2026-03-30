import React, { useState, useEffect, useRef, useContext } from 'react';
import { CloudSun, Wind, Droplets, Cloud, Sun, CloudRain, Navigation } from 'lucide-react';
import { isValidLatLng } from '../utils';

import { LocationContext, AppContext } from '../types';

interface WeatherData {
  temp: number;
  condition: string;
  windSpeed: number;
  windDir: string;
  precip: number;
  locationName: string;
}

export const WeatherAnalyticsCard = React.memo(() => {
  const locationContext = React.useContext(LocationContext);
  const appContext = React.useContext(AppContext);
  const isMetric = appContext?.unitSystem === 'metric';
  const userLocation = locationContext?.userLocation || null;
  console.log("WeatherAnalyticsCard: Rendering with userLocation:", userLocation);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [_error, setError] = useState<string | null>(null);

  const lastFetchPos = React.useRef<[number, number] | null>(null);

  useEffect(() => {
    async function fetchWeather() {
      if (!isValidLatLng(userLocation)) {
        setLoading(false);
        setError("Waiting for location...");
        return;
      }
      
      const [lat, lon] = userLocation;
      
      if (lastFetchPos.current) {
        const [lastLat, lastLon] = lastFetchPos.current;
        const dist = Math.sqrt(Math.pow(lat - lastLat, 2) + Math.pow(lon - lastLon, 2));
        if (dist < 0.045) return;
      }

      try {
        if (!weather) setLoading(true);
        console.log("WeatherAnalyticsCard: Fetching weather for", lat, lon);
        
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`, {
           headers: { 
             'Accept-Language': 'en',
             'User-Agent': 'TruckersNav/1.0'
           }
        });
        const geoData = await geoRes.json();
        console.log("WeatherAnalyticsCard: Geocode data", geoData);
        if (!geoData || !geoData.address) {
          throw new Error("Invalid geolocation data received");
        }
        const city = geoData.address.city || geoData.address.town || geoData.address.village || geoData.address.suburb || "Unknown Site";

        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=fahrenheit&windspeed_unit=mph`, {
          headers: { 'User-Agent': 'TruckersNav/1.0' }
        });
        const weatherData = await weatherRes.json();
        console.log("WeatherAnalyticsCard: Weather data", weatherData);
        if (!weatherData || !weatherData.current_weather) {
            throw new Error("Invalid weather data received");
        }
        const current = weatherData.current_weather;
        lastFetchPos.current = [lat, lon];
        
        setWeather({
          temp: Math.round(current.temperature),
          condition: getWeatherCondition(current.weathercode),
          windSpeed: Math.round(current.windspeed),
          windDir: getWindDirection(current.winddirection),
          precip: 0,
          locationName: city
        });
        setError(null);
      } catch (err) {
        console.error("Weather fetch failed. Error details:", err);
        setError(`Weather data unavailable: ${err instanceof Error ? err.message : String(err)}`);
        setWeather(null);
      } finally {
        setLoading(false);
      }
    }
    fetchWeather().catch(err => console.error("Dashboard weather fetch failed:", err));
  }, [userLocation ? userLocation[0] : null, userLocation ? userLocation[1] : null]);

  const getWeatherCondition = (code: number) => {
    if (code === 0) return "Clear";
    if (code <= 3) return "Partly Cloudy";
    if (code <= 48) return "Foggy";
    if (code <= 67) return "Rainy";
    if (code <= 77) return "Snowy";
    return "Stormy";
  };

  const getWindDirection = (deg: number) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return directions[Math.round(deg / 45) % 8];
  };

  const WeatherIcon = () => {
    if (!weather) return <CloudSun className="w-6 h-6 md:w-8 md:h-8" />;
    if (weather.condition === "Clear") return <Sun className="w-6 h-6 md:w-8 md:h-8 text-[#D4AF37]" />;
    if (weather.condition.includes("Cloudy")) return <CloudSun className="w-6 h-6 md:w-8 md:h-8 text-[#D4AF37]" />;
    if (weather.condition.includes("Rainy") || weather.condition.includes("Stormy")) return <CloudRain className="w-6 h-6 md:w-8 md:h-8 text-[#D4AF37]" />;
    return <Cloud className="w-6 h-6 md:w-8 md:h-8 text-zinc-500" />;
  };

  return (
    <div className="bg-black/80 backdrop-blur-3xl border border-white/10 p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] group transition-all hover:border-[#D4AF37]/30 flex flex-col justify-between shadow-2xl">
      <div>
        <div className="flex justify-between items-center mb-6 md:mb-8">
          <div className="flex-1">
            <div className="text-zinc-600 text-[8px] md:text-[10px] font-bold uppercase tracking-widest mb-2 md:mb-3 flex items-center gap-2">
              <Navigation className="w-3 h-3 text-[#D4AF37]" />
              Local Environment
            </div>
            {loading ? (
              <div className="h-8 md:h-12 w-24 md:w-32 bg-white/5 rounded-xl md:rounded-2xl animate-pulse mb-1" />
            ) : weather ? (
              <div className="text-2xl md:text-4xl font-bold text-white tracking-tight flex items-baseline gap-2 md:gap-3 leading-none">
                {isMetric ? Math.round((weather.temp - 32) * 5/9) : weather.temp}°{isMetric ? 'C' : 'F'}
                <span className="text-[#D4AF37] font-bold text-[8px] md:text-xs uppercase tracking-widest">
                  {weather.condition}
                </span>
              </div>
            ) : (
              <div className="text-zinc-500 text-sm">No weather data</div>
            )}
          </div>
          <div className="bg-[#D4AF37] p-3 md:p-4 rounded-xl md:rounded-2xl text-black shadow-[0_0_20px_rgba(212,175,55,0.3)]">
            <WeatherIcon />
          </div>
        </div>

        {weather ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 p-4 rounded-2xl flex items-center gap-4 border border-white/5">
              <Wind className="w-5 h-5 text-[#D4AF37]" />
              <div>
                <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Wind</div>
                <div className="text-xs font-bold text-white uppercase">
                  {isMetric ? `${Math.round(weather.windSpeed * 1.60934)} km/h ${weather.windDir}` : `${weather.windSpeed} mph ${weather.windDir}`}
                </div>
              </div>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl flex items-center gap-4 border border-white/5">
              <Droplets className="w-5 h-5 text-[#D4AF37]" />
              <div>
                <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Precip</div>
                <div className="text-xs font-bold text-white uppercase">{`${weather.precip}%`}</div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
         <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-[#D4AF37] rounded-full animate-pulse shadow-[0_0_15px_#D4AF37]" />
            <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">
              {weather && weather.temp > 0 ? "Optimal Surface" : "Caution: Icy"}
            </span>
         </div>
         <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest truncate max-w-[120px]">
           {loading ? "Locating..." : (weather?.locationName || "Unknown")}
         </span>
      </div>
    </div>
  );
});
