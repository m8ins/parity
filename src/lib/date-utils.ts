/**
 * Formats a date string (YYYY-MM-DD) into a human-readable format (MMM D, YYYY).
 * Example: "2025-12-24" -> "Dec 24, 2025" (en-US) / "24. Dez. 2025" (de-DE)
 *
 * We construct the date specifically to avoid timezone issues.
 * "2025-12-24" should be treated as Dec 24th regardless of where the user is.
 *
 * `locale` defaults to en-US; pass the active UI locale (see useLocale) to honor
 * the user's browser language.
 */
export function formatDate(
    isoDateString: string,
    locale: string = 'en-US',
): string {
    if (!isoDateString) return '-';

    const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    };

    // Split YYYY-MM-DD
    const parts = isoDateString.split('-');
    if (parts.length !== 3) {
        // Fallback for unexpected formats, try standard parsing or return original
        const date = new Date(isoDateString);
        if (isNaN(date.getTime())) return isoDateString;

        return new Intl.DateTimeFormat(locale, options).format(date);
    }

    const year = parseInt(parts[0], 10);
    const monthIndex = parseInt(parts[1], 10) - 1; // 0-based
    const day = parseInt(parts[2], 10);

    const date = new Date(year, monthIndex, day);

    return new Intl.DateTimeFormat(locale, options).format(date);
}
