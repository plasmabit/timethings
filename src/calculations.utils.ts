export function formatTime(seconds: number, fullNotation: boolean = false): string {
    const minutesInHour = 60;
    const hoursInDay = 24;
    
    if (seconds < minutesInHour) {
        return `${seconds}${fullNotation ? ' second' + (seconds > 1 ? 's' : '') : 's'}`;
    } else if (seconds < minutesInHour * hoursInDay) {
        const minutes = Math.floor(seconds / minutesInHour);
        const remainingSeconds = seconds % minutesInHour;
        if (remainingSeconds === 0) {
            return `${minutes}${fullNotation ? ' minute' + (minutes > 1 ? 's' : '') : 'm'}`;
        } else {
            return `${minutes}${fullNotation ? ' minute' + (minutes > 1 ? 's' : '') + ', ' + remainingSeconds + ' second' + (remainingSeconds > 1 ? 's' : '') : 'm ' + remainingSeconds + 's'}`;
        }
    } else {
        const days = Math.floor(seconds / (minutesInHour * hoursInDay));
        const remainingSeconds = seconds % (minutesInHour * hoursInDay);
        const hours = Math.floor(remainingSeconds / minutesInHour);
        if (hours === 0) {
            return `${days}${fullNotation ? ' day' + (days > 1 ? 's' : '') : 'd'}`;
        } else {
            return `${days}${fullNotation ? ' day' + (days > 1 ? 's' : '') + ', ' + hours + ' hour' + (hours > 1 ? 's' : '') : 'd ' + hours + 'h'}`;
        }
    }
}
