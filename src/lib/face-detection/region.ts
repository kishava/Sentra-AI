export type FaceBox = { x: number; y: number; width: number; height: number };

function isSkinPixel(r: number, g: number, b: number) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max - min < 15) return false;
  return (
    r > 95 &&
    g > 40 &&
    b > 20 &&
    r > g &&
    r > b &&
    Math.abs(r - g) > 12 &&
    r - b > 12 &&
    r / Math.max(1, g) < 1.9 &&
    g / Math.max(1, b) < 2.2
  );
}

export function isPlausibleFaceBox(box: FaceBox, width: number, height: number) {
  if (box.width < 24 || box.height < 24) return false;
  const aspect = box.width / box.height;
  if (aspect < 0.55 || aspect > 1.35) return false;

  const areaRatio = (box.width * box.height) / (width * height);
  if (areaRatio < 0.015 || areaRatio > 0.72) return false;

  const centerY = (box.y + box.height / 2) / height;
  const centerX = (box.x + box.width / 2) / width;
  if (centerY > 0.78 || centerY < 0.05) return false;
  if (centerX < 0.12 || centerX > 0.88) return false;

  return true;
}

/** Portrait-oriented fallback: face in upper-center, not vertical center of frame. */
export function portraitFaceFallback(width: number, height: number): FaceBox {
  const faceWidth = Math.min(width * 0.52, height * 0.46);
  const faceHeight = faceWidth * 1.15;
  return {
    x: Math.max(0, (width - faceWidth) / 2),
    y: Math.max(0, height * 0.06),
    width: faceWidth,
    height: Math.min(faceHeight, height * 0.55),
  };
}

function expandBox(box: FaceBox, width: number, height: number, padding = 0.12): FaceBox {
  const padX = box.width * padding;
  const padY = box.height * padding;
  const x = Math.max(0, box.x - padX);
  const y = Math.max(0, box.y - padY);
  const right = Math.min(width, box.x + box.width + padX);
  const bottom = Math.min(height, box.y + box.height + padY);
  return { x, y, width: right - x, height: bottom - y };
}

/**
 * Estimate the primary face region from canvas pixels (skin-tone clustering in upper frame).
 */
export function detectSkinToneFaceRegion(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): FaceBox | null {
  const maxScanY = Math.floor(height * 0.82);
  const stride = Math.max(2, Math.floor(Math.min(width, height) / 280));

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let hits = 0;

  for (let y = 0; y < maxScanY; y += stride) {
    for (let x = 0; x < width; x += stride) {
      const index = (y * width + x) * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      if (!isSkinPixel(r, g, b)) continue;
      hits += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  const minHits = Math.max(24, Math.floor((width * height) / (stride * stride * 180)));
  if (hits < minHits || maxX <= minX || maxY <= minY) return null;

  const raw: FaceBox = {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };

  const expanded = expandBox(raw, width, height, 0.18);
  return isPlausibleFaceBox(expanded, width, height) ? expanded : null;
}

export function pickBestFaceBox(candidates: FaceBox[], width: number, height: number): FaceBox | null {
  const valid = candidates.filter((box) => isPlausibleFaceBox(box, width, height));
  if (!valid.length) return null;

  return valid.sort((a, b) => {
    const score = (box: FaceBox) => {
      const centerY = (box.y + box.height / 2) / height;
      const centerX = (box.x + box.width / 2) / width;
      const area = (box.width * box.height) / (width * height);
      const upperBias = centerY < 0.42 ? 1.4 : centerY < 0.55 ? 1.1 : 0.55;
      const centerBias = 1 - Math.abs(centerX - 0.5) * 0.8;
      const sizeBias = area >= 0.04 && area <= 0.42 ? 1.2 : 0.7;
      return upperBias * centerBias * sizeBias;
    };
    return score(b) - score(a);
  })[0];
}

export type ObjectContainLayout = {
  offsetX: number;
  offsetY: number;
  displayWidth: number;
  displayHeight: number;
};

/** Map analysis-space coords to CSS px inside a letterboxed object-contain container. */
export function getObjectContainLayout(
  containerWidth: number,
  containerHeight: number,
  imageWidth: number,
  imageHeight: number,
): ObjectContainLayout {
  if (!containerWidth || !containerHeight || !imageWidth || !imageHeight) {
    return { offsetX: 0, offsetY: 0, displayWidth: containerWidth, displayHeight: containerHeight };
  }

  const containerAspect = containerWidth / containerHeight;
  const imageAspect = imageWidth / imageHeight;

  if (imageAspect > containerAspect) {
    const displayWidth = containerWidth;
    const displayHeight = containerWidth / imageAspect;
    return {
      offsetX: 0,
      offsetY: (containerHeight - displayHeight) / 2,
      displayWidth,
      displayHeight,
    };
  }

  const displayHeight = containerHeight;
  const displayWidth = containerHeight * imageAspect;
  return {
    offsetX: (containerWidth - displayWidth) / 2,
    offsetY: 0,
    displayWidth,
    displayHeight,
  };
}

export function boxToOverlayStyle(
  box: FaceBox,
  analysisWidth: number,
  analysisHeight: number,
  layout: ObjectContainLayout,
) {
  const scaleX = layout.displayWidth / analysisWidth;
  const scaleY = layout.displayHeight / analysisHeight;
  return {
    left: layout.offsetX + box.x * scaleX,
    top: layout.offsetY + box.y * scaleY,
    width: box.width * scaleX,
    height: box.height * scaleY,
  };
}
