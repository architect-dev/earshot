import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { type PhotoItem, MAX_PHOTOS } from '@/components/posts/PhotoGrid';

interface UsePhotoPickerOptions {
  maxPhotos?: number;
  onPhotosChange?: (photos: PhotoItem[]) => void;
}

interface UsePhotoPickerReturn {
  photos: PhotoItem[];
  setPhotos: React.Dispatch<React.SetStateAction<PhotoItem[]>>;
  pickPhotos: () => Promise<void>;
  removePhoto: (index: number) => void;
  movePhoto: (fromIndex: number, direction: 'left' | 'right') => void;
  clearPhotos: () => void;
}

export function usePhotoPicker(options: UsePhotoPickerOptions = {}): UsePhotoPickerReturn {
  const { maxPhotos = MAX_PHOTOS } = options;
  const [photos, setPhotos] = useState<PhotoItem[]>([]);

  const pickPhotos = useCallback(async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }

    const remainingSlots = maxPhotos - photos.length;
    if (remainingSlots <= 0) {
      Alert.alert('Limit Reached', `Maximum ${maxPhotos} photos per post.`);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
      quality: 1,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newPhotos: PhotoItem[] = result.assets.map((asset) => ({
        uri: asset.uri,
        isNew: true,
      }));
      setPhotos((prev) => [...prev, ...newPhotos].slice(0, maxPhotos));
    }
  }, [photos.length, maxPhotos]);

  const removePhoto = useCallback((index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const movePhoto = useCallback((fromIndex: number, direction: 'left' | 'right') => {
    setPhotos((prev) => {
      const toIndex = direction === 'left' ? fromIndex - 1 : fromIndex + 1;
      if (toIndex < 0 || toIndex >= prev.length) return prev;

      const newPhotos = [...prev];
      [newPhotos[fromIndex], newPhotos[toIndex]] = [newPhotos[toIndex], newPhotos[fromIndex]];
      return newPhotos;
    });
  }, []);

  const clearPhotos = useCallback(() => {
    setPhotos([]);
  }, []);

  return {
    photos,
    setPhotos,
    pickPhotos,
    removePhoto,
    movePhoto,
    clearPhotos,
  };
}

