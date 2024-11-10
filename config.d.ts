declare const config: {
    bot: {
        token: string;
        client: {
            id: string;
            secret: string;
        };
        embedColor: {
            err: string;
            warn: string;
            success: string;
            magic: string;
            helix: string;
            default: string;
        };
        ownerIDs: string[];
        port: number;
        mongoUri: string;
    };
    dashboard: {
        port: number;
        domain: string;
        redirectUri: string;
        license: string;
        ownerIDs: string[];
        mongoUri: string;
        supportMail: string;
        ui: {
            darkLogo: string;
            lightLogo: string;
            preload: string;
        };
    };
};
export default config;
//# sourceMappingURL=config.d.ts.map