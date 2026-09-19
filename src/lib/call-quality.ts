/* Call quality, read off the figures the switch measured on the call. */
export type QualityBand = 'good' | 'fair' | 'poor';

export interface QualityFigures {
  mos: number | null;
  jitterMs: number | null;
  packetLossPct: number | null;
  qualityPct: number | null;
}

export interface QualityReading extends QualityFigures {
  band: QualityBand;
  summary: string;
  explanations: string[];
  likelyCause: string;
}

export const GOOD_MOS = 4.0;
export const FAIR_MOS = 3.6;

const LOSS_NOTICEABLE_PCT = 1;
const LOSS_BAD_PCT = 3;
const JITTER_NOTICEABLE = 30;
const JITTER_BAD = 100;

const num = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(String(value).trim());
  return Number.isFinite(parsed) ? parsed : null;
};

export const readQualityFigures = (row: any): QualityFigures => ({
  mos: num(row?.mos),
  jitterMs: num(row?.jitter_ms ?? row?.jitterMs),
  packetLossPct: num(row?.packet_loss_pct ?? row?.packetLossPct),
  qualityPct: num(row?.quality_percentage ?? row?.qualityPct),
});

export const bandForMos = (mos: number): QualityBand =>
  mos > GOOD_MOS ? 'good' : mos >= FAIR_MOS ? 'fair' : 'poor';

export const BAND_LABEL: Record<QualityBand, string> = {
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
};

export const BAND_CLASS: Record<QualityBand, string> = {
  good: 'text-green-700 bg-green-50 border-green-200',
  fair: 'text-amber-700 bg-amber-50 border-amber-200',
  poor: 'text-red-700 bg-red-50 border-red-200',
};

const fmt = (value: number, digits = 2) =>
  value.toFixed(digits).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');

export const readCallQuality = (row: any): QualityReading | null => {
  const figures = readQualityFigures(row);
  if (figures.mos === null) return null;
  const band = bandForMos(figures.mos);
  const explanations: string[] = [];

  explanations.push(
    `Sound score (MOS) ${fmt(figures.mos, 2)} out of 4.5. ` +
      (band === 'good'
        ? 'Nobody on the call would have noticed a problem.'
        : band === 'fair'
          ? 'Small glitches were audible but the call was usable.'
          : 'The audio was hard to follow: gaps, robotic sound or drop-outs.'),
  );

  let likelyCause = '';
  if (figures.packetLossPct !== null) {
    const loss = figures.packetLossPct;
    const note =
      loss < LOSS_NOTICEABLE_PCT
        ? 'Nothing to worry about.'
        : loss < LOSS_BAD_PCT
          ? 'Enough to hear the odd missing syllable.'
          : 'Enough to lose whole words.';
    explanations.push(`Packets lost ${fmt(loss)}%: audio that never arrived in time. ${note}`);
    if (loss >= LOSS_NOTICEABLE_PCT) {
      likelyCause =
        'Packets went missing on the way, which points at the network between the phone and us: Wi-Fi, a busy office link, or a mobile connection.';
    }
  }
  if (figures.jitterMs !== null) {
    const jitter = figures.jitterMs;
    const note =
      jitter < JITTER_NOTICEABLE
        ? 'Steady.'
        : jitter < JITTER_BAD
          ? 'Uneven enough to cause small stutters.'
          : 'Very uneven; the phone had to guess what to play.';
    explanations.push(
      `Timing jitter ${fmt(jitter)} (the switch's variance scale): how unevenly the audio arrived. ${note}`,
    );
    if (!likelyCause && jitter >= JITTER_NOTICEABLE) {
      likelyCause =
        'Audio arrived unevenly, which usually means a congested or wireless connection on one side of the call.';
    }
  }
  if (figures.qualityPct !== null) {
    explanations.push(`The switch's overall score for the call: ${fmt(figures.qualityPct, 0)}%.`);
  }
  if (!likelyCause && band !== 'good') {
    likelyCause =
      'Loss and jitter both look fine, so the score most likely reflects the codec or the far end (the carrier or the other party’s phone).';
  }

  return {
    ...figures,
    band,
    summary: `${BAND_LABEL[band]} (MOS ${fmt(figures.mos, 2)})`,
    explanations,
    likelyCause,
  };
};
