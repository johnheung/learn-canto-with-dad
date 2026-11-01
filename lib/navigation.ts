import { router } from 'expo-router';

type TabPath = '/' | '/practice' | '/rewards' | '/profile' | '/settings';

/**
 * Returns to a tab, closing the screens above the tabs instead of stacking a new
 * copy of them (which would make Android's back button step through old copies).
 */
export function goToTab(path: TabPath = '/'): void {
  if (router.canDismiss()) router.dismissTo(path);
  else router.replace(path);
}
