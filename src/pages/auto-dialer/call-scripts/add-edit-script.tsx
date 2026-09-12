import { yupResolver } from '@hookform/resolvers/yup';
import { Checkbox } from '@/components/ui/checkbox';
import { SCRIPT_VARIABLES, sampleScriptValues, unfillableTokens } from '@/lib/script-variables';
import {
  MAX_PAGES,
  isPublished,
  movePage,
  newScriptPage,
  normalizeScriptPages,
  pagesOf,
  removePage,
  type ScriptPage,
  type ScriptPageRule,
} from '@/lib/script-pages';
import { Controller, useForm } from 'react-hook-form';
import { dailMethodsArr, formDefaultValues, validationSchema } from './constants';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import CustomSelect from '@/components/custom/custom-select';
import TextEditor from '@/components/custom/text-editor';
import ScriptPagesViewer from '@/components/custom/script-pages-viewer';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import ErrorTooltip from '@/components/custom/error-tooltip';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { upsertCallScript } from '@/services/api';
import { handleAlert } from '@/lib/utils';
import { useEffect, useMemo, useRef, useState } from 'react';
import Loader from '@/components/custom/loader';
import { ArrowDown, ArrowUp, Eye, Plus, Trash2 } from 'lucide-react';

const ScriptForm = ({
  isEdit,
  data,
  handleClose,
  startAsTemplate = false,
}: {
  isEdit: boolean;
  data: any;
  handleClose: any;
  /* Opened from the Templates view: the new script is a template by default. */
  startAsTemplate?: boolean;
}) => {
  const queryClient = useQueryClient();
  const [editorKey, setEditorKey] = useState(0);
  /* Which page is open in the editor, by id. */
  const [activePageId, setActivePageId] = useState<string>('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDisposition, setPreviewDisposition] = useState('');
  /* What the button pressed wants the status to be; read by the submit. */
  const intentRef = useRef<'draft' | 'published' | 'keep'>('keep');

  const {
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<any>({
    defaultValues: formDefaultValues,
    resolver: yupResolver(validationSchema),
    mode: 'onSubmit',
  });

  const { mutate, isPending } = useMutation({
    mutationKey: ['upsertCallScript'],
    mutationFn: upsertCallScript,
    onSuccess: (_response, variables: any) => {
      const verb =
        variables?.status === 'published' && !isPublished(data)
          ? 'published'
          : variables?.status === 'draft' && isPublished(data) && isEdit
            ? 'unpublished'
            : isEdit
              ? 'updated'
              : 'saved';
      handleAlert({ text: `Call script ${verb}.`, type: 'success' });
      handleClose(false);
      queryClient.invalidateQueries({ queryKey: ['getCallScript'] });
      queryClient.invalidateQueries({ queryKey: ['getCallScript-scripts'] });
      queryClient.invalidateQueries({ queryKey: ['getCallScript-templates'] });
      reset(formDefaultValues);
    },
  });

  const pages: ScriptPage[] = watch('pages') || [];
  const status: 'draft' | 'published' = watch('status') || 'draft';
  const activeIndex = Math.max(
    0,
    pages.findIndex((page) => page.id === activePageId),
  );
  const activePage = pages[activeIndex];

  /* A queue script and a campaign script can fill in different things: a queue
     call has no campaign name, and often no name for the caller either. The
     menu offers only what this kind of script can actually fill, and anything
     already written that it cannot is said plainly rather than left to render
     blank on a live call. */
  const scriptKind: 'campaign' | 'queue' =
    watch('dialMethod')?.value === 'QUEUE' ? 'queue' : 'campaign';
  const availableVariables = useMemo(
    () => SCRIPT_VARIABLES.filter((variable) => variable.availableOn.includes(scriptKind)),
    [scriptKind],
  );
  const bodies = useMemo(() => pages.map((page) => page.body), [pages]);
  const unfillable = useMemo(() => unfillableTokens(bodies, scriptKind), [bodies, scriptKind]);

  const setPages = (next: ScriptPage[]) => setValue('pages', next, { shouldValidate: false });
  const patchPage = (id: string, patch: Partial<ScriptPage>) =>
    setPages(pages.map((page) => (page.id === id ? { ...page, ...patch } : page)));
  const addPage = () => {
    if (pages.length >= MAX_PAGES) return;
    const page = newScriptPage(pages);
    setPages([...pages, page]);
    setActivePageId(page.id);
  };
  const dropPage = (id: string) => {
    const next = removePage(pages, id);
    setPages(next);
    if (id === activePageId) setActivePageId(next[Math.min(activeIndex, next.length - 1)]?.id || '');
  };
  const patchRule = (index: number, patch: Partial<ScriptPageRule>) => {
    if (!activePage) return;
    patchPage(activePage.id, {
      rules: activePage.rules.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)),
    });
  };

  const onSubmit = (values: any) => {
    const { name, dialMethod, description, isTemplate } = values || {};
    const normalized = normalizeScriptPages(values?.pages);
    const nextStatus = intentRef.current === 'keep' ? values?.status || 'draft' : intentRef.current;
    const payload = {
      uuid: isEdit ? data?.uuid || data?._id : undefined,
      /* Page one, for anything still reading a single body. The server sets
         this too; sending it keeps the request valid for the older schema. */
      script: normalized[0]?.body || [],
      pages: normalized,
      name,
      dialMethod: dialMethod?.value,
      description: String(description || '').trim(),
      isTemplate: Boolean(isTemplate),
      status: nextStatus,
    };
    mutate(payload);
  };
  const submitAs = (intent: 'draft' | 'published' | 'keep') => {
    intentRef.current = intent;
    return handleSubmit(onSubmit)();
  };

  useEffect(() => {
    /* A starter (from "Start from") arrives the same shape as a stored script,
       minus its id, so the same load path fills the form. A script saved
       before pages existed is one page. */
    if (data) {
      const dialMethodObj = dailMethodsArr?.find((i) => i.value === data?.dialMethod);
      const loadedPages = pagesOf(data);
      reset({
        name: data?.name || '',
        description: data?.description || '',
        isTemplate: isEdit ? Boolean(data?.isTemplate) : startAsTemplate,
        dialMethod: dialMethodObj || '',
        status: isEdit ? (isPublished(data) ? 'published' : 'draft') : 'draft',
        pages: loadedPages,
      });
      setActivePageId(loadedPages[0]?.id || '');
      return;
    }
    if (!isEdit && startAsTemplate) setValue('isTemplate', true);
    setActivePageId(formDefaultValues.pages[0].id);
  }, [data]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setEditorKey((prev) => prev + 1);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const pageTitle = (page: ScriptPage, index: number) => page.title || `Page ${index + 1}`;
  const pagesError = (errors as any)?.pages?.message;
  const published = isEdit && isPublished(data);

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-auto xl:overflow-hidden">
      <div className="h-full min-h-0">
        <div className="flex h-full min-h-0 w-full flex-col gap-4 rounded-xl bg-white">
          <form
            className="flex h-full min-h-0 flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              submitAs('keep');
            }}
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Controller
                control={control}
                name={'name'}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="Enter name"
                    label="Name"
                    error={errors?.name?.message}
                    maxLength={50}
                  />
                )}
              />
              <Controller
                control={control}
                name={'dialMethod'}
                render={({ field }) => (
                  <CustomSelect
                    {...field}
                    label={'Type'}
                    placeholder="Select type"
                    handleChange={(value) => field.onChange(value)}
                    options={dailMethodsArr}
                    error={errors?.dialMethod?.message}
                  />
                )}
              />
            </div>
            <Controller
              control={control}
              name={'description'}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="What this script is for, in a line"
                  label="Description (optional)"
                  error={(errors as any)?.description?.message}
                  maxLength={200}
                />
              )}
            />

            {/* Pages. A script is read one page at a time; the strip below
                is every page in order, the card under it is the open one. */}
            <div className="flex min-h-0 flex-1 flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>Pages</Label>
                {pagesError ? (
                  <div className="flex items-start">
                    <ErrorTooltip text={pagesError} />
                  </div>
                ) : null}
              </div>
              <div className="no-scrollbar flex items-center gap-1 overflow-x-auto">
                {pages.map((page, index) => (
                  <button
                    key={page.id}
                    type="button"
                    onClick={() => setActivePageId(page.id)}
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${
                      page.id === activePage?.id
                        ? 'border-primary bg-primary text-white'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {index + 1}. {pageTitle(page, index)}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={addPage}
                  disabled={pages.length >= MAX_PAGES}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full border border-dashed border-gray-300 px-3 py-1 text-xs text-gray-600 hover:border-primary hover:text-primary disabled:opacity-40"
                >
                  <Plus className="h-3 w-3" /> Add page
                </button>
              </div>

              {activePage ? (
                <div
                  className={`flex min-h-0 flex-1 flex-col gap-2 rounded-xl border p-2 ${
                    pagesError ? 'border-red-500' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Input
                        value={activePage.title}
                        onChange={(event: any) =>
                          patchPage(activePage.id, { title: event.target.value })
                        }
                        placeholder={`Page ${activeIndex + 1}`}
                        label="Page title"
                        maxLength={80}
                      />
                    </div>
                    <div className="flex items-center gap-1 pb-0.5">
                      <button
                        type="button"
                        title="Move up"
                        disabled={activeIndex === 0}
                        onClick={() => setPages(movePage(pages, activeIndex, -1))}
                        className="rounded-full p-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-30"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="Move down"
                        disabled={activeIndex >= pages.length - 1}
                        onClick={() => setPages(movePage(pages, activeIndex, 1))}
                        className="rounded-full p-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-30"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="Remove this page"
                        disabled={pages.length <= 1}
                        onClick={() => dropPage(activePage.id)}
                        className="rounded-full p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex min-h-[180px] flex-1 overflow-hidden rounded-xl border p-2 md:min-h-[220px]">
                    <TextEditor
                      key={`${editorKey}-${activePage.id}`}
                      initialValue={activePage.body}
                      onChange={(value: any) => patchPage(activePage.id, { body: value })}
                      readOnly={false}
                      maxHeight="max-h-full w-full"
                      variables={availableVariables}
                    />
                  </div>

                  {/* Choices: buttons the agent sees at the bottom of this
                      page. Each can send the call to a named page. */}
                  <Input
                    value={activePage.choices.join(', ')}
                    onChange={(event: any) =>
                      patchPage(activePage.id, {
                        choices: String(event.target.value)
                          .split(',')
                          .map((choice) => choice.replace(/\s+/g, ' ').trimStart())
                          .filter((choice, index, all) => choice.trim() || index === all.length - 1),
                      })
                    }
                    onBlur={() =>
                      patchPage(activePage.id, {
                        choices: activePage.choices.map((c) => c.trim()).filter(Boolean),
                      })
                    }
                    placeholder="Interested, Not interested"
                    label="Choices the agent picks from at the bottom of this page (comma separated, optional)"
                    maxLength={400}
                  />

                  {pages.length > 1 ? (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-700">
                          Where the call goes next
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            patchPage(activePage.id, {
                              rules: [
                                ...activePage.rules,
                                {
                                  on: activePage.choices.length ? 'choice' : 'disposition',
                                  value: activePage.choices[0] || '',
                                  page: pages.find((p) => p.id !== activePage.id)?.id || '',
                                },
                              ],
                            })
                          }
                          className="text-xs text-primary hover:underline"
                        >
                          + Add a rule
                        </button>
                      </div>
                      {activePage.rules.length === 0 ? (
                        <p className="text-xs text-gray-500">
                          With no rule, Next goes to the following page. A rule sends a choice
                          made here, or the disposition chosen so far, to a page you name.
                        </p>
                      ) : null}
                      {activePage.rules.map((rule, index) => (
                        <div key={index} className="flex flex-wrap items-center gap-1.5 text-xs">
                          <span className="text-gray-500">When</span>
                          <select
                            value={rule.on}
                            onChange={(event) =>
                              patchRule(index, {
                                on: event.target.value as ScriptPageRule['on'],
                                value: event.target.value === 'choice' ? activePage.choices[0] || '' : '',
                              })
                            }
                            className="rounded-lg border border-gray-200 px-2 py-1"
                          >
                            <option value="choice">the choice is</option>
                            <option value="disposition">the disposition is</option>
                          </select>
                          {rule.on === 'choice' ? (
                            <select
                              value={rule.value}
                              onChange={(event) => patchRule(index, { value: event.target.value })}
                              className="rounded-lg border border-gray-200 px-2 py-1"
                            >
                              <option value="">choose…</option>
                              {activePage.choices.map((choice) => (
                                <option key={choice} value={choice}>
                                  {choice}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              value={rule.value}
                              onChange={(event) => patchRule(index, { value: event.target.value })}
                              placeholder="disposition name"
                              maxLength={80}
                              className="w-36 rounded-lg border border-gray-200 px-2 py-1"
                            />
                          )}
                          <span className="text-gray-500">go to</span>
                          <select
                            value={rule.page}
                            onChange={(event) => patchRule(index, { page: event.target.value })}
                            className="rounded-lg border border-gray-200 px-2 py-1"
                          >
                            <option value="">choose a page…</option>
                            {pages
                              .filter((page) => page.id !== activePage.id)
                              .map((page) => (
                                <option key={page.id} value={page.id}>
                                  {pageTitle(page, pages.indexOf(page))}
                                </option>
                              ))}
                          </select>
                          <button
                            type="button"
                            title="Remove rule"
                            onClick={() =>
                              patchPage(activePage.id, {
                                rules: activePage.rules.filter((_, i) => i !== index),
                              })
                            }
                            className="rounded-full p-1 text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {unfillable.length > 0 ? (
                <p className="text-xs text-amber-700">
                  {unfillable.map((token) => `{{${token}}}`).join(', ')}{' '}
                  {unfillable.length === 1 ? 'is not something' : 'are not things'} a{' '}
                  {scriptKind === 'queue' ? 'queue' : 'campaign'} call can fill in, so{' '}
                  {unfillable.length === 1 ? 'it' : 'they'} will read as a blank.
                </p>
              ) : (
                <p className="text-xs text-gray-500">
                  Use “Insert a detail” to drop in a name or number that fills itself in on every
                  call.
                </p>
              )}
            </div>

            {/* A template is a starting point offered when a new script is
                created. It is never offered to a campaign or a queue. */}
            <Controller
              control={control}
              name={'isTemplate'}
              render={({ field }) => (
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <Checkbox checked={!!field.value} onCheckedChange={(v) => field.onChange(!!v)} />
                  Save as a template, a starting point for new scripts
                </label>
              )}
            />

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-2">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={'outline'}
                  className="min-h-9"
                  onClick={() => setPreviewOpen(true)}
                >
                  <Eye className="mr-1 h-4 w-4" /> Preview
                </Button>
                <span className="text-xs text-gray-500">
                  {published
                    ? 'Published. Saving keeps it published; agents see the change on their next call.'
                    : status === 'draft'
                      ? 'Draft. Campaigns, queues and agents do not see it until you publish.'
                      : ''}
                </span>
              </div>
              <div className="flex gap-2">
                {published ? (
                  <>
                    <Button
                      type="button"
                      variant={'outline'}
                      disabled={isPending}
                      onClick={() => submitAs('draft')}
                      className="min-w-24"
                    >
                      Unpublish
                    </Button>
                    <Button type="submit" variant={'primary'} disabled={isPending} className="min-w-24">
                      {isPending ? <Loader variant="blue" /> : 'Save'}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant={'outline'}
                      disabled={isPending}
                      onClick={() => submitAs('draft')}
                      className="min-w-24"
                    >
                      Save draft
                    </Button>
                    <Button
                      type="button"
                      variant={'primary'}
                      disabled={isPending}
                      onClick={() => submitAs('published')}
                      className="min-w-24"
                    >
                      {isPending ? <Loader variant="blue" /> : 'Publish'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Preview: the script exactly as the agent's panel shows it, with
          sample details where a live call would fill in names and numbers. */}
      <Dialog open={previewOpen} onOpenChange={(open) => !open && setPreviewOpen(false)}>
        <DialogContent className="flex h-[80vh] w-full flex-col p-4 sm:w-2/3 md:w-1/2" showCloseButton={true}>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="font-semibold text-gray-900">Preview</p>
              <p className="text-xs text-gray-500">
                Read it the way an agent will. Sample details stand in for the real caller, agent
                and company.
              </p>
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-600">
              Pretend the disposition is
              <input
                value={previewDisposition}
                onChange={(event) => setPreviewDisposition(event.target.value)}
                placeholder="e.g. Callback"
                className="w-32 rounded-lg border border-gray-200 px-2 py-1"
              />
            </label>
          </div>
          <div className="min-h-0 flex-1">
            <ScriptPagesViewer
              pages={normalizeScriptPages(pages)}
              values={sampleScriptValues()}
              disposition={previewDisposition}
              resetKey={`preview-${previewOpen ? 'open' : 'closed'}`}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScriptForm;
