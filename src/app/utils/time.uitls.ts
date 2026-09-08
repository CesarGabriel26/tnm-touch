export function getTimeBetween(start: Date, end: Date) {
    const totalMs = Math.abs(end.getTime() - start.getTime());

    const totalSeconds = Math.floor(totalMs / 1000);
    const totalMinutes = Math.floor(totalMs / (1000 * 60));
    const totalHours = Math.floor(totalMs / (1000 * 60 * 60));
    const totalDays = Math.floor(totalMs / (1000 * 60 * 60 * 24));

    return {
        totalSeconds,
        totalMinutes,
        totalHours,
        totalDays,

        h: totalHours % 24,
        m: totalMinutes % 60,
        s: totalSeconds % 60
    };
}

export const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
