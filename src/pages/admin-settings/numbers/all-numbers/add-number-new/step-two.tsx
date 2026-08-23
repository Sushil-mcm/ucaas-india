import moment from 'moment';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useWatch } from 'react-hook-form';

export const formatString = (str: string) => {
  if (!str) return '';
  const noHyphensOrSpaces = str.replace(/[\s-]/g, '');
  return noHyphensOrSpaces.toUpperCase();
};

const StepTwo = ({ formInstance, billingDetails, setAmount }: any) => {
  const { control } = formInstance;
  // Subscribe internally so the parent memo does not need formValues in deps
  const data = useWatch({ control });

  const getPriceWithTax = () => {
    const fullPrice = data?.virtualNumbers?.length
      ? data?.virtualNumbers?.length * billingDetails?.prorated_cost
      : data?.quantity?.value * billingDetails?.prorated_cost;
    // if (isNaN(billingDetails?.tax) || isNaN(billingDetails?.prorated_cost)) {
    //   setAmount(0);
    //   return 0;
    // }
    // if (isNaN(billingDetails?.tax)) {
    //   setAmount(fullPrice);
    //   return fullPrice;
    // }
    const totalPrice = fullPrice;
    // const totalPrice = fullPrice + billingDetails?.tax;
    setAmount(totalPrice);
    return Number(totalPrice.toFixed(2)); // rounded to 2 decimal places
  };
  // const getPriceWithTax = (isOnlyTax = false) => {
  //   if (isNaN(priceData?.original_price) || isNaN(priceData?.gst)) {
  //     return 0;
  //   }
  //   const fullPrice = priceData?.original_price * Number(data?.virtualNumbers?.length || 0);
  //   const taxAmount = (fullPrice * priceData?.gst) / 100;

  //   if (isOnlyTax) return Number(taxAmount.toFixed(2)); // rounded to 2 decimal places
  //   const totalPrice = fullPrice + taxAmount;
  //   return Number(totalPrice.toFixed(2)); // rounded to 2 decimal places
  // }

  // const today = moment();
  // const expiry = moment(billingDetails?.plan_expiration_date);

  // const remainingDays = expiry.diff(today, 'days');
  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto">
      <section className="flex w-full min-h-0 flex-col gap-4 overflow-y-auto pr-1 sm:pr-2">
        <div className="flex flex-col">
          <h1 className="text-gray-900 font-semibold text-lg">Bill Details</h1>
          <h6 className="text-gray-800 text-sm">Billing Details for Number Purchase</h6>
        </div>
        <div className="flex flex-col gap-4 border-b border-gray-200">
          <div className="overflow-auto table-scroll">
            <Table className="w-full text-sm text-gray-700 h-full border border-gray-200">
              <TableHeader className="text-gray-900/80">
                <TableRow>
                  <TableHead
                    className={`px-4 py-2 border-b border-r border-gray-200 last-of-type:border-r-0 text-gray-900/80 font-semibold`}
                  >
                    Billing Period
                  </TableHead>
                  <TableHead
                    className={`px-4 py-2 border-b border-r border-gray-200 last-of-type:border-r-0 text-gray-900/80 font-semibold`}
                  >
                    Number
                  </TableHead>
                  <TableHead
                    className={`px-4 py-2 border-b border-r border-gray-200 last-of-type:border-r-0 text-gray-900/80 font-semibold`}
                  >
                    Type
                  </TableHead>
                  <TableHead
                    className={`px-4 py-2 border-b border-r border-gray-200 last-of-type:border-r-0 text-gray-900/80 font-semibold`}
                  >
                    Amount
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-200 bg-white h-full w-full font-normal">
                {data?.virtualNumbers?.length > 0 ? (
                  data?.virtualNumbers?.map((item: any) => {
                    const { name, value } = item;
                    return (
                      <TableRow key={`${name}-${value}`}>
                        <TableCell className="px-4 py-2 border-b border-r border-gray-200 text-left font-normal">
                          <p className="font-medium text-gray-800">
                            {moment().format('YYYY-MM-DD')} - {billingDetails?.plan_expiration_date}
                          </p>
                        </TableCell>
                        <TableCell className="px-4 py-2 border-b border-r border-gray-200 text-left font-normal">
                          <p className="font-medium text-gray-800">{name}</p>
                        </TableCell>
                        <TableCell className="px-4 py-2 border-b border-r border-gray-200 text-left font-normal">
                          <p className="font-medium text-gray-800">{data?.numberType?.label}</p>
                        </TableCell>
                        <td className="bg-gray-100/10 border-b border-gray font-medium px-4 py-3 text-gray-900 text-left">
                          <p className="font-medium text-gray-800">
                            ${billingDetails?.prorated_cost}
                          </p>
                        </td>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell className="px-4 py-2 border-b border-r border-gray-200 text-left font-normal">
                      <p className="font-medium text-gray-800">
                        {moment().format('YYYY-MM-DD')} - {billingDetails?.plan_expiration_date}
                      </p>
                    </TableCell>
                    <TableCell className="px-4 py-2 border-b border-r border-gray-200 text-left font-normal">
                      <p className="font-medium text-gray-800">
                        {data?.location?.label} ({data?.quantity?.value})
                      </p>
                    </TableCell>
                    <TableCell className="px-4 py-2 border-b border-r border-gray-200 text-left font-normal">
                      <p className="font-medium text-gray-800">{data?.numberType?.label}</p>
                    </TableCell>
                    <td className="bg-gray-100/10 border-b border-gray font-medium px-4 py-3 text-gray-900 text-left">
                      <p className="font-medium text-gray-800">${billingDetails?.prorated_cost}</p>
                    </td>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
        <div className="flex w-full justify-end gap-4 lg:w-1/2">
          <div className="w-full rounded-xl border border-grey-200 p-3">
            <h5 className="font-semibold text-gray-900 truncate text-md border-b border-gray-200 pb-3">
              Order Summary
            </h5>
            <ul className="flex flex-col gap-2 pt-3 text-sm text-gray-800">
              <li className="flex items-center justify-between gap-2">
                <span className="font-semibold">Monthly DID Cost:</span> $
                {data?.virtualNumbers?.length
                  ? data?.virtualNumbers?.length * billingDetails?.prorated_cost
                  : data?.quantity?.value * billingDetails?.prorated_cost}
              </li>
              <li className="flex items-center justify-between gap-2">
                <span className="font-semibold">
                  Prorated Period ({moment().format('MMM D')} –{' '}
                  {moment(billingDetails?.plan_expiration_date, 'YYYY-MM-DD').format('MMM D')}):
                </span>{' '}
                {billingDetails?.remaining_days} days
              </li>
              <li className="flex items-center justify-between gap-2">
                <span className="font-semibold">Prorated Charge for a DID:</span>{' '}
                {`$${getPriceWithTax()}`}
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};

export default StepTwo;
