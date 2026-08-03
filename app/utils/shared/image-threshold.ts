export function createThresholdedImageUrl(
    imageUrl: string,
    threshold = 64,
    width = 24,
    height = 24,
    maxProcessSize = 128,
    invert = true,
): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');

            let imgWidth = img.naturalWidth;
            let imgHeight = img.naturalHeight;

            if (Math.max(imgWidth, imgHeight) > maxProcessSize) {
                const ratio = Math.min(maxProcessSize / imgWidth, maxProcessSize / imgHeight);
                imgWidth = Math.round(imgWidth * ratio);
                imgHeight = Math.round(imgHeight * ratio);
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Canvas not supported'));

            const imgRatio = imgWidth / imgHeight;
            const canvasRatio = width / height;

            let drawWidth: number;
            let drawHeight: number;
            let offsetX = 0;
            let offsetY = 0;

            if (imgRatio > canvasRatio) {
                drawWidth = width;
                drawHeight = Math.round(width / imgRatio);
                offsetY = Math.round((height - drawHeight) / 2);
            }
            else {
                drawHeight = height;
                drawWidth = Math.round(height * imgRatio);
                offsetX = Math.round((width - drawWidth) / 2);
            }

            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

            if (invert) {
                const imageData = ctx.getImageData(0, 0, width, height);
                const data = imageData.data;

                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    const a = data[i + 3];

                    if (a > 0) {
                        const brightness = (0.299 * r) + (0.587 * g) + (0.114 * b);

                        if (brightness < threshold) {
                            data[i] = 255;
                            data[i + 1] = 255;
                            data[i + 2] = 255;
                        }
                    }
                }

                ctx.putImageData(imageData, 0, 0);
            }

            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => reject(new Error(`Failed to load image: ${ imageUrl }`));
        img.src = imageUrl;
    });
}
