/* Choosing a phone number.
 *
 * One component for every place a customer picks a number - the Add Number
 * wizard and the sign-up step - because they were drifting apart and somebody
 * buying their second number should recognise the screen they bought their
 * first one on.
 *
 * The shape follows the /get-started screen deliberately, down to the number
 * formatting and the wording, and it borrows that screen's own helpers rather
 * than copying them: `prettyNumber`, `countdownLabel` and `NUMBER_TYPE_HINT`
 * all come from lib/get-started-flow, so the three screens cannot drift into
 * three different ideas of what a phone number looks like.
 *
 * People scan a wall of numbers for one that reads well rather than working
 * down a list, so the numbers are large tiles, five of them - which is what the
 * shelf hands out - and the type is two plain choices rather than a dropdown.
 */
import { useEffect, useState } from 'react';
import Loader from '@/components/custom/loader';
import {
    NUMBER_TYPE_HINT,
    countdownLabel,
    prettyNumber,
} from '@/lib/get-started-flow';

export interface PickableNumber {
    /** What the caller stores when this one is chosen. */
    id: string;
    /** Digits as the carrier gives them, e.g. 12135103420. */
    number: string;
    area_code?: string | null;
    area_name?: string | null;
    region_name?: string | null;
    /** True when it came off our own shelf rather than a carrier search. */
    from_inventory?: boolean;
}

export interface PickableType {
    label: string;
    value: string;
}

interface NumberPickerProps {
    numbers: PickableNumber[];
    /** `id` of the chosen number, or null. */
    selectedId?: string | null;
    onSelect: (item: PickableNumber) => void;
    loading?: boolean;
    heading?: string;
    subheading?: string;
    /** The two choices - Local and Toll-free - rendered as cards. Omit to hide
        the whole block where the caller asks for the type another way. */
    types?: PickableType[];
    selectedType?: PickableType | null;
    onTypeChange?: (t: PickableType) => void;
    /** Seconds until the list is refreshed. Omitted hides the countdown. */
    refreshSeconds?: number | null;
    emptyMessage?: string;
    /** Five is what the shelf hands out, so five is what we show. */
    limit?: number;
}

const NumberPicker = ({
    numbers,
    selectedId = null,
    onSelect,
    loading = false,
    heading,
    subheading,
    types,
    selectedType = null,
    onTypeChange,
    refreshSeconds = null,
    emptyMessage = 'No number is available for this selection.',
    limit = 5,
}: NumberPickerProps) => {
    const shown = (numbers || []).slice(0, limit);
    const fromStock = shown.some((n) => n.from_inventory);

    /* Re-announce the list when it changes, so a screen reader is not left on a
       number that has just been replaced by the refresh. */
    const [announce, setAnnounce] = useState('');
    useEffect(() => {
        if (loading) return;
        setAnnounce(shown.length ? `${shown.length} numbers available` : '');
    }, [loading, shown.length]);

    return (
        <div className="w-full">
            {(heading || subheading) && (
                <div className="mb-4">
                    {heading && (
                        <h3 className="text-[20px] font-semibold tracking-tight text-secondary">{heading}</h3>
                    )}
                    {subheading && <p className="mt-1 text-[13px] text-grey-700">{subheading}</p>}
                </div>
            )}

            {types && types.length > 0 && (
                <div className="mb-4">
                    <p className="mb-1.5 text-[12px] font-semibold text-grey-800">Number type</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {types.map((t) => {
                            const on = selectedType?.value === t.value;
                            return (
                                <button
                                    type="button"
                                    key={t.value}
                                    onClick={() => onTypeChange?.(t)}
                                    aria-pressed={on}
                                    className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                                        on
                                            ? 'border-primary bg-primary-600 ring-1 ring-primary'
                                            : 'border-hairline bg-white hover:bg-grey-100'
                                    }`}
                                >
                                    <span
                                        className={`block text-[14px] font-semibold ${on ? 'text-primary' : 'text-secondary'}`}
                                    >
                                        {t.label}
                                    </span>
                                    {NUMBER_TYPE_HINT[t.label] && (
                                        <span className="mt-0.5 block text-[12px] text-grey-700">
                                            {NUMBER_TYPE_HINT[t.label]}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-10">
                    <Loader variant="blue" size="md" />
                </div>
            ) : shown.length ? (
                <div>
                    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-[12px] font-semibold text-grey-800">
                            {fromStock ? 'Ready now, from our own stock' : 'Available from the carrier'}
                        </span>
                        {refreshSeconds != null && (
                            <span className="text-[12px] tabular-nums text-grey-600">
                                List refreshes in {countdownLabel(refreshSeconds)}
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {shown.map((n) => {
                            const on = selectedId === n.id;
                            const where = [n.area_name, n.region_name].filter(Boolean).join(', ');
                            return (
                                <button
                                    type="button"
                                    key={`${n.id}-${n.number}`}
                                    onClick={() => onSelect(n)}
                                    aria-pressed={on}
                                    className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                                        on
                                            ? 'border-primary bg-primary-600 ring-1 ring-primary'
                                            : 'border-hairline bg-white hover:bg-grey-100'
                                    }`}
                                >
                                    <span
                                        className={`block text-[16px] font-medium tabular-nums tracking-tight ${
                                            on ? 'text-primary' : 'text-secondary'
                                        }`}
                                    >
                                        {prettyNumber(n.number)}
                                    </span>
                                    <span className="mt-0.5 block truncate text-[12px] text-grey-600">
                                        {where || selectedType?.label || ''}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <p className="sr-only" aria-live="polite">
                        {announce}
                    </p>
                </div>
            ) : (
                <p className="rounded-xl border border-hairline bg-white px-4 py-8 text-center text-[13px] text-grey-700">
                    {emptyMessage}
                </p>
            )}
        </div>
    );
};

export default NumberPicker;
