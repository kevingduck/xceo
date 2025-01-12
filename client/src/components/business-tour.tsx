import { useEffect, useState } from "react";
import { useShepherdTour } from "./shepherd-provider";
import type Shepherd from "shepherd.js";

interface TourProps {
  isFirstVisit?: boolean;
  onComplete?: () => void;
}

const steps: Shepherd.Step.StepOptions[] = [
  {
    id: "welcome",
    attachTo: {
      element: ".business-header",
      on: "bottom"
    },
    buttons: [
      {
        action() {
          return this.cancel();
        },
        classes: 'shepherd-button-secondary',
        text: 'Skip'
      },
      {
        action() {
          return this.next();
        },
        text: 'Get Started'
      }
    ],
    classes: 'shepherd-theme-custom',
    title: "Welcome to Business Management",
    text: "Let's take a quick tour of how to manage your business information effectively."
  },
  {
    id: "sections",
    attachTo: {
      element: "[role='tablist']",
      on: "bottom"
    },
    buttons: [
      {
        action() {
          return this.back();
        },
        text: 'Back'
      },
      {
        action() {
          return this.next();
        },
        text: 'Next'
      }
    ],
    title: "Business Sections",
    text: "Navigate between different aspects of your business using these tabs. Each section contains specific information and metrics."
  },
  {
    id: "content",
    attachTo: {
      element: ".section-content",
      on: "bottom"
    },
    buttons: [
      {
        action() {
          return this.back();
        },
        text: 'Back'
      },
      {
        action() {
          return this.next();
        },
        text: 'Next'
      }
    ],
    title: "Section Content",
    text: "Add or edit detailed information about this aspect of your business. Use the edit button to make changes."
  },
  {
    id: "fields",
    attachTo: {
      element: ".fields-section",
      on: "top"
    },
    buttons: [
      {
        action() {
          return this.back();
        },
        text: 'Back'
      },
      {
        action() {
          return this.next();
        },
        text: 'Next'
      }
    ],
    title: "Structured Fields",
    text: "Track specific metrics and data points in a structured format. Click the edit icon to update individual fields."
  },
  {
    id: "history",
    attachTo: {
      element: ".history-button",
      on: "bottom"
    },
    buttons: [
      {
        action() {
          return this.back();
        },
        text: 'Back'
      },
      {
        action() {
          return this.complete();
        },
        text: 'Finish'
      }
    ],
    title: "Change History",
    text: "View the history of changes made to your business information, including AI-suggested updates."
  }
];

export function BusinessTour({ isFirstVisit = true, onComplete }: TourProps) {
  const [hasShownTour, setHasShownTour] = useState(false);
  const tour = useShepherdTour();

  useEffect(() => {
    if (!tour || hasShownTour) return;

    // Only start tour if isFirstVisit is true
    if (!isFirstVisit) {
      return;
    }

    try {
      // Remove any existing steps
      tour.steps.forEach(() => tour.removeStep(tour.steps[0]));

      // Add steps to the tour
      steps.forEach(step => {
        tour?.addStep(step);
      });

      // Handle tour completion
      tour.on('complete', () => {
        setHasShownTour(true);
        localStorage.setItem("businessTourCompleted", "true");
        onComplete?.();
      });

      // Handle tour cancellation
      tour.on('cancel', () => {
        setHasShownTour(true);
        localStorage.setItem("businessTourCompleted", "true");
        onComplete?.();
      });

      // Start the tour after a short delay to ensure elements are mounted
      setTimeout(() => {
        tour.start();
      }, 500);

      return () => {
        tour.cancel();
      };
    } catch (error) {
      console.error("Error initializing tour:", error);
    }
  }, [tour, isFirstVisit, hasShownTour, onComplete]);

  // Reset hasShownTour when isFirstVisit changes
  useEffect(() => {
    if (isFirstVisit) {
      setHasShownTour(false);
    }
  }, [isFirstVisit]);

  return null;
}