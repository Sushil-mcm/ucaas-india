import { useUser } from '@/hooks/use-user';
import { getFullFormateDate, getEnv, handleAlert } from '@/lib/utils';
import { useOrganization } from '@/hooks/use-organisation';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import Logo from '@/assets/images/Logo.svg';
import { Button } from '@/components/ui/button';
import { useRef, useState } from 'react';
import TableManager from '@/components/custom/table-manager';
import { downloadAnalyticsSectionAsPdf } from '@/lib/analytics-export';

const InvoiceDetails = ({ info, drawerState, setDrawerState }: any) => {
  const { user } = useUser();
  const { mainSiteInfo } = useOrganization();
  const { company_info } = user || {};
  const hiddenRef = useRef<HTMLDivElement | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const mainSiteAddress =
    typeof mainSiteInfo?.address === 'string' ? mainSiteInfo.address.trim() : '';
  const mainSiteInvoiceEmail =
    typeof mainSiteInfo?.invoice_email === 'string' ? mainSiteInfo.invoice_email.trim() : '';
  const discountPrice = Number(info?.promo_discount || 0)?.toFixed(0);
  const isDiscount =
    info?.purchase_detail?.plan_cost?.discount_enabled || info?.purchase_detail?.discount_enabled;
  const planDiscountPrice =
    info?.purchase_detail?.plan_cost?.discount_price || info?.purchase_detail?.discount_price;
  const planOriginalPrice =
    info?.purchase_detail?.plan_cost?.original_price || info?.purchase_detail?.original_price;
  const isValidType = ['Plan Payment', 'License Purchase', 'Add Member'].includes(info?.type ?? '');

  const columns = [
    { header: 'Item', accessorKey: 'desc' },
    ...(info?.did_detail && Object.keys(info?.did_detail)?.length > 0
      ? [{ header: 'DID No.', accessorKey: 'did_detail' }]
      : []),

    ...(isValidType
      ? [
          { header: 'Plan Type', accessorKey: 'purchase_detail' },
          { header: 'Per Licence Price', accessorKey: 'per_licence_price' },
          { header: 'Licence Count', accessorKey: 'licence_count' },
        ]
      : []),
    { header: 'Buy Price', accessorKey: 'buy_price' },
    !!discountPrice && Number(discountPrice) > 0 && { header: 'Discount', accessorKey: 'discount' },
    { header: 'Total Price', accessorKey: 'total_price' },
  ].filter(Boolean);
  const tableData = [
    {
      desc: info?.desc || 'NA',
      did_detail:
        info?.did_detail && Object.keys(info?.did_detail)?.length > 0
          ? info?.did_detail?.did_number
          : '',
      purchase_detail: info?.purchase_detail?.plan_name ? info?.purchase_detail?.plan_name : 'NA',
      per_licence_price:
        info?.type === 'License Purchase'
          ? `$${parseFloat(info?.amount || 0)}`
          : isDiscount
            ? `$${planDiscountPrice || 0}`
            : `$${planOriginalPrice || 0}`,
      licence_count: info?.total_license ? info?.total_license : '0',
      buy_price: isValidType
        ? info?.tax_detail
          ? `$${parseFloat(info?.tax_detail?.sub_total || 0)}`
          : '$0.0'
        : `$${parseFloat(info?.amount || 0)}`,
      discount: info?.promo_discount ? `$${info?.promo_discount}` : '0',
      total_price: isValidType
        ? info?.tax_detail
          ? `$${parseFloat(info?.tax_detail?.sub_total)}`
          : '$0.0'
        : `$${parseFloat(info?.amount || 0)}`,
      isSummary: false,
    },
    {
      desc: 'Payment Mode:',
      did_number: '',
      purchase_detail: '',
      per_licence_price: '',
      licence_count: '',
      buy_price: '',
      discount: '',
      total_price: info?.mode ? info?.mode : 'NA',
      isSummary: true,
    },
    ...(isValidType
      ? [
          {
            desc: 'Subtotal:',
            did_number: '',
            purchase_detail: '',
            per_licence_price: '',
            licence_count: '',
            buy_price: '',
            discount: '',
            total_price: info?.tax_detail ? `$${parseFloat(info?.tax_detail?.sub_total)}` : '$0.0',
            isSummary: true,
          },
          {
            desc: 'Total Tax:',
            did_number: '',
            purchase_detail: '',
            per_licence_price: '',
            licence_count: '',
            buy_price: '',
            discount: '',
            total_price: info?.tax_detail
              ? `$${parseFloat(info?.tax_detail?.tax_amount)} (${Number(info?.tax_detail?.tax_percentage ?? 0)}%)`
              : '$0.0',
            isSummary: true,
          },
          {
            desc: 'Processing Fee:',
            did_number: '',
            purchase_detail: '',
            per_licence_price: '',
            licence_count: '',
            buy_price: '',
            discount: '',
            total_price: '$0.0',
            isSummary: true,
          },
        ]
      : []),
    {
      desc: 'Total Amount:',
      did_number: '',
      purchase_detail: '',
      per_licence_price: '',
      licence_count: '',
      buy_price: '',
      discount: '',
      total_price: isValidType
        ? info?.tax_detail?.total_amount
          ? `$${parseFloat(info?.tax_detail?.total_amount)}`
          : '$0.0'
        : `$${parseFloat(info?.total_amount || 0)}`,
      isSummary: true,
    },
  ];

  const handleDownload = async () => {
    if (!hiddenRef.current || isExportingPdf) return;

    setIsExportingPdf(true);
    try {
      await downloadAnalyticsSectionAsPdf(hiddenRef.current, 'invoice.pdf');
    } catch (error) {
      console.error('Failed to export invoice PDF:', error);
      handleAlert({ text: 'Unable to generate the invoice PDF. Please try again.', type: 'error' });
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <Dialog open={drawerState} onOpenChange={(val) => setDrawerState(val)}>
      <DialogContent
        className="lg xs:p-0 sm:p-6 max-w-[1200px]"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <div className="flex flex-col gap-3 sm:gap-10 p-4 overflow-auto bg-white" ref={hiddenRef}>
          <div className="flex sm:flex-row flex-col gap-4 sm:gap-6">
            <div className="flex flex-col w-1/2 gap-4">
              <img
                src={
                  mainSiteInfo?.large_logo
                    ? `${getEnv().VITE_API_BASE_URL}/${mainSiteInfo?.large_logo}`
                    : Logo
                }
                alt="Logo"
                className="w-40"
              />
              {mainSiteAddress ? (
                <h6 className="leading-5 text-gray-700 text-sm">{mainSiteAddress}</h6>
              ) : null}
              <p className="text-gray-700 text-sm">Email: {mainSiteInvoiceEmail || 'NA'}</p>
            </div>
            <div className="flex flex-col sm:w-1/2 sm:pl-16">
              <h5 className=" text-gray-900 text-md sm:pb-5 font-bold">Tax Invoice / Receipt</h5>
              <div className="flex flex-col gap-1">
                <div className="flex gap-5">
                  <p className=" text-gray-700 text-sm min-w-[85px]">Invoice #</p>
                  <p className="font-semibold text-gray-900 text-sm">{info?.bill_no || 'NA'}</p>
                </div>
                <div className="flex gap-5">
                  <p className=" text-gray-700 text-sm pb-5 min-w-[85px]">Invoice Date</p>
                  <p className="font-semibold text-gray-900 text-sm">
                    {getFullFormateDate(info?.created_at)}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col border border-gray-200 sm:w-1/2 rounded-xl overflow-hidden">
            <h5 className="bg-gray-100 p-2 font-semibold text-gray-900 text-md">Billing Address</h5>
            <p className="px-2 py-3 text-gray-800 text-sm">{company_info?.address || 'NA'}</p>
          </div>

          <TableManager
            {...{
              columns,
              staticData: tableData,
              showPagination: false,
            }}
          />
        </div>
        <div className="w-full flex justify-end gap-2 px-2 pb-2">
          <Button type="button" variant={'transparent'} onClick={() => setDrawerState(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={'outline'}
            onClick={() => void handleDownload()}
            disabled={isExportingPdf}
          >
            {isExportingPdf ? 'Generating PDF...' : 'Download'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceDetails;
