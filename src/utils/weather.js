// Standard Lapse Rate Formula: drops 0.65°C per 100 meters of elevation climb
export function getElevationCorrectedWeather(hike, dateStr) {
    if (!hike) return null;
    
    const date = new Date(dateStr + "T00:00:00"); // Add time to prevent local timezone shifting issues
    const month = date.getMonth(); // 0-11

    // Average standard city baseline temps (Vancouver monthly averages)
    const cityBaselines = [5, 7, 10, 13, 16, 19, 23, 23, 19, 13, 8, 5];
    const baseTemp = cityBaselines[month];

    const lapse = Math.round(hike.elevation * 0.0065);
    const peakTemp = baseTemp - lapse;

    let conditions = "Clear Skies";
    
    // Seed random based on date to keep it consistent on page re-renders for the same day
    const seed = date.getDate() + month * 31;
    const pseudoRandom = ((seed * 9301 + 49297) % 233280) / 233280.0;
    const windGust = Math.round(8 + pseudoRandom * 15);
    
    let alertClass = "text-monokai-yellow bg-monokai-yellow/10 border border-monokai-yellow/20";
    let alertText = "☀️ EXCELLENT CLIMB CONDITIONS: Subalpine wind and heat margins are safe. Pack sunscreen and insect defense spray.";
    let icon = "sun";

    // Late fall and winter snow season
    if (month >= 10 || month <= 3) {
        if (hike.elevation > 400) {
            conditions = "Deep Subalpine Snowpack";
            icon = "snowflake";
            alertClass = "text-monokai-blue bg-monokai-blue/10 border border-monokai-blue/20";
            alertText = "⚠️ ALPINE WINTER WARNING: High snowpack levels. Microspikes, mountain boots, and emergency snowshoes are mandatory. Low visibility potential.";
        } else {
            conditions = "Chilly Overcast Rain";
            icon = "cloud-rain";
            alertClass = "text-monokai-purple bg-monokai-purple/10 border border-monokai-purple/20";
            alertText = "🌧️ COLD WET TRAILS: Ground is slick. Mud layers are heavy near base routes. Wear robust Goretex shells.";
        }
    }
    // Spring melt transitional season
    else if (month >= 4 && month <= 5) {
        if (hike.elevation > 800) {
            conditions = "Melting Snow & Slush";
            icon = "cloud-snow";
            alertClass = "text-monokai-orange bg-monokai-orange/10 border border-monokai-orange/20";
            alertText = "⚠️ SLUSH RISK: High altitude transitions. Fast creek meltwaters are flooding low crossings. Avoid bank slide zones.";
        } else {
            conditions = "Damp Mist / Fog";
            icon = "cloud";
            alertClass = "text-monokai-dim bg-monokai-dim/10 border border-monokai-dim/20";
            alertText = "☁️ OVERCAST CANOPY: Cool damp forest tracks. Safe if standard hiking layers and boots are utilized.";
        }
    }

    return {
        temp: peakTemp,
        conditions: conditions,
        wind: windGust,
        lapse: lapse,
        advice: alertText,
        icon: icon,
        colorClass: alertClass
    };
}
