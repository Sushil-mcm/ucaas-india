/* Short codes that must never be usable as an internal extension.

   If someone can set extension 1414, an internal dial can shadow the number a
   person would use to reach emergency services or a national help line. The
   caller hears a colleague's phone ring instead. Established phone systems
   publish this list per country and refuse the extension outright, and that is
   what happens here.

   Only exact matches are refused. Overlap dialling — where extension 1120
   delays a 112 call while the system waits for a fourth digit — is a dial-plan
   question, not a validation one, and it needs the number-classification layer
   we do not have yet. It is out of scope here rather than forgotten.

   Codes are grouped by the country that issued them. We check against every
   country rather than only the company's own, because a person can dial from
   anywhere and the cost of a false refusal is that an admin picks a different
   extension. */

export interface ReservedExtensionGroup {
  /* ISO 3166-1 alpha-2, so this can be filtered by country later if we ever
     want to relax the check to the countries a company actually operates in. */
  country: string;
  label: string;
  codes: string[];
}

export const RESERVED_EXTENSION_GROUPS: ReservedExtensionGroup[] = [
  // North America
  { country: 'CA', label: 'Canada', codes: ['211', '311', '411', '511', '611', '711', '811', '911', '988'] },
  { country: 'US', label: 'United States', codes: ['211', '311', '411', '511', '611', '711', '811', '911', '988'] },

  // Latin America
  { country: 'AR', label: 'Argentina', codes: ['101', '107', '110', '112', '113', '147', '911'] },
  { country: 'BR', label: 'Brazil', codes: ['100', '102', '136', '181', '190', '191', '192', '193', '1746'] },
  { country: 'CL', label: 'Chile', codes: ['131', '132', '133', '134', '135', '147', '149', '911'] },
  { country: 'CO', label: 'Colombia', codes: ['112', '119', '123', '125', '132', '141', '144', '155', '165', '195'] },
  { country: 'CR', label: 'Costa Rica', codes: ['117', '118', '127', '128', '911'] },
  { country: 'DO', label: 'Dominican Republic', codes: ['911'] },
  { country: 'EC', label: 'Ecuador', codes: ['101', '102', '131', '911'] },
  { country: 'MX', label: 'Mexico', codes: ['030', '040', '066', '070', '071', '078', '089', '911'] },
  { country: 'PA', label: 'Panama', codes: ['102', '103', '104', '311', '911'] },
  { country: 'PR', label: 'Puerto Rico', codes: ['311', '911', '988'] },
  { country: 'SV', label: 'El Salvador', codes: ['911'] },

  // Europe
  { country: 'AT', label: 'Austria', codes: ['112', '120', '122', '123', '128', '133', '140', '141', '142', '144', '147', '1455'] },
  { country: 'BE', label: 'Belgium', codes: ['100', '101', '102', '106', '107', '112', '1711', '1722', '1733', '1813'] },
  { country: 'BG', label: 'Bulgaria', codes: ['112', '150', '160', '165', '166', '180'] },
  { country: 'HR', label: 'Croatia', codes: ['112', '192', '193', '194', '195', '1987'] },
  { country: 'CY', label: 'Cyprus', codes: ['112', '199'] },
  { country: 'CZ', label: 'Czechia', codes: ['112', '150', '155', '156', '158', '1180', '1230', '1240'] },
  { country: 'DK', label: 'Denmark', codes: ['112', '114', '1812', '1813', '1818'] },
  { country: 'EE', label: 'Estonia', codes: ['112', '1182', '1188', '1220', '1247'] },
  { country: 'FI', label: 'Finland', codes: ['112'] },
  { country: 'FR', label: 'France', codes: ['15', '17', '18', '112', '114', '115', '119', '191', '196', '3114', '3919'] },
  { country: 'DE', label: 'Germany', codes: ['110', '112', '19222'] },
  { country: 'GR', label: 'Greece', codes: ['100', '108', '112', '166', '191', '199', '1016', '1056'] },
  { country: 'HU', label: 'Hungary', codes: ['104', '105', '107', '112', '188'] },
  { country: 'IE', label: 'Ireland', codes: ['112', '999'] },
  { country: 'IT', label: 'Italy', codes: ['112', '113', '114', '115', '118', '1515', '1522', '1530'] },
  { country: 'LV', label: 'Latvia', codes: ['112', '110', '113', '114'] },
  { country: 'LT', label: 'Lithuania', codes: ['112', '113', '117', '118', '119'] },
  { country: 'LU', label: 'Luxembourg', codes: ['112', '113'] },
  { country: 'NL', label: 'Netherlands', codes: ['112', '113'] },
  { country: 'NO', label: 'Norway', codes: ['110', '112', '113', '175', '1412'] },
  { country: 'PL', label: 'Poland', codes: ['112', '981', '985', '986', '997', '998', '999'] },
  { country: 'PT', label: 'Portugal', codes: ['112', '117', '144', '1414'] },
  { country: 'RO', label: 'Romania', codes: ['112', '113'] },
  { country: 'RU', label: 'Russia', codes: ['101', '102', '103', '104', '107', '109', '112', '115'] },
  { country: 'SK', label: 'Slovakia', codes: ['112', '150', '155', '158', '159', '1180', '1181'] },
  { country: 'ES', label: 'Spain', codes: ['010', '011', '012', '016', '024', '061', '062', '080', '091', '092', '112'] },
  { country: 'SE', label: 'Sweden', codes: ['112', '1177'] },
  { country: 'CH', label: 'Switzerland', codes: ['112', '117', '118', '140', '143', '144', '145', '161', '162', '163', '1414', '1415', '1811'] },
  { country: 'GB', label: 'United Kingdom', codes: ['101', '105', '111', '112', '195', '999'] },

  // Africa
  { country: 'ZA', label: 'South Africa', codes: ['107', '112', '116', '1020'] },

  // Asia and Oceania
  { country: 'AU', label: 'Australia', codes: ['000', '106', '112'] },
  { country: 'HK', label: 'Hong Kong', codes: ['112', '992', '999', '1081', '1083', '1088', '1868'] },
  { country: 'IN', label: 'India', codes: ['100', '101', '102', '104', '107', '108', '112', '139', '181', '1033', '1070', '1091', '1098', '1363', '1906', '1930'] },
  { country: 'ID', label: 'Indonesia', codes: ['108', '110', '112', '113', '115', '118', '119', '129', '151'] },
  { country: 'IL', label: 'Israel', codes: ['100', '101', '102', '103', '104', '105', '106', '107', '108', '109', '110', '118', '144', '1201', '1202', '1203', '1221', '1230'] },
  { country: 'JP', label: 'Japan', codes: ['104', '110', '117', '118', '119', '171', '189'] },
  { country: 'MY', label: 'Malaysia', codes: ['101', '103', '112', '994', '999'] },
  { country: 'NZ', label: 'New Zealand', codes: ['010', '018', '105', '111', '1737'] },
  { country: 'PH', label: 'Philippines', codes: ['136', '143', '911', '1326', '1342', '1343', '1348', '1349', '1383', '1384', '1386', '1553', '1555', '7890', '8888'] },
  { country: 'SG', label: 'Singapore', codes: ['100', '995', '999', '1767', '1771', '1777', '1799'] },
  { country: 'KR', label: 'South Korea', codes: ['110', '112', '114', '119', '120', '121', '123', '131', '132', '182', '1330', '1339', '1345', '1366', '1388', '1771'] },
  { country: 'TR', label: 'Turkey', codes: ['110', '112', '121', '122', '144', '153', '154', '155', '156', '157', '158', '159', '177', '183', '184', '185', '186', '187', '188', '190', '199'] },
  { country: 'VN', label: 'Vietnam', codes: ['111', '112', '113', '114', '115', '116', '1080', '1088'] },
];

/* Built once. Maps a code to the countries that reserve it, so the refusal can
   say which service the person would have been shadowing. */
const RESERVED_BY_CODE: Map<string, string[]> = RESERVED_EXTENSION_GROUPS.reduce(
  (map, group) => {
    group.codes.forEach((code) => {
      const existing = map.get(code);
      if (existing) {
        if (!existing.includes(group.label)) existing.push(group.label);
      } else {
        map.set(code, [group.label]);
      }
    });
    return map;
  },
  new Map<string, string[]>(),
);

export const isReservedExtension = (value?: string | null): boolean => {
  if (!value) return false;
  return RESERVED_BY_CODE.has(String(value).trim());
};

/* The message names the countries rather than saying "reserved", so an admin
   can see why 1414 is refused and does not read it as an arbitrary rule. */
export const reservedExtensionMessage = (value?: string | null): string => {
  const countries = RESERVED_BY_CODE.get(String(value ?? '').trim()) ?? [];
  if (!countries.length) return 'That extension is reserved.';

  const named =
    countries.length > 2
      ? `${countries.slice(0, 2).join(', ')} and ${countries.length - 2} other countries`
      : countries.join(' and ');

  return `${value} is an emergency or public service number in ${named}. Choose a different extension.`;
};
