import { ShoeItem, PRESET_COLORS } from '../types/inventory';
import { setIdbItem, getIdbItem, getLocalDeletedShoeIds } from './idbStorage';

const STORAGE_KEY = 'iavenda_warehouse_inventory_v2';

const LEGACY_DEMO_SHOE_IDS = new Set([
  'iav-001',
  'iav-002',
  'iav-003',
  'iav-004',
  'iav-005',
  'iav-006',
]);

export function isReadyMadeImage(url?: string): boolean {
  if (!url) return true;
  return url.includes('images.unsplash.com');
}

export function stripReadyMadeImagesFromShoes(shoes: ShoeItem[]): ShoeItem[] {
  return shoes
    .filter((shoe) => shoe && !LEGACY_DEMO_SHOE_IDS.has(shoe.id))
    .map((shoe) => {
      const cleanedColors = (shoe.colors || []).map((c) => ({
        ...c,
        images: (c.images || []).filter((img) => img && !isReadyMadeImage(img)),
      }));
      const firstUploadedImage =
        cleanedColors.find((c) => c.images.length > 0)?.images[0] || '';
      const cleanPrimary =
        shoe.primaryImage && !isReadyMadeImage(shoe.primaryImage)
          ? shoe.primaryImage
          : firstUploadedImage;
      return {
        ...shoe,
        primaryImage: cleanPrimary,
        colors: cleanedColors,
      };
    });
}

// Clean initial state with NO pre-populated fake codes or ready-made images
export const INITIAL_SHOES: ShoeItem[] = [];

export function getStoredShoes(): ShoeItem[] {
  const deletedSet = new Set(getLocalDeletedShoeIds());
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      return [];
    }
    const parsed: ShoeItem[] = JSON.parse(data);
    const cleaned = stripReadyMadeImagesFromShoes(parsed).filter(
      (s) => s && s.id && !deletedSet.has(s.id)
    );
    return sortWithFavoritesFirst(cleaned);
  } catch (error) {
    console.warn('Failed to load shoes from localStorage', error);
    return [];
  }
}

export async function loadPersistedShoes(): Promise<ShoeItem[]> {
  const deletedSet = new Set(getLocalDeletedShoeIds());
  // Try IndexedDB first as it has full image data without quota limits
  const idbShoes = await getIdbItem<ShoeItem[]>(STORAGE_KEY);
  if (Array.isArray(idbShoes) && idbShoes.length > 0) {
    const cleaned = stripReadyMadeImagesFromShoes(idbShoes).filter(
      (s) => s && s.id && !deletedSet.has(s.id)
    );
    return sortWithFavoritesFirst(cleaned);
  }
  return getStoredShoes();
}

export function saveStoredShoes(shoes: ShoeItem[]): void {
  const deletedSet = new Set(getLocalDeletedShoeIds());
  const validShoes = (shoes || []).filter((s) => s && s.id && !deletedSet.has(s.id));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(validShoes));
  } catch (error) {
    console.warn('LocalStorage save quota exceeded; persisting to IndexedDB', error);
  }
  setIdbItem(STORAGE_KEY, validShoes);
}

export function sortWithFavoritesFirst(shoes: ShoeItem[]): ShoeItem[] {
  return [...shoes].sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    if (a.isFavorite && b.isFavorite) {
      return (b.favoritedAt || 0) - (a.favoritedAt || 0);
    }
    return b.createdAt - a.createdAt;
  });
}

export function getColorHex(name: string): string {
  const match = PRESET_COLORS.find(
    (c) => c.name.trim().toLowerCase() === name.trim().toLowerCase()
  );
  if (match) return match.hex;

  // Custom color fallbacks
  const lower = name.toLowerCase();
  if (lower.includes('أحمر') || lower.includes('احمر') || lower.includes('red')) return '#EF4444';
  if (lower.includes('أزرق') || lower.includes('ازرق') || lower.includes('blue')) return '#3B82F6';
  if (lower.includes('أخضر') || lower.includes('اخضر') || lower.includes('green')) return '#10B981';
  if (lower.includes('أصفر') || lower.includes('اصفر') || lower.includes('yellow')) return '#FBBF24';
  if (lower.includes('رصاصي') || lower.includes('رمادي') || lower.includes('gray')) return '#9CA3AF';
  if (lower.includes('ذهبي') || lower.includes('gold')) return '#EAB308';
  if (lower.includes('فضي') || lower.includes('silver')) return '#CBD5E1';
  if (lower.includes('بنفسجي') || lower.includes('موف') || lower.includes('purple')) return '#A855F7';

  return '#8B5CF6'; // Default purple tint
}

export function calculateTotalPairs(shoe: ShoeItem): number {
  return shoe.colors.reduce((sum, col) => {
    return sum + col.sizes.reduce((sSum, s) => sSum + (s.quantity || 0), 0);
  }, 0);
}

export function calculateColorPairs(sizes: { quantity: number }[]): number {
  return sizes.reduce((sum, s) => sum + (s.quantity || 0), 0);
}

export function formatPrice(price: number, currency: string = 'د.ع'): string {
  return `${new Intl.NumberFormat('ar-IQ').format(price)} ${currency}`;
}

export function getSizesSummary(sizes: { size: number | string; quantity: number }[]): string {
  const available = sizes.filter((s) => s.quantity > 0).map((s) => s.size);
  if (available.length === 0) return 'المخزون نافد';
  if (available.length === 1) return `مقاس ${available[0]}`;
  return `${available[0]} إلى ${available[available.length - 1]} (${available.length} مقاسات)`;
}

// Helper to convert File to Base64 with compression so uploaded images save fast and reliably
export function fileToBase64(
  file: File,
  maxDim: number = 900,
  quality: number = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => resolve(event.target?.result as string);
      img.src = event.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

// Helper to save/download an uploaded image to the user's device ("امكانيه حفض الصور المرفوعه")
export function downloadUploadedImage(
  imageSrc: string,
  filenamePrefix: string = 'iavenda_image'
): void {
  if (!imageSrc) return;
  const link = document.createElement('a');
  link.href = imageSrc;
  const cleanPrefix = filenamePrefix.replace(/[^a-zA-Z0-9_-]/g, '_');
  link.download = `${cleanPrefix}_${Date.now()}.jpg`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
