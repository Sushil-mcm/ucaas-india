/* Check the built-in public holidays against the real calendars.
 *
 *   node scripts/verify-holiday-presets.mjs
 *
 * The Holidays screen offers "add a country's public holidays for a year" and
 * works every date out from a rule rather than a table, so nothing goes stale.
 * That is only worth having if the rules are right: a Thanksgiving on the wrong
 * Thursday closes somebody's phone line on a working day, and the first anyone
 * hears of it is a customer who could not get through.
 *
 * Every expected date below was taken from the issuing authority - the US OPM
 * federal holiday list, the UK government's bank holiday list, gov.in, and the
 * Canadian federal list. Where a holiday moves because it fell on a weekend the
 * observed date is the one checked, because that is the day the office is shut.
 *
 * There is no test runner in this project and adding one is not this script's
 * job. It transpiles the rules module with the esbuild that Vite already
 * depends on, imports it, and asserts. No React, no DOM, no network.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SOURCE = 'src/lib/holiday-presets.ts';

const work = mkdtempSync(join(tmpdir(), 'holiday-presets-'));
const out = join(work, 'holiday-presets.mjs');

execFileSync(
  'npx',
  ['esbuild', SOURCE, '--format=esm', '--platform=node', '--loader:.ts=ts', `--outfile=${out}`],
  { stdio: ['ignore', 'ignore', 'inherit'] },
);

const { buildPreset, COUNTRY_PRESETS } = await import(`file://${out}`);
rmSync(work, { recursive: true, force: true });

const presetFor = (code) => {
  const preset = COUNTRY_PRESETS.find((entry) => entry.code === code);
  if (!preset) throw new Error(`no preset for ${code}`);
  return preset;
};

/* name -> ISO date, as published. */
const EXPECTED = {
  US: {
    2026: {
      "New Year's Day": '2026-01-01',
      'Martin Luther King Jr. Day': '2026-01-19',
      "Washington's Birthday (Presidents' Day)": '2026-02-16',
      'Memorial Day': '2026-05-25',
      'Juneteenth National Independence Day': '2026-06-19',
      /* 4 July 2026 is a Saturday, so the federal holiday is observed on the
         Friday - 5 U.S.C. 6103(b). */
      'Independence Day': '2026-07-03',
      'Labor Day': '2026-09-07',
      'Columbus Day': '2026-10-12',
      'Veterans Day': '2026-11-11',
      'Thanksgiving Day': '2026-11-26',
      'Christmas Day': '2026-12-25',
    },
    2027: {
      "New Year's Day": '2027-01-01',
      'Martin Luther King Jr. Day': '2027-01-18',
      'Memorial Day': '2027-05-31',
      'Independence Day': '2027-07-05', // the 4th is a Sunday
      'Labor Day': '2027-09-06',
      'Thanksgiving Day': '2027-11-25',
      'Christmas Day': '2027-12-24', // the 25th is a Saturday
    },
  },
  GB: {
    2026: {
      "New Year's Day": '2026-01-01',
      'Good Friday': '2026-04-03',
      'Easter Monday': '2026-04-06',
      'Early May bank holiday': '2026-05-04',
      'Spring bank holiday': '2026-05-25',
      'Summer bank holiday': '2026-08-31',
      'Christmas Day': '2026-12-25',
      /* Boxing Day 2026 is a Saturday, so the bank holiday moves to Monday
         28 December - the Friday is already Christmas Day. */
      'Boxing Day': '2026-12-28',
    },
    2027: {
      'Good Friday': '2027-03-26',
      'Easter Monday': '2027-03-29',
      /* 25 and 26 December 2027 fall on Saturday and Sunday, so the two bank
         holidays are the following Monday and Tuesday. */
      'Christmas Day': '2027-12-27',
      'Boxing Day': '2027-12-28',
    },
  },
  IN: {
    2026: {
      'Republic Day': '2026-01-26',
      'Good Friday': '2026-04-03',
      'Independence Day': '2026-08-15',
      'Gandhi Jayanti': '2026-10-02',
      'Christmas Day': '2026-12-25',
      /* Umm al-Qura calculated dates. India fixes these by local moon sighting
         and can land a day later, which is why every one of them carries that
         warning on screen. What is checked here is that the conversion itself is
         right, not that a mosque in Delhi will agree. */
      'Id-ul-Fitr': '2026-03-20',
      'Id-ul-Zuha (Bakrid)': '2026-05-27',
      'Muharram': '2026-06-25',
      'Milad-un-Nabi': '2026-08-25',
    },
    2027: {
      'Republic Day': '2027-01-26',
      'Good Friday': '2027-03-26',
      'Id-ul-Fitr': '2027-03-09',
      'Id-ul-Zuha (Bakrid)': '2027-05-16',
      'Independence Day': '2027-08-15',
    },
  },
  CA: {
    2026: {
      "New Year's Day": '2026-01-01',
      'Good Friday': '2026-04-03',
      'Victoria Day': '2026-05-18', // the Monday before 25 May
      'Canada Day': '2026-07-01',
      'Labour Day': '2026-09-07',
      'Thanksgiving Day': '2026-10-12',
    },
  },
};

let checked = 0;
let failed = 0;

for (const [code, years] of Object.entries(EXPECTED)) {
  const preset = presetFor(code);
  for (const [year, holidays] of Object.entries(years)) {
    const produced = new Map(
      buildPreset(preset, Number(year)).map((entry) => [entry.title, entry.iso]),
    );
    for (const [name, expected] of Object.entries(holidays)) {
      checked += 1;
      const actual = produced.get(name);
      if (actual !== expected) {
        failed += 1;
        console.error(`  FAIL ${code} ${year}  ${name}\n       expected ${expected}, got ${actual}`);
      }
    }
  }
}

/* Two properties that hold whatever the year, and are the ones most likely to
   rot when somebody adds a country. */
for (const preset of COUNTRY_PRESETS) {
  for (const year of [2026, 2027, 2028, 2029, 2030]) {
    const built = buildPreset(preset, year);

    checked += 1;
    const dates = built.map((entry) => entry.iso);
    if (new Set(dates).size !== dates.length) {
      failed += 1;
      console.error(`  FAIL ${preset.code} ${year}  two holidays landed on the same day`);
    }

    checked += 1;
    /* A date is only safe to repeat when it is a plain fixed date that was not
       moved off a weekend. Anything marked as repeating must therefore fall on
       the same day and month every year. */
    for (const entry of built.filter((item) => item.repeats_yearly)) {
      const next = buildPreset(preset, year + 1).find((item) => item.title === entry.title);
      if (!next || next.iso.slice(5) !== entry.iso.slice(5)) {
        failed += 1;
        console.error(
          `  FAIL ${preset.code} ${year}  "${entry.title}" says it repeats yearly but moves`,
        );
        break;
      }
    }
  }
}

console.log(`\n${checked - failed}/${checked} checks passed`);
if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}
