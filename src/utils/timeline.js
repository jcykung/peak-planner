// Simulated Sunset database mapping (Vancouver monthly sunset times)
export const SUNSET_DATABASE = [
    "16:45", // Jan
    "17:30", // Feb
    "19:15", // Mar
    "20:00", // Apr
    "20:45", // May
    "21:15", // Jun
    "21:00", // Jul
    "20:15", // Aug
    "19:15", // Sep
    "18:15", // Oct
    "16:45", // Nov
    "16:15"  // Dec
];

export function formatDecimalHour(decimalHours) {
    let hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);
    const ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12;
    hours = hours ? hours : 12; // 0 matches 12
    const strMinutes = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${strMinutes} ${ampm}`;
}

export function formatDurationText(hours) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h === 0) return `${m} mins`;
    return `${h}h ${m}m`;
}

export function calculateTimelineSplits({ duration, planPace, departHour, lingerMinutes, dateStr }) {
    // Split timelines math: Standard splits are 55% ascent, 45% descent
    const adjustedDuration = duration * planPace;
    const ascentDuration = adjustedDuration * 0.55;
    const descentDuration = adjustedDuration * 0.45;

    const timeDepart = departHour;
    const timeSummit = timeDepart + ascentDuration;
    const timeDescent = timeSummit + (lingerMinutes / 60);
    const timeReturn = timeDescent + descentDuration;

    // Check Sunset Constraints
    // Handle timezone parsing properly by forcing local/UTC boundary logic safely
    const parsedDate = new Date(dateStr + "T00:00:00");
    const targetMonth = isNaN(parsedDate.getTime()) ? 6 : parsedDate.getMonth(); // Default to July (index 6) if invalid
    const sunsetString = SUNSET_DATABASE[targetMonth];
    const parts = sunsetString.split(':');
    const sunsetDecimal = parseInt(parts[0]) + (parseInt(parts[1]) / 60);

    const isAfterSunset = timeReturn >= sunsetDecimal;

    return {
        timeDepart,
        timeSummit,
        timeDescent,
        timeReturn,
        ascentDuration,
        descentDuration,
        sunsetDecimal,
        isAfterSunset
    };
}
