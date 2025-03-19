import NodeCache from 'node-cache';

interface AuthCache {
    url: string;
    username: string;
    password: string;
    token: string;
}

const cache = new NodeCache();
const AUTH_KEY = 'auth_data';

export const setAuthData = (data: AuthCache): void => {
    cache.set(AUTH_KEY, data, 3600); // 1 hour TTL in seconds
};

export const getAuthData = (): AuthCache | null => {
    return cache.get(AUTH_KEY) || null;
};

export const clearAuthData = (): void => {
    cache.del(AUTH_KEY);
};

export const updateToken = (token: string): void => {
    const authData = getAuthData();
    if (authData) {
        authData.token = token;
        setAuthData(authData);
    }
};

export { cache };