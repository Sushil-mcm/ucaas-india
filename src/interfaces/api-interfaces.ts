export interface ILIST {
  page: number;
  limit: number;
  filters?: Array<any>;
  search?: string;
}

export interface ISELECTVALUE {
  label: string;
  value: string | boolean;
  icon?:any;
}
