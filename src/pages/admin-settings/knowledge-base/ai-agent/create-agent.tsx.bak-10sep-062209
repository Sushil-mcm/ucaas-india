import { AIChatIcon, Chat } from '@/assets/icons';
import { Icon } from '@/assets/icons/icon';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import UploadPdfModal from '../all-knowledge-base/modals/upload-pdf-modal';
import {
  ArrowRight,
  Check,
  ChevronLeftIcon,
  CircleCheckIcon,
  Database,
  FileText,
  Globe,
  Grid2X2,
  MicIcon,
  PlusIcon,
  TypeIcon,
  Upload,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { getAIAgentToken, siteCrawl, userAddContent, userIngestURL } from '@/services/api';
import { handleAlert } from '@/lib/utils';
import Loader from '@/components/custom/loader';
import { toast } from 'react-toastify';
import { useOrganization } from '@/hooks/use-organisation';

type InstantStep = 'none' | 'website' | 'pdf' | 'custom-content';
type UrlModalStep = 'input' | 'discovering' | 'discovered';
type SummaryTab = 'descriptive' | 'faq';

const normalizeSearchValue = (value: string) =>
  value
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const isSubsequenceMatch = (source: string, query: string) => {
  if (!query) return true;

  let queryIndex = 0;
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === query[queryIndex]) {
      queryIndex += 1;
      if (queryIndex === query.length) {
        return true;
      }
    }
  }

  return false;
};

const getLevenshteinDistance = (source: string, target: string) => {
  if (source === target) return 0;
  if (!source.length) return target.length;
  if (!target.length) return source.length;

  const previous = Array.from({ length: target.length + 1 }, (_, index) => index);
  const current = new Array(target.length + 1).fill(0);

  for (let row = 1; row <= source.length; row += 1) {
    current[0] = row;
    for (let column = 1; column <= target.length; column += 1) {
      const substitutionCost = source[row - 1] === target[column - 1] ? 0 : 1;
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + substitutionCost,
      );
    }

    for (let column = 0; column <= target.length; column += 1) {
      previous[column] = current[column];
    }
  }

  return previous[target.length];
};

const getFuzzyScore = (link: string, query: string) => {
  const normalizedQuery = normalizeSearchValue(query);
  const normalizedLink = normalizeSearchValue(link);

  if (!normalizedQuery) return 1;
  if (!normalizedLink) return -1;

  if (normalizedLink.includes(normalizedQuery)) {
    return 1000 - normalizedLink.indexOf(normalizedQuery);
  }

  const queryTokens = normalizedQuery.split(' ').filter(Boolean);
  const linkTokens = normalizedLink.split(' ').filter(Boolean);
  const tokenHits = queryTokens.filter((token) =>
    linkTokens.some((linkToken) => linkToken.includes(token)),
  ).length;

  if (tokenHits === queryTokens.length && tokenHits > 0) {
    return 700 + tokenHits * 10;
  }

  const condensedLink = normalizedLink.replace(/\s+/g, '');
  const condensedQuery = normalizedQuery.replace(/\s+/g, '');
  if (isSubsequenceMatch(condensedLink, condensedQuery)) {
    return 450;
  }

  if (condensedQuery.length >= 3) {
    const maxDistance = condensedQuery.length <= 4 ? 1 : 2;
    const closestDistance = linkTokens.reduce(
      (minimum, token) => Math.min(minimum, getLevenshteinDistance(token, condensedQuery)),
      Number.POSITIVE_INFINITY,
    );
    if (closestDistance <= maxDistance) {
      return 250 - closestDistance * 25;
    }
  }

  return -1;
};

function CreateAgent() {
  const navigate = useNavigate();
  const { mainSiteInfo } = useOrganization();
  const discoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [active] = useState(() => localStorage.getItem('activeTab') || 'chat');

  const [instantStep, setInstantStep] = useState<InstantStep>('none');
  const [hasWebsite, setHasWebsite] = useState(true);
  const [hasPdf, setHasPdf] = useState(true);
  const [isUploadPdfModalOpen, setIsUploadPdfModalOpen] = useState(false);
  const [customContent, setCustomContent] = useState('');
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [summaryTab, setSummaryTab] = useState<SummaryTab>('descriptive');

  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [urlModalStep, setUrlModalStep] = useState<UrlModalStep>('input');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [discoveredLinks, setDiscoveredLinks] = useState<string[]>([]);
  const [selectedLinks, setSelectedLinks] = useState<string[]>([]);
  const [linkSearchTerm, setLinkSearchTerm] = useState('');

  useEffect(() => {
    localStorage.setItem('activeTab', active);
  }, [active]);

  useEffect(() => {
    return () => {
      if (discoverTimeoutRef.current) {
        clearTimeout(discoverTimeoutRef.current);
      }
    };
  }, []);

  const closeUrlModal = () => {
    if (discoverTimeoutRef.current) {
      clearTimeout(discoverTimeoutRef.current);
    }
    setIsUrlModalOpen(false);
    setUrlModalStep('input');
    setUrlError('');
    setWebsiteUrl('');
    setDiscoveredLinks([]);
    setSelectedLinks([]);
    setLinkSearchTerm('');
  };

  const goToConfigurePage = (payload: Record<string, any>) => {
    navigate('/admin-settings/knowledge/create-agent', {
      state: {
        fromTab: 'knowledge',
        agentData: {
          agentType: 'chat',
          buildType: 'instant',
          ...payload,
        },
      },
    });
  };

  const handleHeaderBack = () => {
    if (isUrlModalOpen) {
      closeUrlModal();
      return;
    }

    if (isUploadPdfModalOpen) {
      setIsUploadPdfModalOpen(false);
      return;
    }

    if (isSummaryModalOpen) {
      setIsSummaryModalOpen(false);
      return;
    }

    if (instantStep === 'custom-content') {
      setInstantStep('pdf');
      return;
    }

    if (instantStep === 'pdf') {
      setInstantStep('website');
      return;
    }

    if (instantStep === 'website') {
      setInstantStep('none');
      return;
    }

    navigate(-1);
  };

  const openUrlModal = () => {
    setIsUrlModalOpen(true);
    setUrlModalStep('input');
    setUrlError('');
  };

  const { mutate: crawlSite, isPending: isDiscovering } = useMutation({
    mutationFn: siteCrawl,
    onSuccess: (response: any) => {
      const links = response?.data || [];
      setDiscoveredLinks(links);
      setSelectedLinks(links.slice(0, 5));
      setLinkSearchTerm('');
      setUrlModalStep('discovered');
    },
    onError: () => {
      setUrlError('Failed to discover links. Please try again.');
      setUrlModalStep('input');
    },
  });

  const handleDiscoverLinks = () => {
    setUrlError('');
    let normalizedUrl = websiteUrl.trim();

    if (!normalizedUrl) {
      setUrlError('URL is required');
      return;
    }

    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    setWebsiteUrl(normalizedUrl);
    setUrlModalStep('discovering');
    crawlSite({ site_url: normalizedUrl });
  };

  const { mutateAsync: mutateGetToken, isPending: isPendingGetToken } = useMutation({
    mutationFn: getAIAgentToken,
  });

  const { mutate: mutateIngest, isPending: isPendingIngest } = useMutation({
    mutationFn: userIngestURL,
    onSuccess: (data) => {
      handleAlert({
        text: data?.data?.data?.message || data?.data?.error || 'URL added successfully.',
        type: 'success',
      });
      goToConfigurePage({
        hasWebsite: true,
        websiteUrl,
        selectedLinks,
        ingestionIdCreated: data?.data?.ingestionId,
      });
    },
    onError: (data: any) => {
      handleAlert({
        text: data?.response?.data?.error || 'Failed to ingest URLs. Please try again.',
        type: 'error',
      });
    },
  });
  const { mutate: mutateAddContent, isPending: isPendingAddContent } = useMutation({
    mutationFn: userAddContent,
    onSuccess: (data) => {
      handleAlert({
        text: data?.data?.data?.message || 'Content added successfully.',
        type: 'success',
      });
      goToConfigurePage({
        hasWebsite: false,
        hasPdf: false,
        customContent,
        sourceType: 'custom-content',
        ingestionIdCreated: data?.data?.ingestionId,
      });
    },
    onError: (data: any) => {
      handleAlert({
        text: data?.response?.data?.error || 'Failed to add content. Please try again.',
        type: 'error',
      });
    },
  });

  const extractSiteName = (url: string) => {
    try {
      const hostname = new URL(url).hostname;
      const name = hostname.replace('www.', '').split('.')[0];
      return name.charAt(0).toUpperCase() + name.slice(1);
    } catch {
      return 'Website';
    }
  };

  const onToggleLink = (checked: boolean, link: string) => {
    if (checked) {
      if (selectedLinks.length >= 5) {
        toast.warning('You can only select up to 5 links.');
        return;
      }
      setSelectedLinks((prev) => Array.from(new Set([...prev, link])));
    } else {
      setSelectedLinks((prev) => prev.filter((item) => item !== link));
    }
  };

  const filteredDiscoveredLinks = useMemo(() => {
    if (!linkSearchTerm.trim()) {
      return discoveredLinks;
    }

    return discoveredLinks
      .map((link) => ({
        link,
        score: getFuzzyScore(link, linkSearchTerm),
      }))
      .filter((item) => item.score >= 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.link);
  }, [discoveredLinks, linkSearchTerm]);

  const handleCrawlSelected = async () => {
    if (selectedLinks.length === 0) return;

    try {
      const response = await mutateGetToken();
      const tokenId = response?.data?.data?.result?.tokenId;

      if (tokenId) {
        const payload = {
          name: extractSiteName(websiteUrl),
          urls: selectedLinks,
          scope: 'global',
          token: tokenId,
        };
        mutateIngest(payload);
      } else {
        throw new Error('Failed to get AI token');
      }
    } catch (error: any) {
      handleAlert({
        text:
          error?.response?.data?.error ||
          'An error occurred during verification. Please try again.',
        type: 'error',
      });
    }
  };

  const handleAnalyzeCustomContent = () => {
    setSummaryTab('descriptive');
    setIsSummaryModalOpen(true);
  };

  const handleCreateDefaultAgent = async () => {
    try {
      const response = await mutateGetToken();
      const tokenId = response?.data?.data?.result?.tokenId;

      if (tokenId) {
        const payload = {
          name: 'Custom Content',
          text: customContent,
          scope: 'global',
          token: tokenId,
        };
        mutateAddContent(payload);
      } else {
        throw new Error('Failed to get AI token');
      }
    } catch (error: any) {
      handleAlert({
        text:
          error?.response?.data?.error ||
          'An error occurred during verification. Please try again.',
        type: 'error',
      });
    }
  };

  const normalizedCustomContent = customContent.trim();
  const summaryParagraph = normalizedCustomContent
    ? normalizedCustomContent.slice(0, 320)
    : 'Use your provided context to generate a concise business profile for the AI agent.';
  const highlightLines = normalizedCustomContent
    ? normalizedCustomContent
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 4)
    : [
        'Create strong system instructions for the assistant.',
        'Define support boundaries and escalation rules.',
        'Add factual business details and policies.',
      ];
  const faqItems = normalizedCustomContent
    ? [
        {
          q: `What integrations does ${mainSiteInfo?.domain === 'mycountrymobile.com' ? 'MyCountryMobile' : 'Acepeak'} support?`,
          a:
            highlightLines[0] ||
            `${mainSiteInfo?.domain === 'mycountrymobile.com' ? 'MyCountryMobile' : 'Acepeak'} seamlessly integrates with popular CRM, Helpdesk, and communication tools including Salesforce, Zendesk, Slack, and WhatsApp.`,
        },
        {
          q: ' Is there a free trial available?',
          a: 'Yes, we offer a 14-day free trial for all new users to explore our premium AI voice and chatbot features.',
        },
        {
          q: 'Can I use my own phone numbers?',
          a: `Absolutely. You can port your existing numbers or purchase new local and toll-free numbers directly through the ${mainSiteInfo?.domain === 'mycountrymobile.com' ? 'MyCountryMobile' : 'Acepeak'} dashboard..`,
        },
      ]
    : [
        {
          q: 'What is the primary purpose of this AI agent?',
          a: 'Assist users with accurate responses from your custom content.',
        },
        {
          q: 'What should the agent avoid?',
          a: 'Avoid unsupported claims and escalate when context is insufficient.',
        },
        {
          q: 'How will responses stay consistent?',
          a: 'The agent will follow the provided content as its knowledge baseline.',
        },
      ];

  return (
    <section className="w-full flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row items-center justify-between p-3 border-b border-[rgba(225,200,165,0.9)] min-h-[65px] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px]">
        <div className="text-[#2E2D35] font-semibold text-lg flex items-center gap-2">
          <div className="flex items-center gap-1">
            AI Tools
            <div className="-rotate-90 text-[#2E2D35]">
              <Icon name="ChevronIcon" className="w-5 h-5" />
            </div>
            <span className="text-primary text-md">Chat Agents</span>
          </div>
        </div>
        <Button type="button" variant="outline" onClick={handleHeaderBack}>
          Back
        </Button>
      </div>

      <div className="w-full h-full p-3 flex flex-col gap-3">
        {instantStep === 'none' && (
          <div className="w-full lg:max-w-[75%] xxl:max-w-[60%] h-full mx-auto flex items-center justify-center flex-col gap-3">
            <h4 className="text-[#2E2D35] font-semibold text-lg">
              How would you like to build your Chat AI agent?
            </h4>
            <p className="text-[#9A948F] text-sm text-center max-w-150">
              Select an initial framework for your AI assistant. You can completely customize its
              behavior, knowledge, and integrations in subsequent steps.
            </p>

            <div className="flex gap-4 w-full">
              <div
                className="flex flex-col gap-3 items-start justify-center bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] rounded-xl px-6  border border-[rgba(225,200,165,0.9)] cursor-pointer w-full hover:border-primary transition-colors duration-200 group"
                onClick={() => {
                  setHasWebsite(true);
                  setInstantStep('website');
                }}
              >
                <span className="p-1 w-12 h-12 flex items-center justify-center bg-ucass-primary-200 text-primary rounded-md group-hover:bg-primary group-hover:text-white">
                  <AIChatIcon className="w-6 h-6" />
                </span>
                <h4 className="text-[#2E2D35] font-semibold text-md">Instant Agent</h4>
                <p className="text-[#9A948F] font-normal text-sm">
                  The most efficient way to launch. Deploys an AI assistant pre-configured with
                  Acepeak&apos;s optimal conversational standards, smart fallback handling, and core
                  capabilities ready out-of-the-box.
                </p>
                <div className="px-2 py-1 bg-ucass-primary-200 text-primary rounded-md uppercase text-[11px] mt-2 group-hover:bg-ucass-primary-200 group-hover:text-primary">
                  Recommended
                </div>
              </div>

              {active === 'chat' ? (
                <div className="w-full flex flex-col gap-3 max-w-80">
                  <div
                    className="flex flex-col gap-3 items-start justify-center bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] rounded-xl p-4 py-6 border border-[rgba(225,200,165,0.9)] cursor-pointer w-full hover:border-primary transition-colors duration-200 group"
                    onClick={() =>
                      navigate('/admin-settings/knowledge/create-agent', {
                        state: { fromTab: 'knowledge', agentData: { agentType: 'chat' } },
                      })
                    }
                  >
                    <span className="p-1 w-12 h-12 flex items-center justify-center bg-ucass-primary-200 text-primary rounded-md">
                      <Chat className="w-6 h-6" />
                    </span>
                    <h4 className="text-[#2E2D35] font-semibold text-md text-center">
                      Start From Scratch
                    </h4>
                    <p className="text-[#9A948F] font-normal text-sm">
                      Design a custom AI agent from the ground up with precise behavioral controls.
                    </p>
                  </div>

                  <div
                    className="flex flex-col gap-3 items-start justify-center bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] rounded-xl p-4 py-6 border border-[rgba(225,200,165,0.9)] cursor-pointer w-full hover:border-primary transition-colors duration-200 group"
                    onClick={() =>
                      navigate('/admin-settings/knowledge/browse-templates', {
                        state: { fromTab: 'knowledge', agentType: 'chat' },
                      })
                    }
                  >
                    <span className="p-1 w-12 h-12 flex items-center justify-center bg-ucass-primary-200 text-primary rounded-md">
                      <Grid2X2 className="w-6 h-6" />
                    </span>
                    <h4 className="text-[#2E2D35] font-semibold text-md">Use a Template</h4>
                    <p className="text-[#9A948F] font-normal text-sm">
                      Clone an industry-specific blueprint tailored for specialized support
                      scenarios.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="w-full flex items-center justify-center gap-3">
                  <div
                    className="flex flex-col gap-3 items-center justify-center bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] rounded-xl p-4 border border-[rgba(225,200,165,0.9)] w-1/3 min-h-56 cursor-pointer hover:border-primary transition-colors duration-200 group"
                    onClick={() =>
                      navigate('/admin-settings/knowledge/create-agent', {
                        state: { fromTab: 'knowledge', agentData: { agentType: 'data' } },
                      })
                    }
                  >
                    <span className="p-1 w-12 h-12 flex items-center justify-center bg-ucass-primary-200 text-primary rounded-md">
                      <MicIcon className="w-5 h-5" />
                    </span>
                    <h4 className="text-[#2E2D35] font-semibold text-md text-center">
                      Start from Scratch
                    </h4>
                    <p className="text-[#9A948F] font-normal text-sm text-center">
                      Build your AI Agent from the ground up
                    </p>
                  </div>

                  <div
                    className="flex flex-col gap-3 items-center justify-center bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] rounded-xl p-4 border border-[rgba(225,200,165,0.9)] w-1/3 min-h-56 cursor-pointer hover:border-primary transition-colors duration-200 group"
                    onClick={() =>
                      navigate('/admin-settings/knowledge/browse-templates', {
                        state: { fromTab: 'knowledge', agentType: 'data' },
                      })
                    }
                  >
                    <span className="p-1 w-12 h-12 flex items-center justify-center bg-ucass-primary-200 text-primary rounded-md">
                      <Grid2X2 className="w-6 h-6" />
                    </span>
                    <h4 className="text-[#2E2D35] font-semibold text-md text-center">
                      Browse our Templates
                    </h4>
                    <p className="text-[#9A948F] font-normal text-sm text-center">
                      Get inspired by our templates to get started
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {instantStep === 'website' && (
          <div className="w-full h-full mx-auto max-w-[75%] flex items-center justify-center">
            <div className="w-full max-w-225 flex flex-col items-center justify-center gap-4">
              <div className="w-18 h-18 rounded-2xl border border-primary/20 bg-ucass-primary-200 flex items-center justify-center text-primary">
                <Globe className="w-8 h-8" />
              </div>
              <h3 className="text-[#2E2D35] text-xl font-semibold text-center">
                Accelerate Training with Your Website
              </h3>
              <p className="text-[#9A948F] text-center text-sm max-w-187.5">
                Provide your domain, and our system will securely scan your public pages to
                instantly build a comprehensive knowledge base, saving you hours of manual data
                entry.
              </p>
              <h4 className="text-[#2E2D35] text-xl font-semibold text-center">
                Do you have a Website?
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-175 mt-3">
                <button
                  type="button"
                  onClick={() => {
                    setHasWebsite(true);
                    openUrlModal();
                  }}
                  className={`relative min-h-62 rounded-2xl border p-8 flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors ${
                    hasWebsite
                      ? 'border-primary bg-ucass-primary-200/40'
                      : 'border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] hover:border-[rgba(225,200,165,0.9)]'
                  }`}
                >
                  <span
                    className={`absolute top-4 right-4 w-5 h-5 rounded-full border flex items-center justify-center ${
                      hasWebsite ? 'border-primary text-primary' : 'border-[#EEE7DD] text-gray-300'
                    }`}
                  >
                    {hasWebsite && <Check className="w-3 h-3" />}
                  </span>
                  <span
                    className={`w-14 h-14 rounded-full flex items-center justify-center ${
                      hasWebsite ? 'bg-primary text-white' : 'bg-[#FBE2C8]/40 text-[#9A948F]'
                    }`}
                  >
                    <Check className="w-7 h-7" />
                  </span>
                  <p className="text-[#2E2D35] text-base text-center font-medium">
                    Yes, I have a website, scan my website
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setHasWebsite(false);
                    setInstantStep('pdf');
                  }}
                  className={`relative min-h-[250px] rounded-2xl border p-8 flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors ${
                    !hasWebsite
                      ? 'border-primary bg-ucass-primary-200/40'
                      : 'border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] hover:border-[rgba(225,200,165,0.9)]'
                  }`}
                >
                  <span
                    className={`absolute top-4 right-4 w-5 h-5 rounded-full border flex items-center justify-center ${
                      !hasWebsite ? 'border-primary text-primary' : 'border-[#EEE7DD] text-gray-300'
                    }`}
                  >
                    {!hasWebsite && <Check className="w-3 h-3" />}
                  </span>
                  <span
                    className={`w-14 h-14 rounded-full flex items-center justify-center ${
                      !hasWebsite ? 'bg-primary text-white' : 'bg-[#FBE2C8]/40 text-[#9A948F]'
                    }`}
                  >
                    <X className="w-7 h-7" />
                  </span>
                  <p className="text-[#2E2D35] text-base  text-center font-medium">
                    No, I don&apos;t have a website.
                  </p>
                </button>
              </div>

              <div className="w-full max-w-187.5 flex justify-end gap-2">
                <Button type="button" variant="transparent" onClick={() => setInstantStep('none')}>
                  <ChevronLeftIcon width={18} height={18} /> Back
                </Button>
              </div>
            </div>
          </div>
        )}

        {instantStep === 'pdf' && (
          <div className="w-full h-full mx-auto max-w-[75%] flex items-center justify-center">
            <div className="w-full max-w-225 flex flex-col items-center justify-center gap-4">
              <div className="w-18 h-18 rounded-2xl border border-primary/20 bg-ucass-primary-200 flex items-center justify-center text-primary">
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-[#2E2D35] text-xl font-semibold text-center">
                Provide Training Data via PDF
              </h3>
              <p className="text-[#9A948F] text-center text-sm  max-w-125">
                Extract structured data from operational manuals, product guides, and company policy
                documents.
              </p>
              <h4 className="text-[#2E2D35] text-xl  font-semibold text-center">
                Do you have a PDF to use as for knowledge base?
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-175 mt-3">
                <button
                  type="button"
                  onClick={() => {
                    setHasPdf(true);
                    setIsUploadPdfModalOpen(true);
                  }}
                  className={`relative min-h-[250px] rounded-2xl border p-8 flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors ${
                    hasPdf
                      ? 'border-primary bg-ucass-primary-200/40'
                      : 'border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] hover:border-[rgba(225,200,165,0.9)]'
                  }`}
                >
                  <span
                    className={`absolute top-4 right-4 w-5 h-5 rounded-full border flex items-center justify-center ${
                      hasPdf ? 'border-primary text-primary' : 'border-[#EEE7DD] text-gray-300'
                    }`}
                  >
                    {hasPdf && <Check className="w-3 h-3" />}
                  </span>
                  <span
                    className={`w-14 h-14 rounded-full flex items-center justify-center ${
                      hasPdf ? 'bg-primary text-white' : 'bg-[#FBE2C8]/40 text-[#9A948F]'
                    }`}
                  >
                    <Check className="w-7 h-7" />
                  </span>
                  <p className="text-[#2E2D35] text-base text-center font-medium">
                    Yes, I have a PDF
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setHasPdf(false);
                    setInstantStep('custom-content');
                  }}
                  className={`relative min-h-[250px] rounded-2xl border p-8 flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors ${
                    !hasPdf
                      ? 'border-primary bg-ucass-primary-200/40'
                      : 'border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] hover:border-[rgba(225,200,165,0.9)]'
                  }`}
                >
                  <span
                    className={`absolute top-4 right-4 w-5 h-5 rounded-full border flex items-center justify-center ${
                      !hasPdf ? 'border-primary text-primary' : 'border-[#EEE7DD] text-gray-300'
                    }`}
                  >
                    {!hasPdf && <Check className="w-3 h-3" />}
                  </span>
                  <span
                    className={`w-14 h-14 rounded-full flex items-center justify-center ${
                      !hasPdf ? 'bg-primary text-white' : 'bg-[#FBE2C8]/40 text-[#9A948F]'
                    }`}
                  >
                    <X className="w-7 h-7" />
                  </span>
                  <p className="text-[#2E2D35] text-base text-center font-medium">
                    No, I don&apos;t have a PDF.
                  </p>
                </button>
              </div>

              <div className="w-full max-w-187.5 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="transparent"
                  onClick={() => setInstantStep('website')}
                >
                  <ChevronLeftIcon width={18} height={18} /> Back
                </Button>
              </div>
            </div>
          </div>
        )}

        {instantStep === 'custom-content' && (
          <div className="w-full h-full mx-auto max-w-[90%] flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl border border-primary/20 bg-ucass-primary-200 flex items-center justify-center text-primary shrink-0">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-[#2E2D35] text-xl font-semibold">Create Custom Content</h3>
                <p className="text-[#9A948F] text-sm mt-1">
                  Manually draft the foundational knowledge for your AI agent. Add FAQs, brand
                  guidelines, or any instructions.
                </p>
              </div>
            </div>

            <div className="w-full bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] rounded-2xl border border-[rgba(225,200,165,0.9)] min-h-[calc(100vh-321px)] max-h-[calc(100vh-321px)] overflow-hidden flex flex-col">
              <div className="px-5 py-3 border-b border-[#EEE7DD] text-[#2E2D35] text-sm font-semibold bg-[#FBE2C8]/45 flex items-center gap-2">
                <TypeIcon width={16} height={16} /> CONTENT EDITOR
              </div>
              <textarea
                value={customContent}
                onChange={(e) => setCustomContent(e?.target?.value || '')}
                className="w-full flex-1 p-6 text-base text-[#2E2D35] outline-none resize-none"
                placeholder='Type or paste your content here... E.g. "Our company policy states that..."'
              />
            </div>

            <div className="w-full flex items-center justify-between">
              <Button
                className="min-w-24"
                type="button"
                variant="outline"
                onClick={() => setInstantStep('pdf')}
              >
                <ChevronLeftIcon width={18} height={18} /> Back
              </Button>
              <Button
                type="button"
                className="min-w-70"
                disabled={!customContent.trim()}
                onClick={handleAnalyzeCustomContent}
              >
                Analyze & Continue
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {isUploadPdfModalOpen && (
        <UploadPdfModal
          origin="create_agent"
          modalState={isUploadPdfModalOpen}
          setModalState={(value) => setIsUploadPdfModalOpen(value)}
          goToConfigurePage={goToConfigurePage}
        />
      )}

      {isSummaryModalOpen && (
        <Dialog
          open={isSummaryModalOpen}
          onOpenChange={(value) => {
            if (!value) {
              setIsSummaryModalOpen(false);
            }
          }}
        >
          <DialogContent
            className="w-[95vw] max-w-[1100px] h-[90vh] p-0 overflow-hidden border-[#EEE7DD]"
            showCloseButton={false}
          >
            <div className="w-full h-full flex flex-col bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px]">
              <div className="px-6 py-4 border-b border-[#EEE7DD]">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-lg text-[#2E2D35] font-semibold">Curated Content Summary</h4>
                    <p className="text-sm text-[#9A948F] mt-1">
                      Review the synthesized knowledge and highlighted facts extracted from your
                      provided source.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-[#9A948F] hover:text-[#9A948F] cursor-pointer"
                    onClick={() => setIsSummaryModalOpen(false)}
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="px-6 py-4 flex-1 overflow-y-auto bg-[#FBE2C8]/45 max-h-[calc(100vh-230px)] overflow-auto">
                <div className="w-fit mx-auto mb-5 border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] rounded-xl p-1 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSummaryTab('descriptive')}
                    className={`px-6 py-2 rounded-lg text-sm md:text-base ${
                      summaryTab === 'descriptive'
                        ? 'border border-gray-900 text-[#2E2D35]'
                        : 'text-[#9A948F]'
                    }`}
                  >
                    Descriptive
                  </button>
                  <button
                    type="button"
                    onClick={() => setSummaryTab('faq')}
                    className={`px-6 py-2 rounded-lg text-sm md:text-base ${
                      summaryTab === 'faq'
                        ? 'border border-gray-900 text-[#2E2D35]'
                        : 'text-[#9A948F]'
                    }`}
                  >
                    FAQ View
                  </button>
                </div>

                {summaryTab === 'descriptive' ? (
                  <div className="bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] rounded-2xl border border-[rgba(225,200,165,0.9)] p-6">
                    <h5 className="text-xl font-semibold text-[#2E2D35] mb-1">Business Overview</h5>
                    <p className="text-base  text-[#9A948F] leading-7">{summaryParagraph}</p>

                    <h6 className="text-sm font-medium text-[#2E2D35] mt-6 min-h-7">
                      Key Extracted Highlights
                    </h6>
                    <div className="space-y-3 border-t border-[#EEE7DD] pt-4">
                      {highlightLines.map((line, index) => (
                        <div key={`${line}-${index}`} className="flex gap-3 text-sm  text-[#2E2D35]">
                          <span className="text-primary mt-0.5">*</span>
                          <span>{line}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] rounded-2xl border border-[rgba(225,200,165,0.9)] p-6 space-y-5 ">
                    <div className="flex justify-between items-center gap-4 w-full mb-8">
                      <h6 className="text-xl font-bold text-[#2E2D35]">Learned Knowledge (FAQs)</h6>
                      <Button type="button" variant="outline">
                        <PlusIcon width={18} height={18} /> Add Manual Entry
                      </Button>
                    </div>
                    {faqItems.map((item, index) => (
                      <div className="flex justify-between items-start gap-4 border-t border-[#EEE7DD] pt-4">
                        <div key={`${item.q}-${index}`} className="w-full flex flex-col">
                          <h6 className="text-base  text-[#2E2D35] font-semibold">{item.q}</h6>
                          <p className="text-sm text-[#9A948F] mt-2">{item.a}</p>
                        </div>
                        <div className="px-3 py-1 bg-ucass-primary-200 rounded-sm text-[11px] text-primary whitespace-nowrap font-medium">
                          SOURCE: INTEGRATIONS PAGE
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="w-full rounded-xl border border-green-200 bg-green-50 p-4 flex items-start gap-3 mt-4">
                  <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-green-100 text-green-900">
                    <CircleCheckIcon />
                  </div>

                  <div>
                    <h3 className="text-green-900 font-semibold text-base">Knowledge Ready</h3>
                    <p className="text-green-800 text-sm mt-1 leading-relaxed">
                      Successfully processed custom content. This information is formatted and ready
                      to be connected to your active AI Agents.
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-[#EEE7DD] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] flex items-center justify-between">
                <Button
                  type="button"
                  className="min-w-24"
                  variant="outline"
                  onClick={() => setIsSummaryModalOpen(false)}
                >
                  <ChevronLeftIcon width={18} height={18} /> Back
                </Button>
                <Button
                  type="button"
                  disabled={isPendingAddContent || isPendingGetToken}
                  className="min-w-[320px]"
                  onClick={handleCreateDefaultAgent}
                >
                  {isPendingAddContent || isPendingGetToken ? (
                    <Loader variant="blue" />
                  ) : (
                    'Create Default Chat AI agent'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {isUrlModalOpen && (
        <Dialog open={isUrlModalOpen} onOpenChange={(val) => (!val ? closeUrlModal() : null)}>
          <DialogContent
            className="w-[600px] max-w-[95vw] p-0 overflow-hidden border-[#EEE7DD]"
            showCloseButton={false}
          >
            {urlModalStep === 'input' && (
              <div className="p-6 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-lg text-[#2E2D35] font-semibold">Get from URL</h4>
                    <p className="text-sm text-[#9A948F] mt-1">
                      Enter a web address to automatically extract conversational knowledge.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-[#9A948F] hover:text-[#9A948F] cursor-pointer"
                    onClick={closeUrlModal}
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <Input
                  label="URL"
                  placeholder="www.example.com"
                  value={websiteUrl}
                  onChange={(e) => {
                    setWebsiteUrl(e?.target?.value || '');
                    if (urlError) {
                      setUrlError('');
                    }
                  }}
                  error={urlError}
                />

                <div className="flex items-center justify-end gap-2 pt-6">
                  <Button type="button" variant="transparent" onClick={closeUrlModal}>
                    Back
                  </Button>
                  <Button
                    type="button"
                    className="bg-primary hover:bg-primary/90 text-white border-primary min-w-24"
                    onClick={handleDiscoverLinks}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}

            {(urlModalStep === 'discovering' || urlModalStep === 'discovered') && (
              <div className="flex flex-col h-[620px]">
                <div className="p-6 pb-4 border-b border-[#EEE7DD]">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-lg text-[#2E2D35] font-semibold">Discovered Sitemap</h4>
                      <p className="text-sm text-[#9A948F] mt-1">
                        Select the specific pages you want the AI to read, process, and learn from.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="text-[#9A948F] hover:text-[#9A948F] cursor-pointer"
                      onClick={closeUrlModal}
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {urlModalStep === 'discovering' || isDiscovering ? (
                  <div className="flex-1 bg-[#FBE2C8]/45 flex flex-col items-center justify-center gap-4">
                    <div className="w-18 h-18 rounded-full bg-ucass-primary-200 flex items-center justify-center text-primary animate-pulse">
                      <Globe className="w-7 h-7" />
                    </div>
                    <h5 className="text-lg text-[#2E2D35] font-medium">
                      Discovering website links...
                    </h5>
                    <p className="text-sm text-[#9A948F]">Scanning the URL for available pages</p>
                  </div>
                ) : (
                  <>
                    <div className="px-6 py-3 border-b border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px]">
                      <div className="flex items-center gap-2 text-[#2E2D35]">
                        <Globe className="w-4 h-4 text-primary shrink-0" />
                        <span className="font-semibold text-base">
                          Pages Found ({filteredDiscoveredLinks.length}
                          {linkSearchTerm.trim() ? ` of ${discoveredLinks.length}` : ''})
                        </span>
                      </div>
                      <div className="w-full mt-3">
                        <Input
                          placeholder="Search pages"
                          value={linkSearchTerm}
                          onChange={(e) => setLinkSearchTerm(e?.target?.value || '')}
                        />
                      </div>
                    </div>

                    <div className="flex-1 bg-[#FBE2C8]/45 p-4 overflow-y-auto">
                      <div className="bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] border border-[rgba(225,200,165,0.9)] rounded-xl overflow-hidden">
                        {filteredDiscoveredLinks.length > 0 ? (
                          filteredDiscoveredLinks.map((link, index) => (
                            <div
                              key={link}
                              className={`px-4 py-4 flex items-center gap-3 ${
                                index !== filteredDiscoveredLinks.length - 1
                                  ? 'border-b border-[#EEE7DD]'
                                  : ''
                              }`}
                            >
                              <Checkbox
                                checked={selectedLinks.includes(link)}
                                onCheckedChange={(value) => onToggleLink(value === true, link)}
                              />
                              <span className="text-[#2E2D35] text-sm break-all">
                                [{link}]({link})
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-10 text-sm text-[#9A948F] text-center">
                            No pages match your search.
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                <div className="px-6 py-4 border-t border-[#EEE7DD] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] flex items-center justify-between">
                  <Button
                    type="button"
                    className="min-w-24"
                    variant="outline"
                    onClick={() => {
                      if (discoverTimeoutRef.current) {
                        clearTimeout(discoverTimeoutRef.current);
                      }
                      setUrlModalStep('input');
                    }}
                  >
                    <ChevronLeftIcon width={18} height={18} /> Back
                  </Button>

                  <Button
                    type="button"
                    disabled={
                      urlModalStep === 'discovering' ||
                      isPendingIngest ||
                      isPendingGetToken ||
                      selectedLinks.length === 0
                    }
                    className="bg-[#3c6edf] hover:bg-[#3c6edf]/90 text-white min-w-[230px]"
                    onClick={handleCrawlSelected}
                  >
                    {isPendingIngest || isPendingGetToken ? (
                      <Loader variant="white" />
                    ) : (
                      <Database className="w-4 h-4" />
                    )}
                    Crawl Selected ({selectedLinks.length})
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}

export default CreateAgent;
