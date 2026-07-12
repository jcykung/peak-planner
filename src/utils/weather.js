// Elevation and Time-Aware Windy.com GFS/ECMWF Weather Simulation Engine
export function getElevationCorrectedWeather(hike, dateStr, timeHour = 8.0) {
    if (!hike) return null;
    
    const date = new Date(dateStr + "T00:00:00"); // Add time to prevent local timezone shifting issues
    const month = date.getMonth(); // 0-11

    // Average standard city baseline temps (Vancouver monthly averages)
    const cityBaselines = [5, 7, 10, 13, 16, 19, 23, 23, 19, 13, 8, 5];
    const baseTemp = cityBaselines[month];

    const lapse = Math.round(hike.elevation * 0.0065);
    const elevationAdjustedBaseTemp = baseTemp - lapse;

    // Seed pseudo-random based on date to keep it consistent on page re-renders for the same day
    const seed = date.getDate() + month * 31 + Math.round(hike.coords[0] * 10) + Math.round(hike.coords[1] * 10);
    const pseudoRandom = ((seed * 9301 + 49297) % 233280) / 233280.0;

    // Diurnal temperature cycle: coldest at 5:00 AM, warmest at 3:00 PM (15.0)
    const cycleValue = Math.cos((timeHour - 15) * Math.PI / 12); // peaks at 15.0 (value = 1), lowest at 3 AM (value = -1)
    const diurnalTempOffset = Math.round(cycleValue * 4); // range from -4°C to +4°C
    const finalTemp = elevationAdjustedBaseTemp + diurnalTempOffset;

    // Cloud Cover: base seasonal + daily seed + diurnal factor
    const hourlyCloudOffset = Math.sin((timeHour - 8) * Math.PI / 12) * 15; // -15 to +15%
    let baseCloud = 30 + pseudoRandom * 50; // 30% to 80% base
    if (month >= 10 || month <= 3) baseCloud += 25; // winter cloudier
    if (month >= 6 && month <= 8) baseCloud -= 20; // summer clearer
    const cloudCover = Math.min(100, Math.max(0, Math.round(baseCloud + hourlyCloudOffset)));

    // Wind speed and gusts: wind usually rises in the afternoon
    const windBase = 5 + pseudoRandom * 12; // 5 to 17 kt base
    const windHourFactor = 1 + Math.max(0, Math.sin((timeHour - 8) * Math.PI / 12) * 0.4); 
    const avgWindSpeed = Math.round(windBase * windHourFactor);
    const windGustSpeed = Math.round(avgWindSpeed * (1.3 + pseudoRandom * 0.3));

    // Wind direction
    const windDirections = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    const windDirIndex = Math.floor((pseudoRandom * 16 + (timeHour / 4)) % 16);
    const windDirection = windDirections[windDirIndex];

    // UV Index: peaks at 12:00 PM (noon) to 1:00 PM, scales with month (summer vs winter)
    const uvPeakFactor = Math.max(0, Math.cos((timeHour - 12.5) * Math.PI / 8)); 
    const maxUvByMonth = [1, 2, 4, 6, 8, 10, 10, 9, 6, 4, 2, 1][month];
    const uvIndex = Math.round(maxUvByMonth * uvPeakFactor);

    // Air Quality Index (AQI): typical Vancouver range 10-40, plus morning/evening traffic spikes and forest fires
    const aqiBase = 15 + Math.round(pseudoRandom * 25);
    const aqiDiurnal = Math.sin((timeHour - 9) * Math.PI / 6) * 8; 
    const aqiSummerOffset = (month >= 6 && month <= 8 && pseudoRandom > 0.7) ? (40 + pseudoRandom * 120) : 0;
    const aqi = Math.round(Math.max(5, aqiBase + aqiDiurnal + aqiSummerOffset));

    // Relative Humidity (%)
    const humidityBase = [85, 80, 75, 70, 68, 65, 60, 62, 70, 78, 83, 86][month];
    const humidityHourFactor = -15 * cycleValue; 
    const humidity = Math.min(100, Math.max(15, Math.round(humidityBase + humidityHourFactor)));

    // Precipitation Chance and Rate
    let precipProb = 0;
    let precipRate = 0; // mm/h
    if (cloudCover > 70) {
        precipProb = Math.round((cloudCover - 65) * 2.85); // e.g. 100% clouds -> 100% rain
        precipRate = Math.round(((cloudCover - 70) * 0.1 * (1 + pseudoRandom * 2.5)) * 10) / 10;
    }

    // Determine conditions and alert styling
    let icon = "sun";
    let conditions = "Clear Skies";
    let alertClass = "text-monokai-yellow bg-monokai-yellow/10 border border-monokai-yellow/20";
    let alertText = "☀️ EXCELLENT CLIMB CONDITIONS: Subalpine wind and heat margins are safe. Pack sunscreen and insect defense spray.";

    if (precipProb > 50) {
        if (finalTemp < 1) {
            conditions = "Snowfall";
            icon = "cloud-snow";
            alertClass = "text-monokai-blue bg-monokai-blue/10 border border-monokai-blue/20";
            alertText = "❄️ ACTIVE SUMMIT SNOW: High freezing risk. Full winter layers and traction aids required. High slip hazard.";
        } else {
            conditions = "Rain / Showers";
            icon = "cloud-rain";
            alertClass = "text-monokai-purple bg-monokai-purple/10 border border-monokai-purple/20";
            alertText = "🌧️ ACTIVE WET TRAILS: Windy GFS model shows steady precipitation. Ground is slick. Mud layers are heavy near base routes. Wear robust Goretex shells.";
        }
    } else if (cloudCover > 60) {
        conditions = "Mostly Cloudy";
        icon = "cloud";
        alertClass = "text-monokai-dim bg-monokai-dim/10 border border-monokai-dim/20";
        alertText = "☁️ OVERCAST CANOPY: Cool damp forest tracks. Safe if standard hiking layers and boots are utilized.";
    } else if (cloudCover > 30) {
        conditions = "Partly Cloudy";
        icon = "cloud";
        alertClass = "text-monokai-dim bg-monokai-dim/10 border border-monokai-dim/20";
        alertText = "⛅ PARTLY CLOUDY: Great temperature balance. Excellent visibility across peaks.";
    }

    // Winter subalpine winter condition override
    if ((month >= 10 || month <= 3) && hike.elevation > 400 && conditions !== "Snowfall" && conditions !== "Rain / Showers") {
        conditions = "Deep Subalpine Snowpack";
        icon = "snowflake";
        alertClass = "text-monokai-blue bg-monokai-blue/10 border border-monokai-blue/20";
        alertText = "⚠️ ALPINE WINTER WARNING: High snowpack levels. Microspikes, mountain boots, and emergency snowshoes are mandatory. Low visibility potential.";
    }

    return {
        temp: finalTemp,
        conditions: conditions,
        windSpeed: avgWindSpeed,
        windGust: windGustSpeed,
        windDir: windDirection,
        clouds: cloudCover,
        uv: uvIndex,
        aqi: aqi,
        humidity: humidity,
        precipProb: precipProb,
        precipRate: precipRate,
        lapse: lapse,
        advice: alertText,
        icon: icon,
        colorClass: alertClass
    };
}
