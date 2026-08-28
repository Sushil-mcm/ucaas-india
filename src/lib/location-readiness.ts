/* What a location still needs before it is safe to put people in it.
 *
 * On Dialpad and Genesys a location is not just a label — it decides which
 * address emergency services are sent to, what number people show when they dial
 * out, and which clock the business hours run on. Both platforms refuse to let a
 * location be used until the critical parts are filled in.
 *
 * This platform has no such gate: a location can be created with a name and
 * nothing else, and nothing anywhere says so. The checks below are the honest
 * subset — every one is verifiable against a field the `sites` record actually
 * holds. Emergency address is deliberately not among them: there is no column for
 * it, so claiming to check it would be theatre. It is named on the page instead,
 * as a gap in the platform rather than a gap in the admin's data.
 */

export type ReadinessSeverity = 'required' | 'recommended';

export interface ReadinessIssue {
  field: string;
  severity: ReadinessSeverity;
  /* What is wrong, in the admin's language. */
  label: string;
  /* Why it matters — an admin who knows the consequence will fix it. */
  consequence: string;
}

export interface LocationReadiness {
  issues: ReadinessIssue[];
  requiredMissing: number;
  isComplete: boolean;
}

const isBlank = (value: unknown): boolean =>
  value === null || value === undefined || String(value).trim() === '';

export const evaluateLocation = (site: any): LocationReadiness => {
  const issues: ReadinessIssue[] = [];

  if (isBlank(site?.address)) {
    issues.push({
      field: 'address',
      severity: 'required',
      label: 'No street address',
      consequence:
        'Without a street address this location cannot be used for emergency dialling or for number regulations that require a local presence.',
    });
  }

  if (isBlank(site?.city) || isBlank(site?.country)) {
    issues.push({
      field: 'city',
      severity: 'required',
      label: 'Incomplete address',
      consequence:
        'City and country are needed before this address can be verified or used to buy local numbers.',
    });
  }

  /* Business hours, holidays and the closed-hours action are all evaluated in the
     location's timezone. Without one they fall back to the account default, so a
     branch in another country answers on the wrong clock. */
  if (isBlank(site?.timezone)) {
    issues.push({
      field: 'timezone',
      severity: 'required',
      label: 'No timezone',
      consequence:
        'Business hours for people here would run on the account default, so calls could be treated as out-of-hours at the wrong times.',
    });
  }

  if (isBlank(site?.postal_code)) {
    issues.push({
      field: 'postal_code',
      severity: 'recommended',
      label: 'No postal code',
      consequence: 'Several countries will not approve a number purchase without one.',
    });
  }

  /* Recorded but not yet acted on: nothing in the call path reads a location's
     caller ID, so an empty name breaks nothing today. It is still worth
     completing, because the setting reads as configured when it is half-filled —
     hence recommended rather than required. */
  if (site?.caller_id_type === 'CUSTOM' && isBlank(site?.caller_id_name)) {
    issues.push({
      field: 'caller_id_name',
      severity: 'recommended',
      label: 'Caller ID set to a custom name, but no name entered',
      consequence:
        'Nothing breaks — location caller ID is not applied to calls yet. Either enter a name or set this location to the company main number.',
    });
  }

  const requiredMissing = issues.filter((issue) => issue.severity === 'required').length;

  return { issues, requiredMissing, isComplete: issues.length === 0 };
};

/* Gaps in the product rather than in the admin's data. Shown once on the page so
   an admin comparing this against Dialpad or Genesys is not left wondering
   whether they have missed a setting somewhere. */
export const PLATFORM_LOCATION_GAPS = [
  {
    label: 'Emergency address (E911)',
    detail:
      'The address emergency services are sent to when someone here dials them. Required on Dialpad and Genesys before a location can be used.',
  },
  {
    label: 'Main line number',
    detail: 'A single number that represents this location and can be used as its caller ID.',
  },
  {
    label: 'Opening hours and holidays',
    detail:
      'Hours are currently set per person. Setting them per location is what other platforms do, so a whole branch closes together.',
  },
] as const;
