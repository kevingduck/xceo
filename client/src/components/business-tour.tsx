import { useEffect, useState } from "react";
import { useShepherdTour } from "./shepherd-provider";
import Shepherd from "shepherd.js";

interface TourProps {
  isFirstVisit?: boolean;
  onComplete?: () => void;
}

const steps: Shepherd.Step.StepOptions[] = [
  {
    id: "welcome",
    attachTo: {
      element: "body",
      on: "center"
    },
    classes: 'shepherd-theme-custom',
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
        text: 'Start Tour'
      }
    ],
    title: "Welcome to AI CEO",
    text: "Let's take a quick tour of your AI-powered business management platform."
  },
  {
    id: "dashboard",
    attachTo: {
      element: "[href='/']",
      on: "right"
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
    title: "Dashboard",
    text: "Your central command center. Get a quick overview of your business metrics, recent updates, and important tasks."
  },
  {
    id: "business",
    attachTo: {
      element: "[href='/business']",
      on: "right"
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
    title: "Business Overview",
    text: "Manage and track your business information across different areas. Review metrics and make strategic decisions."
  },
  {
    id: "tasks",
    attachTo: {
      element: "[href='/tasks']",
      on: "right"
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
    title: "Tasks",
    text: "Track and manage your business tasks. Organize priorities and monitor progress."
  },
  {
    id: "chat",
    attachTo: {
      element: "[href='/chat']",
      on: "right"
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
    title: "AI Chat",
    text: "Get instant AI-powered business insights and support. Ask questions and receive strategic guidance."
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
      while (tour.steps.length > 0) {
        tour.removeStep(tour.steps[0]);
      }

      // Add steps to the tour
      steps.forEach((step: Shepherd.Step.StepOptions) => {
        tour.addStep(step);
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