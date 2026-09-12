/* The form behind "New schedule" and Edit.
 *
 * Everything a person needs to answer is on one panel: which report, how often,
 * when, and who gets it. Nothing here decides WHEN the next send actually falls
 * - the server does that with the same arithmetic its cron uses, so the answer
 * cannot differ between what the screen predicts and what arrives.
 */

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Icon } from '@/assets/icons/icon';
import CustomSelect from '@/components/custom/custom-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { handleAlert } from '@/lib/utils';
import { createReportSchedule, updateReportSchedule } from '@/services/api';

const WEEKDAYS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' },
];

const FREQUENCIES = [
  { value: 'daily', label: 'Every day' },
  { value: 'weekly', label: 'Every week' },
  { value: 'monthly', label: 'Every month' },
];

/* 1st..28th. The server refuses anything past the 28th, because a schedule set
   for the 30th would skip February and the person who set it would never be
   told why their report stopped arriving. */
const MONTH_DAYS = Array.from({ length: 28 }, (_, index) => ({
  value: index + 1,
  label: `Day ${index + 1}`,
}));

const HOURS = Array.from({ length: 24 }, (_, hour) => ({
  value: hour,
  label: `${String(hour).padStart(2, '0')}:00`,
}));

/* Every zone the browser knows, with the viewer's own first so the common case
   is one click. Older browsers have no supportedValuesOf; they get a short list
   rather than an empty one. */
const browserZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

const timezoneOptions = (): { value: string; label: string }[] => {
  let zones: string[] = [];
  try {
    zones = (Intl as any)?.supportedValuesOf?.('timeZone') || [];
  } catch {
    zones = [];
  }
  if (!zones.length) {
    zones = ['UTC', 'Asia/Kolkata', 'Europe/London', 'America/New_York', 'America/Los_Angeles'];
  }
  const mine = browserZone();
  const rest = zones.filter((zone) => zone !== mine);
  return [mine, ...rest].map((zone) => ({ value: zone, label: zone.replace(/_/g, ' ') }));
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface ScheduleFormProps {
  schedule: any | null;
  reportTypes: { value: string; label: string }[];
  onDone: () => void;
}

const ScheduleForm = ({ schedule, reportTypes, onDone }: ScheduleFormProps) => {
  const queryClient = useQueryClient();
  const isEdit = Boolean(schedule?.uuid);

  const [name, setName] = useState('');
  const [reportType, setReportType] = useState('');
  const [frequency, setFrequency] = useState('weekly');
  const [sendHour, setSendHour] = useState(7);
  const [sendDay, setSendDay] = useState(1);
  const [timezone, setTimezone] = useState(browserZone());
  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientDraft, setRecipientDraft] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const zones = useMemo(timezoneOptions, []);

  useEffect(() => {
    if (!schedule) return;
    setName(schedule.name || '');
    setReportType(schedule.report_type || '');
    setFrequency(schedule.frequency || 'weekly');
    setSendHour(Number(schedule.send_hour ?? 7));
    setSendDay(Number(schedule.send_day ?? 1));
    setTimezone(schedule.timezone || browserZone());
    setRecipients(Array.isArray(schedule.recipients) ? schedule.recipients : []);
    setEnabled(Number(schedule.enabled) !== 0);
  }, [schedule]);

  const addRecipient = (raw?: string) => {
    const candidate = String(raw ?? recipientDraft)
      .trim()
      .toLowerCase();
    if (!candidate) return;
    if (!EMAIL.test(candidate)) {
      setErrors((previous) => ({ ...previous, recipients: `"${candidate}" is not an email address` }));
      return;
    }
    if (recipients.includes(candidate)) {
      setRecipientDraft('');
      return;
    }
    setRecipients((previous) => [...previous, candidate]);
    setRecipientDraft('');
    setErrors((previous) => ({ ...previous, recipients: '' }));
  };

  const { mutate: save, isPending } = useMutation({
    mutationFn: (payload: any) => (isEdit ? updateReportSchedule(payload) : createReportSchedule(payload)),
    onSuccess: () => {
      handleAlert({
        text: isEdit ? 'Schedule updated' : 'Schedule created',
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['reportSchedules'] });
      onDone();
    },
  });

  const submit = () => {
    /* The last address is often still sitting in the box unconfirmed; taking it
       rather than dropping it is what somebody means by pressing Save. */
    const pendingDraft = recipientDraft.trim().toLowerCase();
    const finalRecipients =
      pendingDraft && EMAIL.test(pendingDraft) && !recipients.includes(pendingDraft)
        ? [...recipients, pendingDraft]
        : recipients;

    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = 'Give this schedule a name';
    if (!reportType) nextErrors.reportType = 'Choose a report';
    if (!finalRecipients.length) nextErrors.recipients = 'Add at least one recipient';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setRecipients(finalRecipients);
    setRecipientDraft('');

    save({
      ...(isEdit ? { uuid: schedule.uuid } : {}),
      name: name.trim(),
      report_type: reportType,
      frequency,
      send_hour: sendHour,
      send_day: frequency === 'daily' ? null : sendDay,
      timezone,
      recipients: finalRecipients,
      enabled,
      filters: schedule?.filters || {},
    });
  };

  const dayOptions = frequency === 'monthly' ? MONTH_DAYS : WEEKDAYS;

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        <div>
          <Label className="mb-1 block">Name</Label>
          <Input
            value={name}
            placeholder="Weekly queue summary"
            onChange={(event) => setName(event.target.value)}
          />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
        </div>

        <div>
          <Label className="mb-1 block">Report</Label>
          <CustomSelect
            options={reportTypes}
            value={reportTypes.find((option) => option.value === reportType) || null}
            handleChange={(option: any) => setReportType(option?.value || '')}
            placeholder="Choose a report"
          />
          {errors.reportType && <p className="mt-1 text-xs text-red-500">{errors.reportType}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label className="mb-1 block">How often</Label>
            <CustomSelect
              options={FREQUENCIES}
              value={FREQUENCIES.find((option) => option.value === frequency) || null}
              handleChange={(option: any) => setFrequency(option?.value || 'weekly')}
            />
          </div>
          {frequency !== 'daily' && (
            <div>
              <Label className="mb-1 block">{frequency === 'monthly' ? 'On' : 'On a'}</Label>
              <CustomSelect
                options={dayOptions}
                value={dayOptions.find((option) => option.value === sendDay) || null}
                handleChange={(option: any) => setSendDay(Number(option?.value ?? 1))}
              />
            </div>
          )}
          <div>
            <Label className="mb-1 block">At</Label>
            <CustomSelect
              options={HOURS}
              value={HOURS.find((option) => option.value === sendHour) || null}
              handleChange={(option: any) => setSendHour(Number(option?.value ?? 7))}
            />
          </div>
          <div>
            <Label className="mb-1 block">Time zone</Label>
            <CustomSelect
              options={zones}
              value={zones.find((option) => option.value === timezone) || null}
              handleChange={(option: any) => setTimezone(option?.value || 'UTC')}
            />
          </div>
        </div>

        <div>
          <Label className="mb-1 block">Send to</Label>
          <div className="flex gap-2">
            <Input
              value={recipientDraft}
              placeholder="name@company.com"
              onChange={(event) => setRecipientDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ',') {
                  event.preventDefault();
                  addRecipient();
                }
              }}
              onBlur={() => recipientDraft.trim() && addRecipient()}
            />
            <Button type="button" variant="outline" onClick={() => addRecipient()}>
              Add
            </Button>
          </div>
          {errors.recipients && <p className="mt-1 text-xs text-red-500">{errors.recipients}</p>}
          {recipients.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {recipients.map((address) => (
                <span
                  key={address}
                  className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-800"
                >
                  {address}
                  <button
                    type="button"
                    aria-label={`Remove ${address}`}
                    className="text-gray-400 hover:text-red-500"
                    onClick={() =>
                      setRecipients((previous) => previous.filter((item) => item !== address))
                    }
                  >
                    <Icon name="CloseIcon" className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <p className="mt-2 text-xs text-gray-500">
            Each report is emailed as a link to a CSV file, not as an attachment, so a long
            period does not bounce off anyone's mailbox.
          </p>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
          <div>
            <p className="text-sm font-medium text-gray-900">Send this schedule</p>
            <p className="text-xs text-gray-500">Turn it off to keep the schedule without sending.</p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </div>

      <div className="flex shrink-0 justify-end gap-2 border-t border-gray-200 p-4">
        <Button type="button" variant="outline" onClick={onDone} disabled={isPending}>
          Cancel
        </Button>
        <Button type="button" onClick={submit} disabled={isPending}>
          {isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create schedule'}
        </Button>
      </div>
    </div>
  );
};

export default ScheduleForm;
