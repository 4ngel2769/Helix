declare const config: {
    bot: {
        token: string;
        client: {
            id: string;
            secret: string;
        };
        defaultPrefix?: string;
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
        version?: string;
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
        oauth: {
            clientId: string;
            clientSecret: string;
            scopes: string[];
            prompt: string;
        };
        session: {
            secret: string;
            name: string;
            saveUninitialized: boolean;
            resave: boolean;
            cookie: {
                maxAge: number;
                secure: boolean;
            };
        };
    };
    api: {
        port: number;
        origin: string;
        prefix: string;
        auth: {
            domain: string;
            secret: string;
            cookie: string;
            redirect: string;
            scopes: string[];
        };
    };
};
export default config;
//# sourceMappingURL=config.d.ts.map