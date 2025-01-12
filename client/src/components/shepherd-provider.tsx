import { ReactNode, createContext, useContext } from "react";
import { useShepherdTour } from 'react-shepherd';
import type { Tour, Step } from 'shepherd.js';
import "shepherd.js/dist/css/shepherd.css";

interface ShepherdContextType {
  tour: Tour | null;
}

const ShepherdContext = createContext<ShepherdContextType>({ tour: null });

export function useShepherdTourContext() {
  return useContext(ShepherdContext);
}

interface ShepherdProviderProps {
  children: ReactNode;
}

export function ShepherdProvider({ children }: ShepherdProviderProps) {
  const tour = useShepherdTour({
    steps: [], // Initialize with empty steps, will be added by BusinessTour
    tourOptions: {
      defaultStepOptions: {
        cancelIcon: {
          enabled: true
        },
        classes: 'shepherd-theme-custom',
        scrollTo: { behavior: 'smooth', block: 'center' },
        highlightClass: 'shepherd-highlight',
        modalOverlayOpeningPadding: 8,
        modalOverlayOpeningRadius: 4
      },
      useModalOverlay: true
    }
  });

  return (
    <ShepherdContext.Provider value={{ tour: tour.tour }}>
      {children}
    </ShepherdContext.Provider>
  );
}