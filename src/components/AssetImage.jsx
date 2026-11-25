import { useState } from 'react';
import { resolveAssetImageUrl } from '../services/assetImageUrl';

const PLACEHOLDER_URL = '/asset-image-placeholder.svg';

export default function AssetImage({ imageUrl, alt, ...props }) {
    const source = resolveAssetImageUrl(imageUrl);
    const [failedSource, setFailedSource] = useState(null);

    return (
        <img
            {...props}
            src={source && failedSource !== source ? source : PLACEHOLDER_URL}
            alt={alt}
            onError={() => setFailedSource(source)}
        />
    );
}
