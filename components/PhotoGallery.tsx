import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Dimensions,
  Platform,
  useColorScheme,
  Animated,
  StatusBar,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AircraftPicture } from "@/shared/types";

interface PhotoGalleryProps {
  pictures: AircraftPicture[];
  visible: boolean;
  initialIndex?: number;
  onClose: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export function PhotoGallery({
  pictures,
  visible,
  initialIndex = 0,
  onClose,
}: PhotoGalleryProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);

  const onShow = useCallback(() => {
    setCurrentIndex(initialIndex);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: Platform.OS !== "web",
    }).start();
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({
        index: initialIndex,
        animated: false,
      });
    }, 50);
  }, [initialIndex, fadeAnim]);

  const handleClose = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: Platform.OS !== "web",
    }).start(() => onClose());
  }, [fadeAnim, onClose]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const renderItem = useCallback(
    ({ item }: { item: AircraftPicture }) => (
      <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
        <Image
          source={{ uri: item.url }}
          style={styles.fullImage}
          contentFit="contain"
          transition={150}
        />
      </View>
    ),
    []
  );

  const webTopInset = Platform.OS === "web" ? 20 : 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onShow={onShow}
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <View style={styles.backdrop} />

        <View
          style={[
            styles.header,
            { paddingTop: (insets.top || webTopInset) + 8 },
          ]}
        >
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.counter}>
            {currentIndex + 1} / {pictures.length}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <FlatList
          ref={flatListRef}
          data={pictures}
          renderItem={renderItem}
          keyExtractor={(_, i) => String(i)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewConfig}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          initialScrollIndex={initialIndex}
          style={styles.list}
        />

        <View
          style={[
            styles.footer,
            { paddingBottom: (insets.bottom || 34) + 8 },
          ]}
        >
          {pictures[currentIndex]?.caption ? (
            <Text style={styles.caption} numberOfLines={3}>
              {pictures[currentIndex].caption}
            </Text>
          ) : null}

          {pictures.length > 1 ? (
            <View style={styles.dots}>
              {pictures.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i === currentIndex ? styles.dotActive : styles.dotInactive,
                  ]}
                />
              ))}
            </View>
          ) : null}
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "transparent",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 10,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  counter: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 15,
    fontWeight: "500" as const,
    fontVariant: ["tabular-nums" as const],
  },
  headerSpacer: {
    width: 44,
  },
  list: {
    flex: 1,
  },
  slide: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.65,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    alignItems: "center",
    zIndex: 10,
  },
  caption: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    textAlign: "center" as const,
    lineHeight: 20,
    marginBottom: 12,
  },
  dots: {
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  dotActive: {
    backgroundColor: "#FFFFFF",
  },
  dotInactive: {
    backgroundColor: "rgba(255,255,255,0.35)",
  },
});
