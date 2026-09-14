import type { Service } from "@/types/api";

export const PLATFORM_ORDER = [
    "Telegram",
    "Instagram",
    "YouTube",
    "Facebook",
    "TikTok",
    "Twitter",
    "Twitch",
    "Shopify",
    "SoundCloud",
    "Kick",
    "Other",
] as const;

export type PlatformName = (typeof PLATFORM_ORDER)[number];
export type Platform = PlatformName;

export type NormalizedService = Service & {
    platform: PlatformName;
    serviceType: string;
};

const PLATFORM_PATTERNS: Array<{
    platform: Exclude<PlatformName, "Other">;
    patterns: RegExp[];
}> = [
        {
            platform: "Telegram",
            patterns: [/\btelegram\b/i],
        },
        {
            platform: "Instagram",
            patterns: [/\binstagram\b/i, /\binsta\b/i],
        },
        {
            platform: "YouTube",
            patterns: [/\byoutube\b/i],
        },
        {
            platform: "Facebook",
            patterns: [/\bfacebook\b/i, /\bfb\b/i],
        },
        {
            platform: "TikTok",
            patterns: [/\btiktok\b/i, /\btik\s*tok\b/i],
        },
        {
            platform: "Twitter",
            patterns: [/\btwitter\b/i, /\bx\.com\b/i],
        },
        {
            platform: "Twitch",
            patterns: [/\btwitch\b/i],
        },
        {
            platform: "Shopify",
            patterns: [/\bshopify\b/i],
        },
        {
            platform: "SoundCloud",
            patterns: [/\bsoundcloud\b/i],
        },
        {
            platform: "Kick",
            patterns: [/\bkick\b/i],
        },
    ];

const SERVICE_TYPE_RULES: Array<{
    type: string;
    patterns: RegExp[];
}> = [
        {
            type: "Followers",
            patterns: [
                /\bfollowers?\b/i,
                /\bfollower\b/i,
                /\bprofile followers?\b/i,
                /\bpage followers?\b/i,
            ],
        },
        {
            type: "Likes",
            patterns: [
                /\blikes?\b/i,
                /\blike\b/i,
                /\bpage likes?\b/i,
                /\bpost likes?\b/i,
            ],
        },
        {
            type: "Views",
            patterns: [
                /\bviews?\b/i,
                /\bview\b/i,
                /\bvideo views?\b/i,
                /\breels? views?\b/i,
            ],
        },
        {
            type: "Comments",
            patterns: [
                /\bcomments?\b/i,
                /\bcomment\b/i,
                /\bpost comments?\b/i,
            ],
        },
        {
            type: "Members",
            patterns: [
                /\bmembers?\b/i,
                /\bmember\b/i,
                /\bgroup members?\b/i,
                /\bchannel members?\b/i,
            ],
        },
        {
            type: "Subscribers",
            patterns: [
                /\bsubscribers?\b/i,
                /\bsubscriber\b/i,
            ],
        },
        {
            type: "Reactions",
            patterns: [
                /\breactions?\b/i,
                /\breaction\b/i,
            ],
        },
        {
            type: "Shares",
            patterns: [
                /\bshares?\b/i,
                /\bshare\b/i,
            ],
        },
        {
            type: "Story Views",
            patterns: [
                /\bstory views?\b/i,
                /\bstories views?\b/i,
            ],
        },
        {
            type: "Watch Time",
            patterns: [
                /\bwatch time\b/i,
                /\bwatchtime\b/i,
            ],
        },
        {
            type: "Live Stream Views",
            patterns: [
                /\blive stream views?\b/i,
                /\blivestream views?\b/i,
                /\blive views?\b/i,
            ],
        },
        {
            type: "Saves",
            patterns: [
                /\bsaves?\b/i,
                /\bsaved\b/i,
            ],
        },
        {
            type: "Reposts",
            patterns: [
                /\breposts?\b/i,
                /\brepost\b/i,
            ],
        },
        {
            type: "Impressions",
            patterns: [
                /\bimpressions?\b/i,
                /\bimpression\b/i,
            ],
        },
    ];

function normalizeText(value: unknown): string {
    return String(value ?? "")
        .replace(/\s+/g, " ")
        .trim();
}

function serviceSearchText(service: Service): string {
    return [
        service.category,
        service.name,
        service.type,
    ]
        .map(normalizeText)
        .filter(Boolean)
        .join(" ");
}

export function getPlatform(service: Service): PlatformName {
    const category = normalizeText(service.category);
    const name = normalizeText(service.name);

    // Category is the primary source.
    for (const rule of PLATFORM_PATTERNS) {
        if (rule.patterns.some((pattern) => pattern.test(category))) {
            return rule.platform;
        }
    }

    // Service name is fallback.
    for (const rule of PLATFORM_PATTERNS) {
        if (rule.patterns.some((pattern) => pattern.test(name))) {
            return rule.platform;
        }
    }

    return "Other";
}

export function getServiceType(service: Service): string {
    const text = serviceSearchText(service);

    for (const rule of SERVICE_TYPE_RULES) {
        if (rule.patterns.some((pattern) => pattern.test(text))) {
            return rule.type;
        }
    }

    // Provider may expose a useful explicit type.
    const providerType = normalizeText(service.type);

    if (providerType) {
        return providerType;
    }

    return "Other";
}

export function normalizeService(service: Service): NormalizedService {
    return {
        ...service,
        platform: getPlatform(service),
        serviceType: getServiceType(service),
    };
}

export function normalizeServices(
    services: Service[],
): NormalizedService[] {
    return services.map(normalizeService);
}

export function getPlatformOptions(): PlatformName[] {
    return [...PLATFORM_ORDER];
}

export function getPlatformsWithServices(
    services: NormalizedService[],
): PlatformName[] {
    const platforms = new Set<PlatformName>();

    for (const service of services) {
        platforms.add(service.platform);
    }

    return PLATFORM_ORDER.filter((platform) => platforms.has(platform));
}

export function getPlatformServices(
    services: NormalizedService[],
    platform: PlatformName,
): NormalizedService[] {
    return services.filter((service) => service.platform === platform);
}

export function getServiceTypes(
    services: NormalizedService[],
    platform: PlatformName,
): string[] {
    const types = new Set<string>();

    for (const service of services) {
        if (service.platform === platform) {
            types.add(service.serviceType);
        }
    }

    return [...types].sort((a, b) => {
        if (a === "Other") return 1;
        if (b === "Other") return -1;

        return a.localeCompare(b);
    });
}

export function getServicesByType(
    services: NormalizedService[],
    platform: PlatformName,
    serviceType: string,
): NormalizedService[] {
    return services.filter(
        (service) =>
            service.platform === platform &&
            service.serviceType === serviceType,
    );
}

export function searchServices(
    services: NormalizedService[],
    query: string,
): NormalizedService[] {
    const term = query.trim().toLocaleLowerCase();

    if (!term) {
        return services;
    }

    return services.filter((service) => {
        const haystack = [
            service.name,
            service.category,
            service.type,
            service.platform,
            service.serviceType,
        ]
            .map((value) => normalizeText(value).toLocaleLowerCase())
            .join(" ");

        return haystack.includes(term);
    });
}