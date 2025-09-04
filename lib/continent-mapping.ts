// Continent mapping utility for geographic filtering
// Maps country names to their respective continents

<<<<<<< HEAD
export type Continent = 
  | "Africa" 
  | "Asia" 
  | "Europe" 
  | "North America" 
  | "South America" 
  | "Oceania" 
=======
export type Continent =
  | "Africa"
  | "Asia"
  | "Europe"
  | "North America"
  | "South America"
  | "Oceania"
>>>>>>> oauth-upload-fixes
  | "Antarctica";

// Comprehensive country to continent mapping
const COUNTRY_TO_CONTINENT_MAP: Record<string, Continent> = {
  // Africa
<<<<<<< HEAD
  "Algeria": "Africa",
  "Angola": "Africa",
  "Benin": "Africa",
  "Botswana": "Africa",
  "Burkina Faso": "Africa",
  "Burundi": "Africa",
  "Cameroon": "Africa",
  "Cape Verde": "Africa",
  "Central African Republic": "Africa",
  "Chad": "Africa",
  "Comoros": "Africa",
  "Democratic Republic of the Congo": "Africa",
  "Republic of the Congo": "Africa",
  "Congo": "Africa",
  "Djibouti": "Africa",
  "Egypt": "Africa",
  "Equatorial Guinea": "Africa",
  "Eritrea": "Africa",
  "Eswatini": "Africa",
  "Ethiopia": "Africa",
  "Gabon": "Africa",
  "Gambia": "Africa",
  "Ghana": "Africa",
  "Guinea": "Africa",
  "Guinea-Bissau": "Africa",
  "Ivory Coast": "Africa",
  "Kenya": "Africa",
  "Lesotho": "Africa",
  "Liberia": "Africa",
  "Libya": "Africa",
  "Madagascar": "Africa",
  "Malawi": "Africa",
  "Mali": "Africa",
  "Mauritania": "Africa",
  "Mauritius": "Africa",
  "Morocco": "Africa",
  "Mozambique": "Africa",
  "Namibia": "Africa",
  "Niger": "Africa",
  "Nigeria": "Africa",
  "Rwanda": "Africa",
  "São Tomé and Príncipe": "Africa",
  "Senegal": "Africa",
  "Seychelles": "Africa",
  "Sierra Leone": "Africa",
  "Somalia": "Africa",
  "South Africa": "Africa",
  "South Sudan": "Africa",
  "Sudan": "Africa",
  "Tanzania": "Africa",
  "Togo": "Africa",
  "Tunisia": "Africa",
  "Uganda": "Africa",
  "Zambia": "Africa",
  "Zimbabwe": "Africa",

  // Asia
  "Afghanistan": "Asia",
  "Armenia": "Asia",
  "Azerbaijan": "Asia",
  "Bahrain": "Asia",
  "Bangladesh": "Asia",
  "Bhutan": "Asia",
  "Brunei": "Asia",
  "Cambodia": "Asia",
  "China": "Asia",
  "Cyprus": "Asia",
  "Georgia": "Asia",
  "India": "Asia",
  "Indonesia": "Asia",
  "Iran": "Asia",
  "Iraq": "Asia",
  "Israel": "Asia",
  "Japan": "Asia",
  "Jordan": "Asia",
  "Kazakhstan": "Asia",
  "Kuwait": "Asia",
  "Kyrgyzstan": "Asia",
  "Laos": "Asia",
  "Lebanon": "Asia",
  "Malaysia": "Asia",
  "Maldives": "Asia",
  "Mongolia": "Asia",
  "Myanmar": "Asia",
  "Nepal": "Asia",
  "North Korea": "Asia",
  "Oman": "Asia",
  "Pakistan": "Asia",
  "Palestine": "Asia",
  "Philippines": "Asia",
  "Qatar": "Asia",
  "Saudi Arabia": "Asia",
  "Singapore": "Asia",
  "South Korea": "Asia",
  "Sri Lanka": "Asia",
  "Syria": "Asia",
  "Taiwan": "Asia",
  "Tajikistan": "Asia",
  "Thailand": "Asia",
  "Timor-Leste": "Asia",
  "Turkey": "Asia",
  "Turkmenistan": "Asia",
  "United Arab Emirates": "Asia",
  "Uzbekistan": "Asia",
  "Vietnam": "Asia",
  "Yemen": "Asia",

  // Europe
  "Albania": "Europe",
  "Andorra": "Europe",
  "Austria": "Europe",
  "Belarus": "Europe",
  "Belgium": "Europe",
  "Bosnia and Herzegovina": "Europe",
  "Bulgaria": "Europe",
  "Croatia": "Europe",
  "Czech Republic": "Europe",
  "Denmark": "Europe",
  "Estonia": "Europe",
  "Finland": "Europe",
  "France": "Europe",
  "Germany": "Europe",
  "Greece": "Europe",
  "Hungary": "Europe",
  "Iceland": "Europe",
  "Ireland": "Europe",
  "Italy": "Europe",
  "Latvia": "Europe",
  "Liechtenstein": "Europe",
  "Lithuania": "Europe",
  "Luxembourg": "Europe",
  "Malta": "Europe",
  "Moldova": "Europe",
  "Monaco": "Europe",
  "Montenegro": "Europe",
  "Netherlands": "Europe",
  "North Macedonia": "Europe",
  "Norway": "Europe",
  "Poland": "Europe",
  "Portugal": "Europe",
  "Romania": "Europe",
  "Russia": "Europe", // Primarily European part
  "San Marino": "Europe",
  "Serbia": "Europe",
  "Slovakia": "Europe",
  "Slovenia": "Europe",
  "Spain": "Europe",
  "Sweden": "Europe",
  "Switzerland": "Europe",
  "Ukraine": "Europe",
=======
  Algeria: "Africa",
  Angola: "Africa",
  Benin: "Africa",
  Botswana: "Africa",
  "Burkina Faso": "Africa",
  Burundi: "Africa",
  Cameroon: "Africa",
  "Cape Verde": "Africa",
  "Central African Republic": "Africa",
  Chad: "Africa",
  Comoros: "Africa",
  "Democratic Republic of the Congo": "Africa",
  "Republic of the Congo": "Africa",
  Congo: "Africa",
  Djibouti: "Africa",
  Egypt: "Africa",
  "Equatorial Guinea": "Africa",
  Eritrea: "Africa",
  Eswatini: "Africa",
  Ethiopia: "Africa",
  Gabon: "Africa",
  Gambia: "Africa",
  Ghana: "Africa",
  Guinea: "Africa",
  "Guinea-Bissau": "Africa",
  "Ivory Coast": "Africa",
  Kenya: "Africa",
  Lesotho: "Africa",
  Liberia: "Africa",
  Libya: "Africa",
  Madagascar: "Africa",
  Malawi: "Africa",
  Mali: "Africa",
  Mauritania: "Africa",
  Mauritius: "Africa",
  Morocco: "Africa",
  Mozambique: "Africa",
  Namibia: "Africa",
  Niger: "Africa",
  Nigeria: "Africa",
  Rwanda: "Africa",
  "São Tomé and Príncipe": "Africa",
  Senegal: "Africa",
  Seychelles: "Africa",
  "Sierra Leone": "Africa",
  Somalia: "Africa",
  "South Africa": "Africa",
  "South Sudan": "Africa",
  Sudan: "Africa",
  Tanzania: "Africa",
  Togo: "Africa",
  Tunisia: "Africa",
  Uganda: "Africa",
  Zambia: "Africa",
  Zimbabwe: "Africa",

  // Asia
  Afghanistan: "Asia",
  Armenia: "Asia",
  Azerbaijan: "Asia",
  Bahrain: "Asia",
  Bangladesh: "Asia",
  Bhutan: "Asia",
  Brunei: "Asia",
  Cambodia: "Asia",
  China: "Asia",
  Cyprus: "Asia",
  Georgia: "Asia",
  India: "Asia",
  Indonesia: "Asia",
  Iran: "Asia",
  Iraq: "Asia",
  Israel: "Asia",
  Japan: "Asia",
  Jordan: "Asia",
  Kazakhstan: "Asia",
  Kuwait: "Asia",
  Kyrgyzstan: "Asia",
  Laos: "Asia",
  Lebanon: "Asia",
  Malaysia: "Asia",
  Maldives: "Asia",
  Mongolia: "Asia",
  Myanmar: "Asia",
  Nepal: "Asia",
  "North Korea": "Asia",
  Oman: "Asia",
  Pakistan: "Asia",
  Palestine: "Asia",
  Philippines: "Asia",
  Qatar: "Asia",
  "Saudi Arabia": "Asia",
  Singapore: "Asia",
  "South Korea": "Asia",
  "Sri Lanka": "Asia",
  Syria: "Asia",
  Taiwan: "Asia",
  Tajikistan: "Asia",
  Thailand: "Asia",
  "Timor-Leste": "Asia",
  Turkey: "Asia",
  Turkmenistan: "Asia",
  "United Arab Emirates": "Asia",
  Uzbekistan: "Asia",
  Vietnam: "Asia",
  Yemen: "Asia",

  // Europe
  Albania: "Europe",
  Andorra: "Europe",
  Austria: "Europe",
  Belarus: "Europe",
  Belgium: "Europe",
  "Bosnia and Herzegovina": "Europe",
  Bulgaria: "Europe",
  Croatia: "Europe",
  "Czech Republic": "Europe",
  Denmark: "Europe",
  Estonia: "Europe",
  Finland: "Europe",
  France: "Europe",
  Germany: "Europe",
  Greece: "Europe",
  Hungary: "Europe",
  Iceland: "Europe",
  Ireland: "Europe",
  Italy: "Europe",
  Latvia: "Europe",
  Liechtenstein: "Europe",
  Lithuania: "Europe",
  Luxembourg: "Europe",
  Malta: "Europe",
  Moldova: "Europe",
  Monaco: "Europe",
  Montenegro: "Europe",
  Netherlands: "Europe",
  "North Macedonia": "Europe",
  Norway: "Europe",
  Poland: "Europe",
  Portugal: "Europe",
  Romania: "Europe",
  Russia: "Europe", // Primarily European part
  "San Marino": "Europe",
  Serbia: "Europe",
  Slovakia: "Europe",
  Slovenia: "Europe",
  Spain: "Europe",
  Sweden: "Europe",
  Switzerland: "Europe",
  Ukraine: "Europe",
>>>>>>> oauth-upload-fixes
  "United Kingdom": "Europe",
  "Vatican City": "Europe",

  // North America
  "Antigua and Barbuda": "North America",
<<<<<<< HEAD
  "Bahamas": "North America",
  "Barbados": "North America",
  "Belize": "North America",
  "Canada": "North America",
  "Costa Rica": "North America",
  "Cuba": "North America",
  "Dominica": "North America",
  "Dominican Republic": "North America",
  "El Salvador": "North America",
  "Grenada": "North America",
  "Guatemala": "North America",
  "Haiti": "North America",
  "Honduras": "North America",
  "Jamaica": "North America",
  "Mexico": "North America",
  "Nicaragua": "North America",
  "Panama": "North America",
=======
  Bahamas: "North America",
  Barbados: "North America",
  Belize: "North America",
  Canada: "North America",
  "Costa Rica": "North America",
  Cuba: "North America",
  Dominica: "North America",
  "Dominican Republic": "North America",
  "El Salvador": "North America",
  Grenada: "North America",
  Guatemala: "North America",
  Haiti: "North America",
  Honduras: "North America",
  Jamaica: "North America",
  Mexico: "North America",
  Nicaragua: "North America",
  Panama: "North America",
>>>>>>> oauth-upload-fixes
  "Saint Kitts and Nevis": "North America",
  "Saint Lucia": "North America",
  "Saint Vincent and the Grenadines": "North America",
  "Trinidad and Tobago": "North America",
  "United States": "North America",
<<<<<<< HEAD
  "USA": "North America",

  // South America
  "Argentina": "South America",
  "Bolivia": "South America",
  "Brazil": "South America",
  "Chile": "South America",
  "Colombia": "South America",
  "Ecuador": "South America",
  "Guyana": "South America",
  "Paraguay": "South America",
  "Peru": "South America",
  "Suriname": "South America",
  "Uruguay": "South America",
  "Venezuela": "South America",

  // Oceania
  "Australia": "Oceania",
  "Fiji": "Oceania",
  "Kiribati": "Oceania",
  "Marshall Islands": "Oceania",
  "Micronesia": "Oceania",
  "Nauru": "Oceania",
  "New Zealand": "Oceania",
  "Palau": "Oceania",
  "Papua New Guinea": "Oceania",
  "Samoa": "Oceania",
  "Solomon Islands": "Oceania",
  "Tonga": "Oceania",
  "Tuvalu": "Oceania",
  "Vanuatu": "Oceania",

  // Antarctica
  "Antarctica": "Antarctica",
=======
  USA: "North America",

  // South America
  Argentina: "South America",
  Bolivia: "South America",
  Brazil: "South America",
  Chile: "South America",
  Colombia: "South America",
  Ecuador: "South America",
  Guyana: "South America",
  Paraguay: "South America",
  Peru: "South America",
  Suriname: "South America",
  Uruguay: "South America",
  Venezuela: "South America",

  // Oceania
  Australia: "Oceania",
  Fiji: "Oceania",
  Kiribati: "Oceania",
  "Marshall Islands": "Oceania",
  Micronesia: "Oceania",
  Nauru: "Oceania",
  "New Zealand": "Oceania",
  Palau: "Oceania",
  "Papua New Guinea": "Oceania",
  Samoa: "Oceania",
  "Solomon Islands": "Oceania",
  Tonga: "Oceania",
  Tuvalu: "Oceania",
  Vanuatu: "Oceania",

  // Antarctica
  Antarctica: "Antarctica",
>>>>>>> oauth-upload-fixes
};

/**
 * Get continent for a country name
 * Handles case-insensitive matching and common country name variations
 */
export function getCountryContinent(countryName: string): Continent | null {
<<<<<<< HEAD
  if (!countryName || typeof countryName !== 'string') {
=======
  if (!countryName || typeof countryName !== "string") {
>>>>>>> oauth-upload-fixes
    return null;
  }

  // Direct match (case-insensitive)
  const normalizedName = countryName.trim();
  const continent = COUNTRY_TO_CONTINENT_MAP[normalizedName];
  if (continent) {
    return continent;
  }

  // Fuzzy matching for common variations
  const lowercaseName = normalizedName.toLowerCase();
<<<<<<< HEAD
  
  // Handle common country name variations
  const variations: Record<string, string> = {
    'usa': 'United States',
    'uk': 'United Kingdom',
    'britain': 'United Kingdom',
    'great britain': 'United Kingdom',
    'england': 'United Kingdom',
    'scotland': 'United Kingdom',
    'wales': 'United Kingdom',
    'northern ireland': 'United Kingdom',
    'america': 'United States',
    'united states of america': 'United States',
    'south korea': 'South Korea',
    'north korea': 'North Korea',
    'czech republic': 'Czech Republic',
    'democratic republic of congo': 'Democratic Republic of the Congo',
    'drc': 'Democratic Republic of the Congo',
    'uae': 'United Arab Emirates',
    'emirates': 'United Arab Emirates',
=======

  // Handle common country name variations
  const variations: Record<string, string> = {
    usa: "United States",
    uk: "United Kingdom",
    britain: "United Kingdom",
    "great britain": "United Kingdom",
    england: "United Kingdom",
    scotland: "United Kingdom",
    wales: "United Kingdom",
    "northern ireland": "United Kingdom",
    america: "United States",
    "united states of america": "United States",
    "south korea": "South Korea",
    "north korea": "North Korea",
    "czech republic": "Czech Republic",
    "democratic republic of congo": "Democratic Republic of the Congo",
    drc: "Democratic Republic of the Congo",
    uae: "United Arab Emirates",
    emirates: "United Arab Emirates",
>>>>>>> oauth-upload-fixes
  };

  const variation = variations[lowercaseName];
  if (variation) {
    return COUNTRY_TO_CONTINENT_MAP[variation] || null;
  }

  // Try case-insensitive lookup
  const exactMatch = Object.keys(COUNTRY_TO_CONTINENT_MAP).find(
<<<<<<< HEAD
    key => key.toLowerCase() === lowercaseName
  );
  
=======
    (key) => key.toLowerCase() === lowercaseName
  );

>>>>>>> oauth-upload-fixes
  if (exactMatch) {
    return COUNTRY_TO_CONTINENT_MAP[exactMatch];
  }

  return null;
}

/**
 * Get all unique continents from a list of albums
 */
<<<<<<< HEAD
export function getContinentsFromAlbums(albums: Array<{ country: string }>): Continent[] {
  const continents = new Set<Continent>();
  
  albums.forEach(album => {
=======
export function getContinentsFromAlbums(
  albums: Array<{ country: string }>
): Continent[] {
  const continents = new Set<Continent>();

  albums.forEach((album) => {
>>>>>>> oauth-upload-fixes
    const continent = getCountryContinent(album.country);
    if (continent) {
      continents.add(continent);
    }
  });

  return Array.from(continents).sort();
}

/**
 * Get continent display name with emoji
 */
export function getContinentDisplayName(continent: Continent): string {
  const displayNames: Record<Continent, string> = {
<<<<<<< HEAD
    "Africa": "🌍 Africa",
    "Asia": "🌏 Asia",
    "Europe": "🌍 Europe", 
    "North America": "🌎 North America",
    "South America": "🌎 South America",
    "Oceania": "🌏 Oceania",
    "Antarctica": "🐧 Antarctica",
  };
  
  return displayNames[continent] || continent;
}
=======
    Africa: "🌍 Africa",
    Asia: "🌏 Asia",
    Europe: "🌍 Europe",
    "North America": "🌎 North America",
    "South America": "🌎 South America",
    Oceania: "🌏 Oceania",
    Antarctica: "🐧 Antarctica",
  };

  return displayNames[continent] || continent;
}
>>>>>>> oauth-upload-fixes
