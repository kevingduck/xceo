import { ReactNode } from "react";
import { ShepherdTourProvider } from "react-shepherd";

const tourOptions = {
  defaultStepOptions: {
    classes: "shepherd-theme-custom",
    scrollTo: true,
    cancelIcon: {
      enabled: true
    }
  },
  useModalOverlay: true
};

interface ShepherdProviderProps {
  children: ReactNode;
}

export function ShepherdProvider({ children }: ShepherdProviderProps) {
  return (
    <ShepherdTourProvider tourOptions={tourOptions}>
      {children}
    </ShepherdTourProvider>
  );
}

export { ShepherdTourContext };