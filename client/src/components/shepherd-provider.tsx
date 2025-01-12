import { ReactNode } from "react";
import Shepherd from 'shepherd.js';
import { ShepherdTour } from 'react-shepherd';

const tourOptions: Shepherd.Tour.TourOptions = {
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
    <ShepherdTour steps={[]} tourOptions={tourOptions}>
      {children}
    </ShepherdTour>
  );
}