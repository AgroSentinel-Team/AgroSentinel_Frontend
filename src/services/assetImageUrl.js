import { API_ORIGIN } from './apiConfig';

export const resolveAssetImageUrl = (imageUrl) => {
    if (!imageUrl) return null;

    try {
        return new URL(imageUrl, `${API_ORIGIN}/`).href;
    } catch {
        return null;
    }
};
