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

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IMAGE_HEIGHT = SCREEN_WIDTH * 0.65;

export function PhotoGallery({
  pictures,
  visible,
  initialIndex = 0,
  onClose,
}: PhotoGalleryProps) {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);

  const onShow = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: Platform.OS !== "web",
    }).start();
    if (initialIndex > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: initialIndex,
          animated: false,
        });
      }, 50);
    }
  }, [initialIndex, fadeAnim]);

  const handleClose = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: Platform.OS !== "web",
    }).start(() => onClose());
  }, [fadeAnim, onClose]);

  const renderItem = useCallback(
    ({ item, index }: { item: AircraftPicture; index: number }) => (
      <View style={styles.slide}>
        <Image
          source={{ uri: item.url }}
          style={styles.fullImage}
          contentFit="contain"
          transition={150}
        />
        {item.caption ? (
          <Text style={styles.imageCaption} numberOfLines={2}>
            {item.caption}
          </Text>
        ) : null}
        <Text style={styles.imageCounter}>
          {index + 1} of {pictures.length}
        </Text>
      </View>
    ),
    [pictures.length]
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
          <Text style={styles.headerTitle}>
            {pictures.length} {pictures.length === 1 ? "Photo" : "Photos"}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <FlatList
          ref={flatListRef}
          data={pictures}
          renderItem={renderItem}
          keyExtractor={(_, i) => String(i)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: (insets.bottom || 34) + 16,
          }}
          initialScrollIndex={initialIndex > 0 ? initialIndex : undefined}
          getItemLayout={(_, index) => ({
            length: IMAGE_HEIGHT + 56,
            offset: (IMAGE_HEIGHT + 56) * index,
            index,
          })}
          style={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
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
  headerTitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 15,
    fontWeight: "500" as const,
  },
  headerSpacer: {
    width: 44,
  },
  list: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    alignItems: "center",
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
  },
  imageCaption: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    textAlign: "center" as const,
    lineHeight: 18,
    marginTop: 8,
    paddingHorizontal: 24,
  },
  imageCounter: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    fontWeight: "500" as const,
    marginTop: 4,
    fontVariant: ["tabular-nums" as const],
  },
  separator: {
    height: 20,
  },
});
