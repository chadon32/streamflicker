import { Browser } from '@capacitor/browser';
import { Capacitor, registerPlugin } from '@capacitor/core';

interface NativeMovieNightPlugin {
  present(): Promise<void>;
}

const NativeMovieNight = registerPlugin<NativeMovieNightPlugin>('NativeMovieNight');

function isSafeExternalUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Open an external title or availability page in the platform's browser.
 * Capacitor's Browser plugin is reliable in WKWebView and gives iPad users a
 * proper Safari sheet instead of relying on an unsupported target=_blank.
 */
export async function openExternalUrl(url: string): Promise<void> {
  if (!isSafeExternalUrl(url)) throw new Error('Invalid external URL');

  if (Capacitor.isNativePlatform()) {
    await Browser.open({
      url,
      presentationStyle: 'fullscreen',
      toolbarColor: '#09090b',
    });
    return;
  }

  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (!opened) window.location.assign(url);
}

/**
 * Present the app-owned native Movie Night workflow on iOS/iPadOS.
 * Returns false on the web (or if a native build does not expose the plugin),
 * allowing the caller to fall back to the web planner without breaking.
 */
export async function openNativeMovieNight(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  try {
    await NativeMovieNight.present();
    return true;
  } catch {
    return false;
  }
}
