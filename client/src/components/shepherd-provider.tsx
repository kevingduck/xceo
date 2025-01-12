import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import Shepherd from "shepherd.js";
import "shepherd.js/dist/css/shepherd.css";

interface ShepherdContextType {
  tour: Shepherd.Tour | null;
}

const ShepherdContext = createContext<ShepherdContextType>({ tour: null });

export function useShepherdTour() {
  return useContext(ShepherdContext).tour;
}

interface ShepherdProviderProps {
  children: ReactNode;
}

export function ShepherdProvider({ children }: ShepherdProviderProps) {
  const [tour, setTour] = useState<Shepherd.Tour | null>(null);

  useEffect(() => {
    const newTour = new Shepherd.Tour({
      defaultStepOptions: {
        cancelIcon: {
          enabled: true
        },
        classes: 'shepherd-theme-custom',
        scrollTo: { behavior: 'smooth', block: 'center' }
      },
      useModalOverlay: true
    });

    setTour(newTour);

    return () => {
      newTour.complete();
    };
  }, []);

  return (
    <ShepherdContext.Provider value={{ tour }}>
      {children}
    </ShepherdContext.Provider>
  );
}