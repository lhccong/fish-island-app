import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ImageMessageProps {
  urls: string[];
  onImagePress: (url: string) => void;
  isSelf?: boolean;
}

export default function ImageMessage({ urls, onImagePress, isSelf = false }: ImageMessageProps) {
  if (!urls || urls.length === 0) return null;

  const renderSingleImage = (url: string) => (
    <TouchableOpacity
      key={url}
      onPress={() => onImagePress(url)}
      style={styles.singleImageContainer}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: url }}
        style={styles.singleImage}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );

  const renderMultipleImages = () => {
    const maxImages = 9;
    const displayUrls = urls.slice(0, maxImages);
    
    if (displayUrls.length === 2) {
      return (
        <View style={styles.twoImagesContainer}>
          {displayUrls.map((url) => (
            <TouchableOpacity
              key={url}
              onPress={() => onImagePress(url)}
              style={styles.twoImageItem}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: url }}
                style={styles.twoImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    if (displayUrls.length >= 3 && displayUrls.length <= 4) {
      return (
        <View style={styles.fourImagesContainer}>
          {displayUrls.map((url) => (
            <TouchableOpacity
              key={url}
              onPress={() => onImagePress(url)}
              style={styles.fourImageItem}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: url }}
                style={styles.fourImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    if (displayUrls.length >= 5) {
      return (
        <View style={styles.nineImagesContainer}>
          {displayUrls.map((url, index) => (
            <TouchableOpacity
              key={url}
              onPress={() => onImagePress(url)}
              style={styles.nineImageItem}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: url }}
                style={styles.nineImage}
                resizeMode="cover"
              />
              {index === 8 && urls.length > 9 && (
                <View style={styles.moreImagesOverlay}>
                  <Text style={styles.moreImagesText}>
                    +{urls.length - 9}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      {urls.length === 1 ? renderSingleImage(urls[0]) : renderMultipleImages()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
    marginBottom: 4,
  },
  singleImageContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    width: 200,
    height: 200,
  },
  singleImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
  },
  twoImagesContainer: {
    flexDirection: 'row',
    gap: 4,
    maxWidth: 240,
  },
  twoImageItem: {
    flex: 1,
    height: 120,
    borderRadius: 6,
    overflow: 'hidden',
  },
  twoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  fourImagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    maxWidth: 240,
  },
  fourImageItem: {
    width: '48%',
    height: 80,
    borderRadius: 6,
    overflow: 'hidden',
  },
  fourImage: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  nineImagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    maxWidth: 240,
  },
  nineImageItem: {
    width: '32%',
    height: 70,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  nineImage: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
  },
  moreImagesOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  moreImagesText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
