export interface ModalProps {
  modalState: boolean;
  setModalState: (state: boolean) => void;
  data?:any
  origin?:string
}
export interface DrowerProps {
  drawerState: boolean;
    setDrawerState: (state: boolean) => void;
}

export interface IEXTENSION {
  first_name: string;
  last_name: string;
  extension: string;
}

export interface ICOMMON {
  name: string;
  uuid: string;
}
export interface ICALLQUEUE {
  name: string;
  _id: string;
  extension: number;
}

export interface IMultiOption {
  label: string;
  avatar?: string;
  disabled?: string;
  value?: string;
}

export interface MultiSelectProps {
  label?: string;
  error?: string;
  options: IMultiOption[];
  value?: IMultiOption[];
  onChange?: (selected: IMultiOption[]) => void;
  placeholder?: string;
  isSearchOnLabel?: boolean;
  isSearch?: boolean;
  isValueShown?: boolean;
  disabled?: boolean;
}