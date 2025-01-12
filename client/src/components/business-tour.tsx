import { useEffect, useState } from "react";
import { useShepherdTour } from "./shepherd-provider";
import Shepherd from "shepherd.js";
import "../styles/tour.css";

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
        classes: 'shepherd-button-primary',
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
    classes: 'shepherd-theme-custom',
    buttons: [
      {
        action() {
          return this.back();
        },
        classes: 'shepherd-button-secondary',
        text: 'Back'
      },
      {
        action() {
          return this.next();
        },
        classes: 'shepherd-button-primary',
        text: 'Next'
      }
    ],
    title: "Dashboard",
    text: "Your central command center for business metrics and updates."
  },
  {
    id: "business",
    attachTo: {
      element: "[href='/business']",
      on: "right"
    },
    classes: 'shepherd-theme-custom',
    buttons: [
      {
        action() {
          return this.back();
        },
        classes: 'shepherd-button-secondary',
        text: 'Back'
      },
      {
        action() {
          return this.next();
        },
        classes: 'shepherd-button-primary',
        text: 'Next'
      }
    ],
    title: "Business Overview",
    text: "Track and manage your business information here."
  },
  {
    id: "tasks",
    attachTo: {
      element: "[href='/tasks']",
      on: "right"
    },
    classes: 'shepherd-theme-custom',
    buttons: [
      {
        action() {
          return this.back();
        },
        classes: 'shepherd-button-secondary',
        text: 'Back'
      },
      {
        action() {
          return this.next();
        },
        classes: 'shepherd-button-primary',
        text: 'Next'
      }
    ],
    title: "Tasks",
    text: "Organize and manage your business tasks."
  },
  {
    id: "chat",
    attachTo: {
      element: "[href='/chat']",
      on: "right"
    },
    classes: 'shepherd-theme-custom',
    buttons: [
      {
        action() {
          return this.back();
        },
        classes: 'shepherd-button-secondary',
        text: 'Back'
      },
      {
        action() {
          return this.complete();
        },
        classes: 'shepherd-button-primary',
        text: 'Finish'
      }
    ],
    title: "AI Chat",
    text: "Get AI-powered business insights and support."
  }
];

export function BusinessTour({ isFirstVisit = true, onComplete }: TourProps) {
  const [hasShownTour, setHasShownTour] = useState(false);
  const tour = useShepherdTour();

  useEffect(() => {
    if (!tour || hasShownTour) return;

    if (!isFirstVisit) {
      return;
    }

    try {
      // Remove any existing steps
      while (tour.steps.length > 0) {
        tour.removeStep(tour.steps[0]);
      }

      // Add steps to the tour
      steps.forEach((step) => {
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

      // Start the tour after elements are mounted
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