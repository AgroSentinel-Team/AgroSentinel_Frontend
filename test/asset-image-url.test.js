import { describe, expect, it } from 'vitest';
import { API_ORIGIN } from '../src/services/apiConfig';
import { resolveAssetImageUrl } from '../src/services/assetImageUrl';

describe('resolveAssetImageUrl', () => {
    it('resolves backend-relative paths against the API origin', () => {
        expect(resolveAssetImageUrl('/uploads/asset-images/tractor.jpg'))
            .toBe(`${API_ORIGIN}/uploads/asset-images/tractor.jpg`);
    });

    it('preserves absolute image URLs', () => {
        expect(resolveAssetImageUrl('https://cdn.example.com/tractor.jpg'))
            .toBe('https://cdn.example.com/tractor.jpg');
    });

    it('returns null when the image URL is missing or malformed', () => {
        expect(resolveAssetImageUrl('')).toBeNull();
        expect(resolveAssetImageUrl('http://[invalid')).toBeNull();
    });
});
