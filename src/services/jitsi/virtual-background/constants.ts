import bg1 from '@/assets/images/virtual-background/background-1.jpg';
import bg2 from '@/assets/images/virtual-background/background-2.jpg';
import bg3 from '@/assets/images/virtual-background/background-3.jpg';
import bg4 from '@/assets/images/virtual-background/background-4.jpg';
import bg5 from '@/assets/images/virtual-background/background-5.jpg';
import bg6 from '@/assets/images/virtual-background/background-6.jpg';
import bg7 from '@/assets/images/virtual-background/background-7.jpg';

export const sampleBackgrounds = [
  {
    uuid: '1',
    background: bg1,
  },
  {
    uuid: '2',
    background: bg2,
  },
  {
    uuid: '3',
    background: bg3,
  },
  {
    uuid: '4',
    background: bg4,
  },
  {
    uuid: '5',
    background: bg5,
  },
  {
    uuid: '6',
    background: bg6,
  },
  {
    uuid: '7',
    background: bg7,
  },
];

export const getVirtualBackgroundList = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ status: 200, data: sampleBackgrounds });
    }, 500);
  });
};

export const uploadVirtualBackground = async (payload: any) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      sampleBackgrounds.push({
        uuid: `bg${sampleBackgrounds.length + 1}`,
        background: payload.background,
      });
      resolve({ status: 200 });
    }, 500);
  });
};

export const deleteVirtualBackground = async ({ id }: { id: any }) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const index = sampleBackgrounds.findIndex((bg) => bg.uuid === id);
      if (index !== -1) {
        sampleBackgrounds.splice(index, 1);
      }
      resolve({ status: 200 });
    }, 500);
  });
};

export function timeout(milliseconds: number, promise: Promise<any>): Promise<any> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error('408'));

      return;
    }, milliseconds);

    promise.then(resolve, reject);
  });
}

/**
 * An enumeration of the different virtual background types.
 *
 * @enum {string}
 */
export const VIRTUAL_BACKGROUND_TYPE = {
  IMAGE: 'image',
  BLUR: 'blur',
  NONE: 'none',
};

export type Image = {
  id: string;
  src: string;
  tooltip?: string;
};

// The limit of virtual background uploads is 24. When the number
// of uploads is 25 we trigger the deleteStoredImage function to delete
// the first/oldest uploaded background.
export const BACKGROUNDS_LIMIT = 25;

export const IMAGES: Array<Image> = [
  {
    tooltip: 'image1',
    id: '1',
    src: 'images/virtual-background/background-1.jpg',
  },
  {
    tooltip: 'image2',
    id: '2',
    src: 'images/virtual-background/background-2.jpg',
  },
  {
    tooltip: 'image3',
    id: '3',
    src: 'images/virtual-background/background-3.jpg',
  },
  {
    tooltip: 'image4',
    id: '4',
    src: 'images/virtual-background/background-4.jpg',
  },
  {
    tooltip: 'image5',
    id: '5',
    src: 'images/virtual-background/background-5.jpg',
  },
  {
    tooltip: 'image6',
    id: '6',
    src: 'images/virtual-background/background-6.jpg',
  },
  {
    tooltip: 'image7',
    id: '7',
    src: 'images/virtual-background/background-7.jpg',
  },
];
