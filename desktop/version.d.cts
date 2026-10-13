export declare function versionFromTitle(title: string): string | null;
export declare function isNewer(a: string, b: string): boolean;
export declare function installerName(editionName: string): string;
export declare function siteVersion(json: unknown, platform: 'windows' | 'android'): string | null;
export declare const VERSION_URL: string;
export declare const DOWNLOAD_PAGE: string;
