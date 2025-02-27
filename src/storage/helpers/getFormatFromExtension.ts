export const getFormatFromExtension = (ext: string): string => {
    switch (ext.toLowerCase()) {
        case '.jpg':
        case '.jpeg':
            return 'jpeg';
        case '.png':
            return 'png';
        case '.webp':
            return 'webp';
        case '.gif':
            return 'gif';
        default:
            return 'jpeg';
    }
}