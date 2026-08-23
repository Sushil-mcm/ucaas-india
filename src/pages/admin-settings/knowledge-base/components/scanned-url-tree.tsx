import { ChevronDown, ChevronRight, File, Folder } from 'lucide-react';
import { useMemo, useState } from 'react';

type UrlTreeNode = {
  id: string;
  segment: string;
  url?: string;
  children: UrlTreeNode[];
};

type ScannedUrlTreeProps = {
  links: string[];
  selectedLinks: string[];
  onToggleLink: (url: string, checked: boolean) => void;
  disabled?: boolean;
  emptyMessage?: string;
  className?: string;
};

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

const mainPagePriority: Record<string, number> = {
  home: 0,
  index: 0,
  features: 1,
  feature: 1,
  services: 2,
  service: 2,
  products: 3,
  product: 3,
  solutions: 4,
  pricing: 5,
  plans: 5,
  about: 6,
  'about-us': 6,
  contact: 7,
  'contact-us': 7,
};

const safeDecode = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const getPathSegments = (url: string) => {
  const value = url.trim();
  let pathname = '';

  try {
    pathname = new URL(value).pathname;
  } catch {
    try {
      pathname = new URL(`https://${value}`).pathname;
    } catch {
      const cleanValue = value.split(/[?#]/)[0] ?? '';
      const withoutHost = cleanValue.replace(/^[a-z][a-z\d+.-]*:\/\/[^/]+/i, '');
      if (withoutHost.startsWith('/')) {
        pathname = withoutHost;
      } else {
        const firstSlashIndex = withoutHost.indexOf('/');
        pathname = firstSlashIndex >= 0 ? withoutHost.slice(firstSlashIndex) : `/${withoutHost}`;
      }
    }
  }

  return pathname.split('/').filter(Boolean);
};

const getPageLabel = (url: string) => {
  const segments = getPathSegments(url);
  if (!segments.length) return 'Home';
  return safeDecode(segments[segments.length - 1] || url);
};

const normalizeSortSegment = (value: string) =>
  safeDecode(value)
    .trim()
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[_\s]+/g, '-')
    .replace(/^-+|-+$/g, '');

const getSegmentRank = (segment: string) => {
  const normalizedSegment = normalizeSortSegment(segment);
  const mainPriority = mainPagePriority[normalizedSegment];

  if (mainPriority !== undefined) {
    return { group: 0, priority: mainPriority, label: normalizedSegment };
  }

  if (/^\d/.test(normalizedSegment)) {
    return { group: 1, priority: 0, label: normalizedSegment };
  }

  return { group: 2, priority: 0, label: normalizedSegment };
};

const compareRankedSegments = (a: string, b: string) => {
  const aRank = getSegmentRank(a);
  const bRank = getSegmentRank(b);

  if (aRank.group !== bRank.group) return aRank.group - bRank.group;
  if (aRank.priority !== bRank.priority) return aRank.priority - bRank.priority;

  return aRank.label.localeCompare(bRank.label, undefined, {
    numeric: true,
    sensitivity: 'base',
  });
};

const getPrimarySortSegment = (url: string) => {
  const segments = getPathSegments(url);
  return segments.length ? segments[segments.length - 1] || url : 'home';
};

const sortLinks = (links: string[]) =>
  [...links].sort((a, b) => {
    const primarySort = compareRankedSegments(getPrimarySortSegment(a), getPrimarySortSegment(b));
    if (primarySort !== 0) return primarySort;

    return a.localeCompare(b, undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  });

const collectNodeUrls = (node: UrlTreeNode): string[] => {
  const urls: string[] = [];
  if (node.url) urls.push(node.url);
  node.children.forEach((child) => urls.push(...collectNodeUrls(child)));
  return urls;
};

const sortTree = (nodes: UrlTreeNode[]): UrlTreeNode[] => {
  nodes.sort((a, b) => {
    const aIsFolder = a.children.length > 0;
    const bIsFolder = b.children.length > 0;
    if (!aIsFolder && bIsFolder) return -1;
    if (aIsFolder && !bIsFolder) return 1;
    return compareRankedSegments(a.segment, b.segment);
  });

  nodes.forEach((node) => {
    if (node.children.length > 0) sortTree(node.children);
  });

  return nodes;
};

const buildScannedUrlGroups = (links: string[]) => {
  const looseLinks: string[] = [];
  const folderRoot: UrlTreeNode = { id: 'root', segment: 'Root', children: [] };

  links.forEach((url) => {
    const segments = getPathSegments(url);
    if (segments.length <= 1) {
      looseLinks.push(url);
      return;
    }

    let current = folderRoot;
    segments.forEach((rawSegment, index) => {
      const segment = safeDecode(rawSegment);
      let child = current.children.find((node) => node.segment === segment);
      if (!child) {
        child = {
          id: `${current.id}/${segment}`,
          segment,
          children: [],
        };
        current.children.push(child);
      }

      if (index === segments.length - 1) {
        child.url = url;
      }

      current = child;
    });
  });

  return {
    looseLinks: sortLinks(looseLinks),
    folderNodes: sortTree(folderRoot.children),
  };
};

const ScannedPageRow = ({
  url,
  selected,
  disabled,
  onToggle,
}: {
  url: string;
  selected: boolean;
  disabled?: boolean;
  onToggle: (checked: boolean) => void;
}) => (
  <label
    className={cx(
      'flex min-h-[34px] items-center gap-2 border-b border-gray-100 px-3.5 py-1.5 text-left transition-colors last:border-b-0',
      selected ? 'bg-primary/[0.04]' : 'bg-white',
      disabled ? 'cursor-default' : 'cursor-pointer hover:bg-slate-50',
    )}
  >
    <div className="w-4" />
    <input
      type="checkbox"
      checked={selected}
      disabled={disabled}
      onChange={(event) => onToggle(event.target.checked)}
      className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary disabled:cursor-not-allowed"
    />
    <File className="h-3.5 w-3.5 shrink-0 text-slate-400" />
    <div className="min-w-0 flex-1">
      <p className="truncate text-[13px] font-semibold text-gray-900">{getPageLabel(url)}</p>
    </div>
    <span className="max-w-[360px] shrink truncate text-xs text-slate-500">{url}</span>
  </label>
);

const TreeRow = ({
  node,
  selectedLinks,
  disabled,
  onToggle,
  depth = 0,
}: {
  node: UrlTreeNode;
  selectedLinks: string[];
  disabled?: boolean;
  onToggle: (url: string, checked: boolean) => void;
  depth?: number;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = node.children.length > 0;
  const nodeUrls = useMemo(() => collectNodeUrls(node), [node]);
  const allSelected = nodeUrls.length > 0 && nodeUrls.every((url) => selectedLinks.includes(url));
  const someSelected = !allSelected && nodeUrls.some((url) => selectedLinks.includes(url));
  const selectedCount = nodeUrls.filter((url) => selectedLinks.includes(url)).length;

  const handleCheckboxChange = (checked: boolean) => {
    nodeUrls.forEach((url) => onToggle(url, checked));
  };

  return (
    <div className="flex flex-col">
      <div
        className={cx(
          'flex min-h-[34px] items-center gap-2 border-b border-gray-100 px-3.5 py-1.5 text-left transition-colors',
          allSelected || someSelected ? 'bg-primary/[0.04]' : 'bg-white',
          'hover:bg-slate-50',
        )}
        style={{ paddingLeft: `${depth * 18 + 14}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setIsExpanded((current) => !current)}
            aria-expanded={isExpanded}
            className="flex h-4 w-4 items-center justify-center border-none bg-transparent text-slate-400 outline-none hover:text-slate-700"
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 stroke-[2.4]" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 stroke-[2.4]" />
            )}
          </button>
        ) : (
          <div className="h-4 w-4" />
        )}

        <input
          type="checkbox"
          checked={allSelected}
          disabled={disabled}
          ref={(element) => {
            if (element) element.indeterminate = someSelected;
          }}
          onChange={(event) => handleCheckboxChange(event.target.checked)}
          className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary disabled:cursor-not-allowed"
        />

        {hasChildren ? (
          <Folder className="h-3.5 w-3.5 shrink-0 text-slate-500" />
        ) : (
          <File className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-gray-900">{node.segment}</p>
        </div>

        {hasChildren ? (
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
            {selectedCount}/{nodeUrls.length}
          </span>
        ) : (
          node.url && (
            <span className="max-w-[360px] shrink truncate text-xs text-slate-500">{node.url}</span>
          )
        )}
      </div>

      {hasChildren && isExpanded && (
        <div className="flex flex-col">
          {node.children.map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              selectedLinks={selectedLinks}
              disabled={disabled}
              onToggle={onToggle}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const ScannedUrlTree = ({
  links,
  selectedLinks,
  onToggleLink,
  disabled,
  emptyMessage = 'No scanned pages match your search.',
  className,
}: ScannedUrlTreeProps) => {
  const { looseLinks, folderNodes } = useMemo(() => buildScannedUrlGroups(links), [links]);
  const hasResults = looseLinks.length > 0 || folderNodes.length > 0;

  if (!hasResults) {
    return <div className="px-4 py-12 text-center text-sm text-slate-500">{emptyMessage}</div>;
  }

  return (
    <div className={cx('overflow-y-auto bg-white', className)}>
      {looseLinks.length > 0 && (
        <section className="flex flex-col">
          <div className="flex items-center justify-between border-b border-gray-100 bg-slate-50 px-3.5 py-2">
            <p className="text-xs font-bold text-gray-950">Pages</p>
            <span className="text-[11px] font-semibold text-slate-400">{looseLinks.length}</span>
          </div>
          {looseLinks.map((url) => (
            <ScannedPageRow
              key={url}
              url={url}
              selected={selectedLinks.includes(url)}
              disabled={disabled}
              onToggle={(checked) => onToggleLink(url, checked)}
            />
          ))}
        </section>
      )}

      {folderNodes.length > 0 && (
        <section className="flex flex-col">
          <div className="flex items-center justify-between border-b border-gray-100 bg-slate-50 px-3.5 py-2">
            <p className="text-xs font-bold text-gray-950">Folders</p>
            <span className="text-[11px] font-semibold text-slate-400">{folderNodes.length}</span>
          </div>
          {folderNodes.map((node) => (
            <TreeRow
              key={node.id}
              node={node}
              selectedLinks={selectedLinks}
              disabled={disabled}
              onToggle={onToggleLink}
            />
          ))}
        </section>
      )}
    </div>
  );
};

export default ScannedUrlTree;
