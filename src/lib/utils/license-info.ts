import { LicenseType } from '@/types/database';

export interface LicenseInfo {
  value: LicenseType;
  label: string;
  shortLabel: string;
  description: string;
  url: string;
  icon?: string;
}

export const LICENSE_INFO: Record<LicenseType, LicenseInfo> = {
  'all-rights-reserved': {
    value: 'all-rights-reserved',
    label: 'All Rights Reserved',
    shortLabel: '© All Rights Reserved',
    description: 'Traditional copyright - no permissions granted without explicit permission',
    url: '',
    icon: '©',
  },
  'cc-by': {
    value: 'cc-by',
    label: 'Creative Commons Attribution (CC BY)',
    shortLabel: 'CC BY',
    description: 'Others can copy, distribute, display, and perform the work, and make derivative works based on it, but must give credit',
    url: 'https://creativecommons.org/licenses/by/4.0/',
    icon: '🅭',
  },
  'cc-by-sa': {
    value: 'cc-by-sa',
    label: 'Creative Commons Attribution-ShareAlike (CC BY-SA)',
    shortLabel: 'CC BY-SA',
    description: 'Like CC BY, but derivative works must be licensed under the same terms',
    url: 'https://creativecommons.org/licenses/by-sa/4.0/',
    icon: '🅭🅯',
  },
  'cc-by-nd': {
    value: 'cc-by-nd',
    label: 'Creative Commons Attribution-NoDerivs (CC BY-ND)',
    shortLabel: 'CC BY-ND',
    description: 'Others can copy, distribute, display, and perform the work, but cannot make derivative works',
    url: 'https://creativecommons.org/licenses/by-nd/4.0/',
    icon: '🅭🅮',
  },
  'cc-by-nc': {
    value: 'cc-by-nc',
    label: 'Creative Commons Attribution-NonCommercial (CC BY-NC)',
    shortLabel: 'CC BY-NC',
    description: 'Like CC BY, but only for non-commercial purposes',
    url: 'https://creativecommons.org/licenses/by-nc/4.0/',
    icon: '🅭🅯',
  },
  'cc-by-nc-sa': {
    value: 'cc-by-nc-sa',
    label: 'Creative Commons Attribution-NonCommercial-ShareAlike (CC BY-NC-SA)',
    shortLabel: 'CC BY-NC-SA',
    description: 'Like CC BY-SA, but only for non-commercial purposes',
    url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
    icon: '🅭🅯🅯',
  },
  'cc-by-nc-nd': {
    value: 'cc-by-nc-nd',
    label: 'Creative Commons Attribution-NonCommercial-NoDerivs (CC BY-NC-ND)',
    shortLabel: 'CC BY-NC-ND',
    description: 'Most restrictive CC license - only allows download and share with attribution, no changes or commercial use',
    url: 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
    icon: '🅭🅮🅯',
  },
  'cc0': {
    value: 'cc0',
    label: 'Creative Commons Zero (CC0)',
    shortLabel: 'CC0',
    description: 'Public domain dedication - no rights reserved',
    url: 'https://creativecommons.org/publicdomain/zero/1.0/',
    icon: 'Ⓒ',
  },
  'public-domain': {
    value: 'public-domain',
    label: 'Public Domain',
    shortLabel: 'Public Domain',
    description: 'Work is in the public domain - free to use without restrictions',
    url: '',
    icon: '⊗',
  },
};

export const LICENSE_OPTIONS: LicenseInfo[] = Object.values(LICENSE_INFO);

export function getLicenseInfo(licenseType?: LicenseType): LicenseInfo {
  if (!licenseType) {
    return LICENSE_INFO['all-rights-reserved'];
  }
  return LICENSE_INFO[licenseType] || LICENSE_INFO['all-rights-reserved'];
}

export function getLicenseLabel(licenseType?: LicenseType): string {
  return getLicenseInfo(licenseType).shortLabel;
}

export function getLicenseUrl(licenseType?: LicenseType): string {
  return getLicenseInfo(licenseType).url;
}
