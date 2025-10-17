declare module 'react-input-mask' {
  import * as React from 'react';

  export interface InputMaskProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'children'> {
    mask?: string;
    maskPlaceholder?: string | null;
    alwaysShowMask?: boolean;
    beforeMaskedStateChange?: (states: any) => any;
    /** Suporta children padrão OU render prop */
    children?:
      | React.ReactNode
      | ((
          inputProps: React.InputHTMLAttributes<HTMLInputElement>
        ) => React.ReactElement);
  }

  const InputMask: React.ForwardRefExoticComponent<
    InputMaskProps & React.RefAttributes<HTMLInputElement>
  >;

  export default InputMask;
}
