// A single in-memory slot holding the custom-tool create/edit form's state
// while the user is on the widget builder page. Navigating there unmounts
// the Wizard (and its form component), which would otherwise wipe any
// unsaved title/fields/buttons edits and, for a tool that doesn't exist yet,
// lose the whole draft outright. Nothing here ever touches the backend —
// for a not-yet-created tool this is the only place its widget config lives
// until the real Save button is clicked.

let draftTool: Record<string, any> | null = null;

export function useCustomToolDraft() {
  const setDraftTool = (tool: Record<string, any>) => {
    draftTool = tool;
  };

  const getDraftTool = (): Record<string, any> | null => draftTool;

  const updateDraftWidget = (widgetConfig: any) => {
    if (!draftTool) return;
    draftTool = {
      ...draftTool,
      config: { ...draftTool.config, widget: widgetConfig },
    };
  };

  const clearDraftTool = () => {
    draftTool = null;
  };

  return { setDraftTool, getDraftTool, updateDraftWidget, clearDraftTool };
}
