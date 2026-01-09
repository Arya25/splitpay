import { StyleSheet } from "react-native";

export const COLORS = {
  primary: "#33306bff",
  secondary: "#007AFF",
  white: "#FFFFFF",
  black: "#000000",
  gray: "#999999",
  lightGray: "#F5F5F5",
  danger: "#FF3B30",
};

export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
};

export const FONT_FAMILY = {
  regular: "System",
  medium: "System",
  bold: "System",
};

export const appStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
  },
  heading: {
    fontSize: FONT_SIZES.xl,
    fontFamily: FONT_FAMILY.bold,
    color: COLORS.black,
    marginVertical: 12,
  },
  label: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONT_FAMILY.medium,
    color: COLORS.black,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray,
    borderRadius: 8,
    padding: 12,
    fontSize: FONT_SIZES.md,
    marginBottom: 12,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 12,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontFamily: FONT_FAMILY.bold,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
});
