// import CommonDialerWidget from '@/components/dialer/common-dialer-widget';
export const DIALER_TAB_CONSTANT = {
  SUMMARY: 'Call Activity',
  TRANSCRIPT: 'Transcript',
  NOTES: 'Notes',
  CONTACT_INFO: 'Contact Info',
};

const PowerCampaignRunningDrawer = () => {
  // const callActiveStatus = [
  //   CALL_STATUS_CONST.CONNECTED,
  //   CALL_STATUS_CONST.MUTE,
  //   CALL_STATUS_CONST.HOLD,
  // ];

  // const currentDialerNumber = '';
  // const [activeTab, setActiveTab] = useState<string>(DIALER_TAB_CONSTANT.SUMMARY);
  // const [activeDialerTab, setActiveDialerTab] = useS
  // tate<string>('contact');

  return null;
  // <>
  //   <div className="w-full h-full flex gap-4 overflow-y-auto">
  //     {/* <div className="w-full max-w-[24.325rem] border border-gray-200 rounded-2xl inline-table "> */}
  //     <div className="w-full max-w-[24.325rem] p-3 border border-gray-200 rounded-2xl flex flex-col justify-between gap-2 ">
  //       <div className="w-full h-full  ">
  //         <h6 className="text-primary font-semibold text-xs uppercase mb-1">Outbound Campaign</h6>
  //         <h4 className="text-gray-900 font-semibold text-md mb-1">
  //           Campaign Sep 01, 2025, 01:16PM
  //         </h4>
  //         <DropdownMenuSeparator className="my-2" />
  //         <h4 className="text-gray-900 font-semibold text-sm mb-2">Discriptions</h4>
  //         <div className="w-full max-h-40 overflow-y-auto">
  //           <p className="text-gray-700 font-normal text-sm leading-6 ">
  //             It is a long established fact that a reader will be distracted by the readable
  //             content of a page when looking at its layout. The point of using Lorem Ipsum is that
  //             it has a more-or-less normal distribution of letters, as opposed to using 'Content
  //             here, content here', making it look like readable English. Many desktop publishing
  //             packages and web page editors now use Lorem Ipsum as their default model text, and a
  //             search for 'lorem ipsum' will uncover many web sites still in their infancy.
  //           </p>
  //         </div>
  //         <h4 className="text-gray-900 font-semibold text-sm my-2">Contact Info</h4>
  //         <div className="bg-gray-100 p-3 rounded-lg overflow-y-auto max-h-[calc(100vh-30rem)]">
  //           <div className="w-full flex flex-col gap-2">
  //             <div className="flex flex-col gap-1">
  //               <h6 className="text-gray-700 font-normal text-xs ">Name</h6>
  //               <h4 className="text-gray-900 font-medium text-sm">Pankaj Singh</h4>
  //             </div>
  //             <div className="flex flex-col gap-1">
  //               <h6 className="text-gray-700 font-normal text-xs ">Numbers</h6>
  //               <h4 className="text-gray-900 font-medium text-sm">+91-123456789</h4>
  //             </div>
  //             <div className="flex flex-col gap-1">
  //               <h6 className="text-gray-700 font-normal text-xs ">Comment</h6>
  //               <h4 className="text-gray-900 font-medium text-sm">Notes: test</h4>
  //             </div>
  //           </div>
  //         </div>
  //       </div>
  //       <div className="flex items-center justify-center gap-4">
  //         <span className="w-12 h-12 rounded-full bg-red-500 text-white rotate-[132deg] p-1 flex items-center justify-center cursor-pointer">
  //           <Icon name="PhoneIcon" className="w-6" />
  //         </span>
  //         <span className=" text-gray-700 font-normal w-full max-w-[100px] h-12 px-2 py-1 bg-gray-100 flex items-center justify-center rounded-full text-sm">
  //           00:40
  //         </span>
  //         <span className="w-12 h-12 rounded-full bg-green-500 text-white p-1 flex items-center justify-center cursor-pointer">
  //           <Icon name="PhoneIcon" className="w-6" />
  //         </span>
  //       </div>
  //       {/* <Tabs
  //           value={activeDialerTab}
  //           onValueChange={setActiveDialerTab}
  //           className="flex w-full  p-2  h-full rounded-2xl"
  //         >
  //           <div className="border-b border-gray-200 w-full">
  //             <TabsList className="flex text-sm font-semibold text-center  p-0 rounded-none bg-transparent min-h-10 ">
  //               <TabsTrigger
  //                 className="data-[state=active]:border-b-2 data-[state=active]:border-b-primary data-[state=active]:text-primary border-b-2 px-6  text-gray-700 cursor-pointer h-full rounded-none w-2/4   m-auto relative flex gap-1 bg-transparent font-semibold data-[state=active]:shadow-2xs"
  //                 value={'contact'}
  //               >
  //                 contact
  //               </TabsTrigger>
  //               <TabsTrigger
  //                 className="data-[state=active]:border-b-2 data-[state=active]:border-b-primary data-[state=active]:text-primary border-b-2 px-6  text-gray-700 cursor-pointer h-full rounded-none w-2/4   m-auto relative flex gap-1 bg-transparent font-semibold data-[state=active]:shadow-2xs"
  //                 value={'call outcome'}
  //               >
  //                 call outcome
  //               </TabsTrigger>
  //             </TabsList>
  //           </div>

  //           <TabsContent value={'contact'} className="bg-gray-50 p-3 rounded-lg">
  //             <div className="w-full flex flex-col gap-1">
  //               <div className="flex flex-col gap-1">
  //                 <h6 className="text-gray-500 font-medium text-xs  mb-1">Name</h6>
  //                 <h4 className="text-gray-900 font-semibold text-sm mb-1">Pankaj Singh</h4>
  //               </div>
  //               <div className="flex flex-col gap-1">
  //                 <h6 className="text-gray-500 font-medium text-xs  mb-1">Name</h6>
  //                 <h4 className="text-gray-900 font-semibold text-sm mb-1">Pankaj Singh</h4>
  //               </div>
  //               <div className="flex flex-col gap-1">
  //                 <h6 className="text-gray-500 font-medium text-xs  mb-1">Name</h6>
  //                 <h4 className="text-gray-900 font-semibold text-sm mb-1">Pankaj Singh</h4>
  //               </div>
  //             </div>
  //           </TabsContent>
  //           <TabsContent value={'call outcome'}>call outcome</TabsContent>
  //         </Tabs> */}
  //       {/* <CommonDialerWidget
  //         isShowCrossIcon={false}
  //         isShowExpandIcon={false}
  //         onAddNotes={() => {
  //           setActiveTab(DIALER_TAB_CONSTANT.NOTES);
  //         }}
  //       /> */}
  //     </div>
  //     <Tabs
  //       value={activeTab}
  //       onValueChange={setActiveTab}
  //       className="flex w-[calc(100%-320px)] border border-gray-200 p-2  h-full rounded-2xl"
  //     >
  //       <div className="border-b border-gray-200 w-full">
  //         <TabsList className="flex text-sm font-semibold text-center  p-0 rounded-none bg-transparent min-h-10 ">
  //           <TabsTrigger
  //             className="data-[state=active]:border-b-2 data-[state=active]:border-b-primary data-[state=active]:text-primary border-b-2 px-6  text-gray-700 cursor-pointer h-full rounded-none w-2/4   m-auto relative flex gap-1 bg-transparent font-semibold data-[state=active]:shadow-2xs"
  //             value={DIALER_TAB_CONSTANT.SUMMARY}
  //           >
  //             {DIALER_TAB_CONSTANT.SUMMARY}{' '}
  //           </TabsTrigger>
  //           {/* {activeCallKey && ( */}
  //           {callActiveStatus.includes(terminatedCallDetails?._status) ||
  //           callActiveStatus.includes(activeCallSessionData?._status) ? (
  //             <>
  //               <TabsTrigger
  //                 className="data-[state=active]:border-b-2 data-[state=active]:border-b-primary data-[state=active]:text-primary border-b-2 px-6  text-gray-700 cursor-pointer h-full rounded-none w-2/4   m-auto relative flex gap-1 bg-transparent font-semibold data-[state=active]:shadow-2xs"
  //                 value={DIALER_TAB_CONSTANT.TRANSCRIPT}
  //               >
  //                 {DIALER_TAB_CONSTANT.TRANSCRIPT}{' '}
  //               </TabsTrigger>
  //               {contactInfoState?.[
  //                 activeCallSessionData?._callID || terminatedCallDetails?._callID
  //               ]?._id && (
  //                 <TabsTrigger
  //                   className="data-[state=active]:border-b-2 data-[state=active]:border-b-primary data-[state=active]:text-primary border-b-2 px-6  text-gray-700 cursor-pointer h-full rounded-none w-2/4   m-auto relative flex gap-1 bg-transparent font-semibold data-[state=active]:shadow-2xs"
  //                   value={DIALER_TAB_CONSTANT.NOTES}
  //                 >
  //                   {DIALER_TAB_CONSTANT.NOTES}{' '}
  //                 </TabsTrigger>
  //               )}

  //               {currentDialerNumber && (
  //                 <TabsTrigger
  //                   className="data-[state=active]:border-b-2 data-[state=active]:border-b-primary data-[state=active]:text-primary border-b-2 px-6  text-gray-700 cursor-pointer h-full rounded-none w-2/4   m-auto relative flex gap-1 bg-transparent font-semibold data-[state=active]:shadow-2xs"
  //                   value={DIALER_TAB_CONSTANT.CONTACT_INFO}
  //                 >
  //                   {DIALER_TAB_CONSTANT.CONTACT_INFO}{' '}
  //                 </TabsTrigger>
  //               )}
  //             </>
  //           ) : null}

  //           {/* )} */}
  //         </TabsList>
  //       </div>

  //       <TabsContent value={DIALER_TAB_CONSTANT.SUMMARY}>
  //         <DialerCallLogsWidgets activeCallSessionData={activeCallSessionData} />
  //       </TabsContent>
  //       <TabsContent value={DIALER_TAB_CONSTANT.TRANSCRIPT}>
  //         <TranscriptionWidget activeCallSessionData={activeCallSessionData} />
  //       </TabsContent>
  //       <TabsContent value={DIALER_TAB_CONSTANT.NOTES}>
  //         <NotesWidget
  //           contactId={
  //             contactInfoState?.[activeCallSessionData?._callID || terminatedCallDetails?._callID]
  //               ?._id
  //           }
  //           sipCallId={activeCallSessionData?._callID || terminatedCallDetails?._callID}
  //         />
  //       </TabsContent>
  //       <TabsContent value={DIALER_TAB_CONSTANT.CONTACT_INFO}>
  //         <ContactInfoDialer number={currentDialerNumber} />
  //       </TabsContent>
  //     </Tabs>
  //   </div>
  // </>
};

export default PowerCampaignRunningDrawer;
