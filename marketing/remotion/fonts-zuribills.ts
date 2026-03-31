import { loadFont } from "@remotion/google-fonts/PlusJakartaSans";

const { fontFamily } = loadFont("normal", {
  weights: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
});

export const jakartaFamily = fontFamily;
