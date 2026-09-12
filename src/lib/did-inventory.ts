/* Numbers from our own stock.
 *
 * We buy a shelf of numbers ahead of demand, so a customer picking a number
 * gets one instantly instead of waiting on a carrier search and a carrier order
 * placed inside their checkout. Two screens use this - the sign-up number step
 * and the Add Number wizard - and they must behave the same way, so the
 * decision of "stock or carrier" lives here rather than being made twice.
 *
 * The rule is: ask the shelf first, and fall back to the carrier only when the
 * shelf is empty. An empty shelf is an ordinary answer, not a failure - a state
 * we hold nothing for should still be buyable, just more slowly.
 */
import { getInventoryAvailable } from '@/services/api';

/** DIDWW's group-type id for toll-free, the same constant the wizard uses. */
const TOLL_FREE_TYPE_IDS = ['1b8076db-df6c-42ee-bdc0-392367b7e070'];

export type InventoryType = 'local' | 'tollfree';

/** Which shelf a number-type selection maps to, or null if we stock nothing of
    that kind. The wizard's options carry DIDWW's own name as the label and its
    uuid as the value, so both are worth checking - the uuid is exact, the label
    survives a catalogue change. */
export const inventoryTypeFor = (numberType: any): InventoryType | null => {
    const label = String(numberType?.label || '').trim().toLowerCase();
    const value = String(numberType?.value || '').trim().toLowerCase();

    if (TOLL_FREE_TYPE_IDS.includes(numberType?.value) || label.startsWith('toll') || value.startsWith('toll')) {
        return 'tollfree';
    }
    if (label === 'local') return 'local';
    return null;
};

/* The only two kinds of number the business sells. The carrier's catalogue also
   lists Global, National, Shared Cost and Mobile, but we hold none of them - and
   Mobile does not exist in the US or Canada at all, because North America has no
   separate mobile range. Offering a type we cannot fill is a dead end dressed up
   as a choice, so the pickers are filtered to these. */
const SELLABLE_TYPE_NAMES = ['local', 'toll-free', 'toll free', 'tollfree'];

export const isSellableNumberType = (item: any): boolean =>
    SELLABLE_TYPE_NAMES.includes(String(item?.name ?? item?.label ?? '').trim().toLowerCase());

export interface InventoryNumber {
    /* `id` and `number` are named to match what the carrier returns, so the
       tables and the selection handlers downstream need no branch of their
       own - a row is a row whichever shelf it came from. */
    id: string;
    number: string;
    did_number: string;
    area_code?: string;
    area_name?: string;
    region_name?: string;
    did_type: InventoryType;
    setup_price: number;
    monthly_price: number;
    features?: string[] | null;
    /** True for rows that came from our own stock. Lets a screen say so, and
        lets the purchase step know to claim rather than order. */
    from_inventory: true;
}

export interface InventoryLookup {
    source: 'inventory' | 'empty';
    rows: InventoryNumber[];
}

/** Ask the shelf. Never throws: a failure here must not stop the carrier
    fallback, or an inventory outage would take number-buying down with it. */
export const lookupInventory = async (params: {
    countryIso?: string;
    numberType: any;
    regionName?: string | null;
    limit?: number;
    /* Sign-up carries a temporary onboarding token on every call. These
       endpoints do not require it, but passing it keeps this request looking
       like every other one the screen makes. */
    config?: any;
}): Promise<InventoryLookup> => {
    const didType = inventoryTypeFor(params.numberType);
    const country = String(params.countryIso || '').toUpperCase();

    /* Only US stock exists today. A state is NOT required: without one the
       server spreads the five across the states we hold, which is the whole
       point of asking for a number type and nothing else. An earlier version
       bailed out here when no state was given, which meant every local lookup
       returned empty and every customer silently fell through to the carrier. */
    if (!didType || country !== 'US') return { source: 'empty', rows: [] };

    try {
        const response: any = await getInventoryAvailable(
            {
                country_iso: country,
                did_type: didType,
                region_name: didType === 'tollfree' ? null : params.regionName,
                limit: params.limit ?? 5,
            },
            params.config,
        );
        const result = response?.data?.data?.result ?? response?.data?.result ?? null;
        const rows = Array.isArray(result?.rows) ? result.rows : [];

        return {
            source: rows.length ? 'inventory' : 'empty',
            rows: rows.map((row: any) => ({
                id: row.did_number,
                number: row.did_number,
                did_number: row.did_number,
                area_code: row.area_code,
                area_name: row.area_name,
                region_name: row.region_name,
                did_type: row.did_type,
                setup_price: Number(row.setup_price ?? 0),
                monthly_price: Number(row.monthly_price ?? 0),
                features: row.features ?? null,
                from_inventory: true as const,
            })),
        };
    } catch {
        return { source: 'empty', rows: [] };
    }
};
