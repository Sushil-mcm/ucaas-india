/**
 * The Review step of the knowledge-base builders, in demo mode.
 *
 * Step 6 does not read anything it already has. It posts the chosen sources to
 * `/api/ai/knowledge-base/review-job`, expects a job back, and polls
 * `.../review-job/status` until the job reports `completed` or `failed`.
 * Reaching either state is what ends the wait.
 *
 * The generic demo answer is an `ok()` envelope. Its `status` is the boolean
 * `true`, not a job state, and it carries no `jobId` — so the response was
 * neither complete nor pollable, and the step fell straight through to
 * "Cannot generate summary" with an empty Documents tab, however many sources
 * had been picked.
 *
 * So a job is answered here as already `completed`, with one document per
 * source. No polling round-trip is needed, and the counts on the step agree
 * with the number of sources chosen rather than contradicting them.
 *
 * On honesty: nothing is summarised, because nothing is read. Each document
 * says what would be extracted from that page rather than inventing facts
 * about a business — no prices, addresses or policies are made up, since those
 * would read as real answers a receptionist could give. The FAQs are the one
 * place a question needs an answer to exist at all, and they are written to be
 * plainly generic.
 */

export interface DemoReviewPayload {
  crawl_url?: string[];
  url?: string[];
  text?: string[];
  pdf?: string[];
}

interface DemoReviewDocument {
  id: string;
  title: string;
  summary: string;
  source: string;
  status: string;
  type: string;
}

interface DemoReviewJob {
  documents: DemoReviewDocument[];
  faqs: Array<{ id: string; question: string; answer: string; source: string }>;
}

/** Jobs already handed out, so a status poll answers with the same job. */
const jobs = new Map<string, DemoReviewJob>();

const titleCase = (value: string) =>
  value
    .replace(/[-_]+/g, ' ')
    .replace(/\.(html?|php|aspx)$/i, '')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());

const describeUrl = (rawUrl: string) => {
  try {
    const parsed = new URL(/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`);
    const segments = parsed.pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1] || '';
    const title = last ? titleCase(decodeURIComponent(last)) : 'Home';
    const section = segments.length > 1 ? ` in the /${segments[0]} section` : '';

    return {
      title,
      summary: `Text extracted from ${parsed.pathname || '/'}${section} on ${parsed.hostname}. In demo mode the page is not fetched, so no wording from it is reproduced here.`,
    };
  } catch {
    return {
      title: rawUrl,
      summary: 'Source recorded. In demo mode nothing is fetched, so there is no extracted text.',
    };
  }
};

const buildDocuments = (payload: DemoReviewPayload): DemoReviewDocument[] => {
  const documents: DemoReviewDocument[] = [];
  const push = (document: DemoReviewDocument) => documents.push(document);

  [...(payload.crawl_url ?? []), ...(payload.url ?? [])].forEach((sourceUrl, index) => {
    const { title, summary } = describeUrl(sourceUrl);
    push({
      id: `demo-doc-url-${index + 1}`,
      title,
      summary,
      source: sourceUrl,
      status: 'Just generated',
      type: 'url',
    });
  });

  /* Pasted text is the one source whose content really is present, so it is
     shown back rather than described. */
  (payload.text ?? []).forEach((text, index) => {
    const trimmed = String(text || '').trim();
    push({
      id: `demo-doc-text-${index + 1}`,
      title: `Pasted text ${index + 1}`,
      summary: trimmed.length > 400 ? `${trimmed.slice(0, 400)}...` : trimmed,
      source: 'Pasted text',
      status: 'Just generated',
      type: 'text',
    });
  });

  (payload.pdf ?? []).forEach((pdf, index) => {
    const name = String(pdf || '').split('/').pop() || `Document ${index + 1}`;
    push({
      id: `demo-doc-pdf-${index + 1}`,
      title: name,
      summary: `Uploaded file recorded as a source. In demo mode the file is not read, so no text is extracted from it.`,
      source: name,
      status: 'Just generated',
      type: 'pdf',
    });
  });

  return documents;
};

const buildFaqs = (payload: DemoReviewPayload) => {
  if (!buildDocuments(payload).length) return [];

  return [
    {
      id: 'demo-faq-1',
      question: 'What are your opening hours?',
      answer:
        'Sample answer for demo mode. The hours set on the Greeting & Hours step are what a real receptionist would quote here.',
      source: 'Generated',
    },
    {
      id: 'demo-faq-2',
      question: 'Where are you located?',
      answer:
        'Sample answer for demo mode. With a backend connected this is drawn from the address on the scanned site.',
      source: 'Generated',
    },
    {
      id: 'demo-faq-3',
      question: 'How do I speak to a person?',
      answer:
        'Sample answer for demo mode. The receptionist transfers to the queue or extension chosen in Advanced Settings.',
      source: 'Generated',
    },
  ];
};

/** Shaped as `{ data: { ... } }`, which is where the step reads job fields from. */
const jobResponse = (jobId: string, job: DemoReviewJob) => ({
  data: {
    jobId,
    status: 'completed',
    documents: job.documents,
    faqs: job.faqs,
  },
});

export const startDemoReviewJob = (payload: DemoReviewPayload) => {
  const jobId = `demo-review-${Date.now().toString(36)}`;
  const job: DemoReviewJob = { documents: buildDocuments(payload), faqs: buildFaqs(payload) };

  jobs.set(jobId, job);
  return jobResponse(jobId, job);
};

/* A poll for a job this session never issued still has to complete, or the step
   would wait for a status that is never coming. */
export const getDemoReviewJob = (jobId: string) =>
  jobResponse(jobId, jobs.get(jobId) ?? { documents: [], faqs: [] });
