import { useEffect, useState } from 'react';
import { Icon } from '@/assets/icons/icon';
import { callRatesSearch } from '@/pages/messenger/constants';
import CustomSelect from '@/components/custom/custom-select';
import { LandlineOutlined, MobileOutlined } from '@/assets/icons';
import { useMutation } from '@tanstack/react-query';
import { callingRatesList } from '@/services/api';
import ReactCountryFlag from 'react-country-flag';
import { useUser } from '@/hooks/use-user';
import { PHONE_KEY } from './constant';
import PhoneInput from 'react-phone-input-2';
import Loader from '@/components/custom/loader';
import { Button } from '@/components/ui/button';
import countryList from '@/lib/countries.json';
import { Mail } from 'lucide-react';

const OutboundRates = () => {
  const { user } = useUser();
  const [search, setSearch]: any = useState({});
  const [selectedCountry, setSelectedCountry]: any = useState({ label: '', value: '' });
  const [phn, setPhn]: any = useState();
  const [ratesData, setRatesData]: any = useState({});
  const { mutate: getRates, isPending } = useMutation({
    mutationKey: ['callingRatesList'],
    mutationFn: callingRatesList,
    onSuccess: (data) => {
      setRatesData(data?.data?.data?.result);
    },
  });
  useEffect(() => {
    setSearch({
      label: 'Country',
      value: 'COUNTRY',
    });
    setSelectedCountry({
      label: user?.countryInfo?.countryname,
      value: user?.countryInfo?.countryname,
      icon: <ReactCountryFlag countryCode={user?.countryInfo?.alpha2code} svg />,
    });

    if (user?.countryInfo?.countryname) {
      const filter = {
        key: 'COUNTRY',
        value: user?.countryInfo?.countryname,
      };
      getRates({ filter });
    }
  }, [user]);

  // const smsMobileRate = ratesData?.sms_rates?.find((rate: any) => rate?.type === 'Mobile');

  const ratesBlock = [
    ...(ratesData?.inbound_call_rates ?? []).map((rate: any) => {
      return {
        number: rate?.dialprefix,
        icon: ratesData?.country?.iso,
        rate: rate?.rate,
        countryName: ratesData?.country?.name || rate?.destination,
        // type:
        //   rate?.type === 'Mobile' ? (
        //     <MobileOutlined className="w-4.5 h-4.5" />
        //   ) : (
        //     <LandlineOutlined className="w-4.5 h-4.5" />
        //   ),
        type: <LandlineOutlined className="w-4.5 h-4.5" />,
        typeName: 'Toll-Free',
        rateType: 'Inbound',
      };
    }),
    ...(ratesData?.outbound_call_rates ?? []).map((rate: any) => {
      return {
        number: rate?.dialprefix,
        icon: ratesData?.country?.iso,
        rate: rate?.rate,
        countryName: ratesData?.country?.name || rate?.destination,
        type:
          rate?.type === 'Mobile' ? (
            <MobileOutlined className="w-4.5 h-4.5" />
          ) : (
            <LandlineOutlined className="w-4.5 h-4.5" />
          ),
        typeName: rate?.type,
        rateType: 'Outbound',
      };
    }),
    ...(ratesData?.sms_rates ?? []).map((rate: any) => {
      return {
        number: rate?.dialprefix,
        icon: ratesData?.country?.iso,
        rate: rate?.rate,
        countryName: ratesData?.country?.name || rate?.destination,
        type: <Mail className="w-4.5 h-4.5" />,
        typeName: rate?.type || 'SMS',
        rateType: 'SMS',
      };
    }),
    // ...(smsMobileRate
    //   ? [
    //       {
    //         number: smsMobileRate?.dialprefix,
    //         icon: ratesData?.country?.iso,
    //         rate: smsMobileRate?.rate,
    //         countryName: ratesData?.country?.name || smsMobileRate?.destination,
    //         type: <LetterLine className="w-5 h-5" />,
    //         typeName: 'SMS',
    //       },
    //     ]
    //   : []),
  ];

  const handleSubmit = () => {
    if (!search?.value || phn === '') return;
    const filter = {
      key: search?.value,
      value: search?.value === 'COUNTRY' ? selectedCountry?.value : phn,
    };
    getRates({ filter });
  };

  console.log('ratesBlock', ratesBlock);
  return (
    <section className="w-full overflow-x-auto overflow-y-hidden">
      <div className="flex items-center justify-between p-3 border-b border-gray-200 min-h-[65px] bg-white">
        <div>
          <p className="text-gray-900 font-semibold text-lg flex items-center gap-1">
            SMS/Calling Rates
            <div className="-rotate-90 text-gray-800">
              <Icon name="ChevronIcon" className="w-5 h-5" />
            </div>
            <span className="text-primary text-md">Outbound Rates</span>
          </p>
          <p className="text-gray-500 text-xs">
            What each destination costs to call or text, per minute or per message.
          </p>
        </div>
      </div>
      <div className="w-full flex justify-center gap-3 p-3">
        <div className="md:w-2/3 w-full">
          <div className="flex flex-col  border border-gray-200 rounded-lg bg-white p-5 w-full gap-3  h-[calc(100vh-10rem)] overflow-y-auto">
            <div className="w-full ">
              <p className="text-gray-900 font-semibold text-md mb-2">Search By</p>
              <div className="w-full flex gap-3  flex-col sm:flex-row">
                <CustomSelect
                  className=""
                  options={callRatesSearch}
                  value={search}
                  placeholder="Search By "
                  handleChange={(e) => setSearch(e)}
                />
                {search?.value === PHONE_KEY ? (
                  <div className="flex w-full">
                    <PhoneInput
                      country={user?.countryInfo?.alpha2code?.toLowerCase()}
                      value={phn}
                      onChange={setPhn}
                    />
                  </div>
                ) : (
                  <CustomSelect
                    options={countryList?.map((country) => ({
                      label: country?.name || '',
                      value: country?.name || '',
                      icon: <ReactCountryFlag countryCode={country?.isoCode} svg />,
                    }))}
                    handleChange={(value) => setSelectedCountry(value)}
                    value={selectedCountry || ''}
                    placeholder={'Select Country'}
                  />
                )}
                <Button disabled={isPending} variant={'outline'} onClick={handleSubmit}>
                  {isPending ? <Loader variant="blue" /> : 'Submit'}
                </Button>
              </div>
            </div>
            {isPending ? (
              <div className="flex justify-center items-center h-[calc(100vh-16.5rem)] w-full">
                <Loader variant="blue" />
              </div>
            ) : ratesData && Object.keys(ratesData)?.length > 0 ? (
              <div className="w-full h-[calc(100vh-16.5rem)] overflow-y-auto">
                <div className="w-full grid sm:grid-cols-3 gap-3">
                  {ratesBlock?.map((e: any) => (
                    <div
                      key={e?.countryName}
                      className="w-full rounded-lg bg-white border border-gray-200 px-4 py-8 h-full"
                    >
                      <div className="flex flex-col items-center justify-center gap-2 w-full">
                        <ReactCountryFlag
                          countryCode={e?.icon}
                          svg
                          style={{ width: '100px', height: '100px' }}
                          className="rounded-full border w-16 h-16 mb-2 object-cover"
                        />
                        <p className="flex items-center gap-2 text-sm text-gray-500">
                          {e?.countryName}
                        </p>
                        <div className="flex items-center gap-1">
                          <p className="flex items-center gap-2 text-gray-500">{e?.type}</p>
                          <p className="text-sm">{e?.typeName}</p>
                        </div>
                        <p className="text-sm">
                          Rates: <strong>${e?.rate}</strong>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col justify-center items-center gap-1 py-5 h-full w-full">
                <p className="text-sm text-gray-700">
                  {'No matching records were found for the selected country or phone number.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default OutboundRates;
