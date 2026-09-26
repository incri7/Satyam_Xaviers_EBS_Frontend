/** A readable name for the browser a session was opened from. */
export interface DeviceName {
    browser: string | null;
    os: string | null;
    mobile: boolean;
}

export function deviceName(agent: string | null | undefined): DeviceName {
    const ua = agent ?? '';
    const browser =
        /Edg\//.test(ua) ? 'Edge'
            : /OPR\/|Opera/.test(ua) ? 'Opera'
                : /SamsungBrowser/.test(ua) ? 'Samsung Internet'
                    : /Firefox\//.test(ua) ? 'Firefox'
                        : /Chrome\/|CriOS/.test(ua) ? 'Chrome'
                            : /Safari\//.test(ua) && /Version\//.test(ua) ? 'Safari'
                                : null;
    const os =
        /Android/.test(ua) ? 'Android'
            : /iPhone|iPod/.test(ua) ? 'iPhone'
                : /iPad/.test(ua) ? 'iPad'
                    : /Windows/.test(ua) ? 'Windows'
                        : /CrOS/.test(ua) ? 'ChromeOS'
                            : /Mac OS X|Macintosh/.test(ua) ? 'Mac'
                                : /Linux/.test(ua) ? 'Linux'
                                    : null;
    return { browser, os, mobile: /Android|iPhone|iPod|Mobile/.test(ua) };
}
