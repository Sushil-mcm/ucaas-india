import { FC, useEffect, useMemo, useState } from 'react';
import { Icon } from '@/assets/icons/icon';
import Loader from '@/components/custom/loader';
import { Button } from '@/components/ui/button';
import { handleDownloadFile, parseTime } from '@/lib/utils';
import { ICallDetails } from '.';
import { AuthenticatedAudio } from '@/components/custom/authenticated-media';
import { fetchAuthenticatedMedia } from '@/hooks/use-authenticated-media';

interface TranscriptInfoProps {
  setTranscriptionState: (val: any) => void;
  initialData: string;
  transcriptSrcURL: string;
  callDetails?: ICallDetails;
}

type SpeakerItem = {
  id?: string | number;
  start_time?: string;
  end_time?: string;
  text?: string;
  speaker?: string;
  speakerDetails?: {
    role?: string;
    userName?: string;
  };
};

type SentimentScores = {
  positive: number;
  neutral: number;
  negative: number;
};

type SpeakerWordCount = {
  name: string;
  wordCount: number;
};

const normalizeKeywords = (rawKeywords: unknown): string[] => {
  const keywordValues = Array.isArray(rawKeywords) ? rawKeywords : [rawKeywords];
  const uniqueKeywords = new Map<string, string>();

  keywordValues.forEach((keywordValue) => {
    if (typeof keywordValue !== 'string') return;

    keywordValue.split(/[,;|]/).forEach((keyword) => {
      const trimmedKeyword = keyword.trim();
      if (!trimmedKeyword) return;
      uniqueKeywords.set(trimmedKeyword.toLowerCase(), trimmedKeyword);
    });
  });

  return Array.from(uniqueKeywords.values());
};

const formatSpeakerName = (name: string, index: number) => {
  if (name === '0') return 'Speaker 1';
  if (name === '1') return 'Speaker 2';
  return name.trim() || `Speaker ${index + 1}`;
};

const normalizeSpeakerWordCounts = (
  rawSpeakerWords: unknown,
  speakerNames: string[],
): SpeakerWordCount[] => {
  let speakerWords = rawSpeakerWords;

  // The transcript service can return this field as stringified JSON and can
  // wrap the actual speaker/count collection in another `speaker_word` key.
  for (let depth = 0; depth < 4; depth += 1) {
    if (typeof speakerWords === 'string') {
      try {
        speakerWords = JSON.parse(speakerWords);
        continue;
      } catch {
        return [];
      }
    }

    if (
      speakerWords &&
      typeof speakerWords === 'object' &&
      !Array.isArray(speakerWords) &&
      'speaker_word' in speakerWords
    ) {
      speakerWords = (speakerWords as Record<string, unknown>).speaker_word;
      continue;
    }

    break;
  }

  if (Array.isArray(speakerWords)) {
    return speakerWords.flatMap((count, index) => {
      const wordCount = Number(count);
      if (!Number.isFinite(wordCount) || wordCount < 0) return [];

      return [
        {
          name: formatSpeakerName(speakerNames[index] || '', index),
          wordCount,
        },
      ];
    });
  }

  if (speakerWords && typeof speakerWords === 'object') {
    return Object.entries(speakerWords).flatMap(([name, count], index) => {
      const wordCount = Number(count);
      if (!Number.isFinite(wordCount) || wordCount < 0) return [];

      return [{ name: formatSpeakerName(name, index), wordCount }];
    });
  }

  return [];
};

const normalizeTime = (time?: string) => {
  if (!time || typeof time !== 'string') return '00:00:00';
  return time.split(',')[0];
};

const formatSpeakerStartTime = (time?: string) => {
  if (!time || typeof time !== 'string') return '';

  const normalizedTime = normalizeTime(time).trim();
  if (!normalizedTime) return '';

  // Handle ISO datetime strings first.
  const parsedDate = new Date(normalizedTime);
  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  // Fallback for raw HH:MM(:SS) values.
  const [hours = '0', minutes = '0'] = normalizedTime.split(':');
  const parsedHours = Number(hours);
  const parsedMinutes = Number(minutes);
  if (!Number.isFinite(parsedHours) || !Number.isFinite(parsedMinutes)) return normalizedTime;

  const totalHours = ((Math.floor(parsedHours) % 24) + 24) % 24;
  const clampedMinutes = Math.max(0, Math.min(59, Math.floor(parsedMinutes)));
  const meridiem = totalHours >= 12 ? 'PM' : 'AM';
  const hour12 = totalHours % 12 || 12;
  return `${String(hour12).padStart(2, '0')}:${String(clampedMinutes).padStart(2, '0')} ${meridiem}`;
};

// const asNumber = (value: unknown) => {
//   if (typeof value === 'number' && Number.isFinite(value)) return value;
//   const parsed = Number(value);
//   return Number.isFinite(parsed) ? parsed : 0;
// };

// const toPercent = (value: number) => `${Math.round(value * 100)}%`;

const TranscriptInfo: FC<TranscriptInfoProps> = ({
  setTranscriptionState,
  initialData,
  transcriptSrcURL = '',
}) => {
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [summary, setSummary] = useState<string>('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [speaker, setSpeaker] = useState<SpeakerItem[]>([]);
  const [speakerWordCounts, setSpeakerWordCounts] = useState<SpeakerWordCount[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [sentimentScores, setSentimentScores] = useState<SentimentScores | null>(null);
  console.log(sentimentScores, 'sentimentScoressentimentScores 1');

  const isTranscriptInvalid = useMemo(
    () =>
      !transcriptSrcURL ||
      transcriptSrcURL.endsWith('/null') ||
      transcriptSrcURL.endsWith('/undefined'),
    [transcriptSrcURL],
  );

  useEffect(() => {
    let isActive = true;

    if (isTranscriptInvalid) {
      setSummary('No summary available');
      setKeywords([]);
      setSpeaker([]);
      setSpeakerWordCounts([]);
      setSentimentScores(null);
      setHasError(false);
      setErrorMessage('');
      setIsLoading(false);
    } else {
      setIsLoading(true);
      setHasError(false);
      setErrorMessage('');

      fetchAuthenticatedMedia(transcriptSrcURL)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Failed to fetch transcript: ${res.status} ${res.statusText}`);
          }
          return res.json();
        })
        .then((data) => {
          if (!isActive) return;
          if (!data || typeof data !== 'object') {
            throw new Error('Invalid transcript data format');
          }

          setSummary(typeof data?.summary === 'string' ? data.summary : 'No summary available');

          setKeywords(normalizeKeywords(data?.keywords));

          const average = data;
          if (average && typeof average === 'object') {
            const label = String(average.sentiment || '').toLowerCase();
            // const score = Math.abs(asNumber(average.sentiment_score));
            console.log(
              '🚀 ~ scoreTranscriptInfo ~ average:',
              data,
              'score',
              average.sentiment_score,
              'average',
              average,
              'label',
              label,
            );
            setSentimentScores({
              positive: average.sentiment_scores?.positive
                ? Number(average.sentiment_scores?.positive)
                : 0,
              neutral: average.sentiment_scores?.neutral
                ? Number(average.sentiment_scores?.neutral)
                : 0,
              negative: average.sentiment_scores?.negative
                ? Number(average.sentiment_scores?.negative)
                : 0,
            });
          } else {
            setSentimentScores(null);
          }

          const transcriptSpeakers: SpeakerItem[] = Array.isArray(data?.speaker)
            ? data.speaker
            : [];
          const speakerNames = transcriptSpeakers.reduce<string[]>((names, item, index) => {
            const name = formatSpeakerName(
              item?.speakerDetails?.userName || item?.speaker || '',
              index,
            );
            if (!names.includes(name)) names.push(name);
            return names;
          }, []);

          setSpeaker(transcriptSpeakers);
          setSpeakerWordCounts(normalizeSpeakerWordCounts(data?.speaker_word, speakerNames));
        })
        .catch((err) => {
          if (!isActive) return;
          console.error('Error fetching transcript:', err);
          setHasError(true);
          setErrorMessage(err?.message || 'Failed to load transcript.');
        })
        .finally(() => {
          if (!isActive) return;
          setIsLoading(false);
        });
    }

    return () => {
      isActive = false;
      setTranscriptionState({ url: '', src: '' });
    };
  }, [isTranscriptInvalid, transcriptSrcURL, setTranscriptionState]);

  const speakerRatios = useMemo(() => {
    const totalWords = speakerWordCounts.reduce((total, item) => total + item.wordCount, 0);

    if (totalWords <= 0) return [];

    return speakerWordCounts.map((item) => ({
      ...item,
      percentage: (item.wordCount / totalWords) * 100,
    }));
  }, [speakerWordCounts]);

  const audioPlayer = initialData ? (
    <div className="flex items-center gap-3 w-full">
      <AuthenticatedAudio
        controls
        src={String(initialData)}
        preload="metadata"
        className="flex-1 h-9 accent-primary"
        onTimeUpdate={(e) => {
          const time: any = e.currentTarget.currentTime;
          setCurrentTime(time);
        }}
      />
      <Button
        variant="outline"
        size="icon"
        onClick={() => handleDownloadFile({ fileUrl: initialData })}
        className="rounded-full shrink-0 h-9 w-9 border-gray-200 text-gray-500 hover:bg-primary hover:text-white hover:border-primary transition-all duration-200"
      >
        <Icon name="Download" className="w-4.5 h-4.5" />
      </Button>
    </div>
  ) : (
    <p className="text-sm text-gray-500">Audio recording is not available.</p>
  );

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center p-8">
        <Loader variant="blue" size="md" />
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="h-full w-full flex items-center justify-center p-6">
        <div className="w-full max-w-xl border border-red-200 bg-red-50 rounded-xl px-4 py-5 flex items-center gap-3">
          <Icon name="AlertIcon" className="w-6 h-6 text-red-500 shrink-0" />
          <p className="text-sm text-red-700 font-medium">{errorMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-0 bg-white flex flex-col overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.7fr)_minmax(19rem,1fr)] flex-1 min-h-0">
        <section className="flex flex-col min-h-0 border-b md:border-b-0 md:border-r border-gray-200">
          <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50/70">
            <p className="text-xs font-semibold tracking-wide text-gray-600 uppercase">
              Transcript Records
            </p>
          </div>

          <div className="min-h-0 overflow-y-auto px-3 py-3">
            {speaker.length > 0 ? (
              <div className="flex flex-col gap-2">
                {speaker.map((item, index) => {
                  const isAgent = item?.speakerDetails?.role === 'Agent';
                  const startTime = parseTime(normalizeTime(item?.start_time));
                  const endTime = parseTime(normalizeTime(item?.end_time));
                  const isCurrent =
                    currentTime > 0 && currentTime >= startTime && currentTime <= endTime;
                  const speakerName = item?.speakerDetails?.userName || item?.speaker || 'Unknown';
                  const speakerStartTime = formatSpeakerStartTime(item?.start_time);

                  return (
                    <div
                      key={item?.id || index}
                      className={`flex flex-col ${isAgent ? 'items-end' : 'items-start'}`}
                    >
                      <p
                        className={`text-[11px]  px-1 mb-1 ${
                          speakerName == '0'
                            ? 'text-green-500'
                            : speakerName == '1'
                              ? 'text-amber-500'
                              : 'text-gray-500'
                        }`}
                      >
                        {speakerName == '0'
                          ? 'Speaker 1'
                          : speakerName == '1'
                            ? 'Speaker 2'
                            : speakerName}
                        {speakerStartTime ? (
                          <span className="ml-1 text-gray-400">{speakerStartTime}</span>
                        ) : null}
                      </p>
                      <div
                        className={`max-w-[88%] px-3 py-2 rounded-2xl border text-sm leading-6 break-words ${
                          isAgent
                            ? 'bg-primary/10 border-primary/20 text-gray-900 rounded-br-md'
                            : 'bg-gray-50 border-gray-200 text-gray-800 rounded-bl-md'
                        } ${isCurrent ? 'ring-1 ring-primary/40' : ''}`}
                      >
                        {item?.text || ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-full min-h-[180px] flex items-center justify-center text-sm text-gray-500">
                Transcript is not available for this call.
              </div>
            )}
          </div>
        </section>

        <aside className="flex flex-col min-h-0">
          <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50/70">
            <p className="text-xs font-semibold tracking-wide text-gray-600 uppercase">
              Conversation Insights
            </p>
          </div>

          <div className="min-h-0 overflow-y-auto px-4 py-4 space-y-5">
            <section>
              <p className="text-xs font-semibold tracking-wide text-gray-600 uppercase mb-2">
                Sentiment
              </p>

              {sentimentScores ? (
                <div className="mt-auto rounded-2xl border border-ucass-active-bg bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-2 py-2 ">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#5d7394] max-[380px]:text-[9px] sm:text-[11px]">
                    Live sentiment
                  </p>

                  <div className="mt-2 grid grid-cols-3 gap-2 max-[380px]:gap-1.5 sm:mt-3 sm:gap-3">
                    {[
                      { label: 'Positive', value: sentimentScores.positive, color: '#22c55e' },
                      {
                        label: 'Neutral',
                        value: sentimentScores.neutral,
                        color: 'var(--color-ucass-active)',
                      },
                      { label: 'Negative', value: sentimentScores.negative, color: '#ef4444' },
                    ].map((item) => {
                      const progressAngle = Math.round((item.value / 100) * 360);

                      return (
                        <div key={item.label} className="flex flex-col items-center justify-center">
                          <div
                            className="relative flex h-14 w-14 items-center justify-center rounded-full max-[380px]:h-12 max-[380px]:w-12 sm:h-16 sm:w-16"
                            style={{
                              background: `conic-gradient(${item.color} ${progressAngle}deg, #e6edf9 ${progressAngle}deg)`,
                            }}
                          >
                            <div className="flex h-[80%] w-[80%] items-center justify-center rounded-full bg-white text-[#1e3352]">
                              <span className="text-[10px] font-semibold max-[380px]:text-[9px] sm:text-[11px]">
                                {item.value.toFixed(2)}%
                              </span>
                            </div>
                          </div>
                          <p className="mt-1 text-[10px] font-medium text-[#5f7392] max-[380px]:text-[9px] sm:text-[11px]">
                            {item.label}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-gray-300 px-3 py-5 text-sm text-gray-500 text-center">
                  Sentiment data is not available.
                </div>
              )}
            </section>

            <section>
              <p className="text-xs font-semibold tracking-wide text-gray-600 uppercase mb-2">
                Call Summary
              </p>
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
                <p className="text-sm text-gray-700 leading-6">
                  {summary || 'No summary available for this call.'}
                </p>
              </div>
            </section>

            {keywords.length > 0 && (
              <section>
                <p className="text-xs font-semibold tracking-wide text-gray-600 uppercase mb-2">
                  Key Topics
                </p>
                <div className="flex flex-wrap gap-2 rounded-xl border border-ucass-active-bg bg-[#f7faff] p-2.5">
                  {keywords.map((kw, index) => (
                    <span
                      key={`${kw}-${index}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#b8d4ff] bg-white px-3 py-1.5 text-xs font-semibold text-primary shadow-[0_1px_3px_rgba(25,99,210,0.1)]"
                    >
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      {kw}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {speakerRatios.length > 0 && (
              <section>
                <p className="text-xs font-semibold tracking-wide text-gray-600 uppercase mb-2">
                  Speak Word Ratio
                </p>
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 space-y-3">
                  {speakerRatios.map((item, index) => (
                    <div key={`${item.name}-${index}`}>
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                        <span className="truncate font-medium text-gray-700">{item.name}</span>
                        <span className="shrink-0 font-semibold text-gray-600">
                          {item.percentage.toFixed(1)}% ({item.wordCount} words)
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className={`h-full rounded-full ${index === 0 ? 'bg-primary' : 'bg-amber-500'}`}
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </aside>
      </div>

      <div className="shrink-0 border-t border-gray-200 px-4 py-3 bg-white">
        <p className="text-xs font-semibold tracking-wide text-gray-600 uppercase mb-2">
          Recording
        </p>
        {audioPlayer}
      </div>
    </div>
  );
};

export default TranscriptInfo;
