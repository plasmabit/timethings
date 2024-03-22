export function formatTime(seconds: number): string {
    const minutesInHour = 60;
    const hoursInDay = 24;
    
    if (seconds < minutesInHour) {
        return `${seconds} second${seconds > 1 ? 's' : ''}`;
    } else if (seconds < minutesInHour * hoursInDay) {
        const minutes = Math.floor(seconds / minutesInHour);
        const remainingSeconds = seconds % minutesInHour;
        if (remainingSeconds === 0) {
            return `${minutes} minute${minutes > 1 ? 's' : ''}`;
        } else {
            return `${minutes} minute${minutes > 1 ? 's' : ''}, ${remainingSeconds} second${remainingSeconds > 1 ? 's' : ''}`;
        }
    } else {
        const days = Math.floor(seconds / (minutesInHour * hoursInDay));
        const remainingSeconds = seconds % (minutesInHour * hoursInDay);
        const hours = Math.floor(remainingSeconds / minutesInHour);
        if (hours === 0) {
            return `${days} day${days > 1 ? 's' : ''}`;
        } else {
            return `${days} day${days > 1 ? 's' : ''}, ${hours} hour${hours > 1 ? 's' : ''}`;
        }
    }
}