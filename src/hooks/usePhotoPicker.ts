import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { type PhotoItem, createPhotoItem, MAX_PHOTOS } from '@/components/posts';

interface UsePhotoPickerOptions {
  maxPhotos?: number;
}

interface UsePhotoPickerReturn {
  photos: PhotoItem[];
  setPhotos: React.Dispatch<React.SetStateAction<PhotoItem[]>>;
  pickPhotos: () => Promise<void>;
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
      const newPhotos: PhotoItem[] = result.assets.map((asset) =>
        createPhotoItem(asset.uri, asset.width, asset.height, true)
      );
      setPhotos((prev) => [...prev, ...newPhotos].slice(0, maxPhotos));
    }
  }, [photos.length, maxPhotos]);

  const clearPhotos = useCallback(() => {
    setPhotos([]);
  }, []);

  return {
    photos,
    setPhotos,
    pickPhotos,
    clearPhotos,
  };
}
