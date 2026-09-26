import companyLogoUrl from '@/assets/branding/company-logo.png';

import { APP_NAME } from './constants';

/**
 * Who the office belongs to. The single place the company name and logo are
 * defined: the Vue shell (top bar, loading screen, sign-in) and the Phaser
 * office (reception signage) both read it, so changing company means
 * replacing `assets/branding/company-logo.png` and editing this object.
 * Framework-free on purpose — Phaser code imports it too.
 */
export interface CompanyBranding {
  companyName: string;
  /** The product name shown next to the company, e.g. "iSaned · Virtual Office". */
  productName: string;
  /** Phaser texture key the logo is loaded under (PreloadScene). */
  logoAssetKey: string;
  /** Bundled URL of the logo (Vite asset import — never an absolute file path). */
  logoSource: string;
  /** Brand color for small accents (signage trim, team lanyards). Not the app's UI accent. */
  accentColor: string;
  /** The logo is drawn for dark backgrounds (it has white shapes), so place it on dark surfaces. */
  logoNeedsDarkBackground: boolean;
}

export const COMPANY_BRANDING: Readonly<CompanyBranding> = Object.freeze({
  companyName: 'iSaned',
  productName: APP_NAME,
  logoAssetKey: 'company-logo',
  logoSource: companyLogoUrl,
  accentColor: '#ff6c37',
  logoNeedsDarkBackground: true,
});
