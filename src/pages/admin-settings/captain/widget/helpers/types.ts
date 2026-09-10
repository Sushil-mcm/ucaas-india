// The shape of `config.widget` on a `kind: 'widget'` custom tool — a schema of
// input fields plus a layout tree of nodes that render them. Mirrors
// captain-api's WidgetConfigValidator.

export type FieldType = 'text' | 'email' | 'text_area' | 'select';

export type SelectOption = { value: string; label: string };

export type StyleBag = Record<string, string>;

export type VisibilityOp =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'lt'
  | 'contains'
  | 'not_contains'
  | 'is_empty'
  | 'is_not_empty';

export type VisibilityCondition = { field: string; op: VisibilityOp; value?: string };
export type VisibilityGroup = {
  combinator: 'and' | 'or';
  conditions: (VisibilityCondition | VisibilityGroup)[];
};
export type VisibilityRule = VisibilityCondition | VisibilityGroup;

export type WidgetField = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: SelectOption[];
  labelFontSize?: 'sm' | 'base' | 'lg' | 'xl';
  inputWidth?: string;
  color?: string;
  borderColor?: string;
  style?: StyleBag;
  labelStyle?: StyleBag;
  visibleWhen?: VisibilityRule;
};

export type OnClick =
  | { type: 'submit' }
  | { type: 'navigate'; url: string }
  | { type: 'send_message'; message: string }
  | { type: 'call_tool'; tool_slug: string }
  | { type: 'dismiss' };

export type WidgetNode = {
  type: 'card' | 'form' | 'text' | 'options' | 'button';
  id: string;
  // card
  title?: string;
  width?: string;
  style?: StyleBag;
  titleStyle?: StyleBag;
  children?: WidgetNode[];
  // form / options
  fields?: string[];
  // text
  content?: string;
  // button
  label?: string;
  onClick?: OnClick;
  color?: string;
  borderColor?: string;
  textColor?: string;
  align?: 'left' | 'center' | 'right';
  visibleWhen?: VisibilityRule;
};

export type WidgetConfig = { schema: WidgetField[]; layout: WidgetNode[] };

export type CustomTool = {
  id: number;
  company_uuid: string;
  assistant_id: number | null;
  slug: string;
  title: string;
  description: string | null;
  kind: 'http' | 'lead' | 'form' | 'button' | 'widget' | 'api_widget';
  config: { widget?: WidgetConfig; source_widget_id?: number; [k: string]: unknown } | null;
  created_at: string;
  updated_at: string;
};

export type Assistant = { id: number | string; name: string };
