import { useWindowDimensions } from 'react-native';

/** Breakpoints shared by every screen so phone, tablet and desktop web all get a sensible layout. */
export default function useResponsive() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 700;
  const isDesktop = width >= 1024;
  return {
    width,
    isTablet,
    isDesktop,
    // feed grid columns
    columns: width >= 1280 ? 3 : isTablet ? 2 : 1,
    // max width for the main content column
    maxContent: 1240,
  };
}

/** Max widths for single-column pages (forms, details) so text lines don't run across a whole monitor. */
export const PAGE_WIDTH = { form: 640, detail: 860, auth: 440 };
