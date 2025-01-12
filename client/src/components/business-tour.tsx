import { useEffect, useState } from "react";
import { useShepherdTourContext } from "./shepherd-provider";
import type { Step } from 'shepherd.js';
import "../styles/tour.css";

interface TourProps {
  isFirstVisit?: boolean;
  onComplete?: () => void;
}

const steps: Step.StepOptions[] = [
  {
    id: "welcome",
    attachTo: {
      element: ".business-header",
      on: "bottom"
    },
    buttons: [
      {
        classes: 'shepherd-button-secondary',
        text: 'Skip',
        type: 'cancel'
      },
      {
        text: 'Get Started',
        type: 'next'
      }
    ],
    classes: 'shepherd-theme-custom',
    title: "Welcome to Business Management",
    text: [
      "Let's take a quick tour of how to manage your business information effectively.",
      "<div class='shepherd-progress'>",
      "<div class='shepherd-progress-dots'>",
      "<div class='shepherd-progress-dot active'></div>",
      "<div class='shepherd-progress-dot'></div>",
      "<div class='shepherd-progress-dot'></div>",
      "<div class='shepherd-progress-dot'></div>",
      "<div class='shepherd-progress-dot'></div>",
      "</div>",
      "<span>Step 1 of 5</span>",
      "</div>"
    ].join('')
  },
  {
    id: "sections",
    attachTo: {
      element: "[role='tablist']",
      on: "bottom"
    },
    buttons: [
      {
        text: 'Back',
        type: 'back'
      },
      {
        text: 'Next',
        type: 'next'
      }
    ],
    title: "Business Sections",
    text: [
      "Navigate between different aspects of your business using these tabs. Each section contains specific information and metrics.",
      "<div class='shepherd-progress'>",
      "<div class='shepherd-progress-dots'>",
      "<div class='shepherd-progress-dot'></div>",
      "<div class='shepherd-progress-dot active'></div>",
      "<div class='shepherd-progress-dot'></div>",
      "<div class='shepherd-progress-dot'></div>",
      "<div class='shepherd-progress-dot'></div>",
      "</div>",
      "<span>Step 2 of 5</span>",
      "</div>"
    ].join('')
  },
  {
    id: "content",
    attachTo: {
      element: ".section-content",
      on: "bottom"
    },
    buttons: [
      {
        text: 'Back',
        type: 'back'
      },
      {
        text: 'Next',
        type: 'next'
      }
    ],
    title: "Section Content",
    text: [
      "Add or edit detailed information about this aspect of your business. Use the edit button to make changes.",
      "<div class='shepherd-progress'>",
      "<div class='shepherd-progress-dots'>",
      "<div class='shepherd-progress-dot'></div>",
      "<div class='shepherd-progress-dot'></div>",
      "<div class='shepherd-progress-dot active'></div>",
      "<div class='shepherd-progress-dot'></div>",
      "<div class='shepherd-progress-dot'></div>",
      "</div>",
      "<span>Step 3 of 5</span>",
      "</div>"
    ].join('')
  },
  {
    id: "fields",
    attachTo: {
      element: ".fields-section",
      on: "top"
    },
    buttons: [
      {
        text: 'Back',
        type: 'back'
      },
      {
        text: 'Next',
        type: 'next'
      }
    ],
    title: "Structured Fields",
    text: [
      "Track specific metrics and data points in a structured format. Click the edit icon to update individual fields.",
      "<div class='shepherd-progress'>",
      "<div class='shepherd-progress-dots'>",
      "<div class='shepherd-progress-dot'></div>",
      "<div class='shepherd-progress-dot'></div>",
      "<div class='shepherd-progress-dot'></div>",
      "<div class='shepherd-progress-dot active'></div>",
      "<div class='shepherd-progress-dot'></div>",
      "</div>",
      "<span>Step 4 of 5</span>",
      "</div>"
    ].join('')
  },
  {
    id: "history",
    attachTo: {
      element: ".history-button",
      on: "bottom"
    },
    buttons: [
      {
        text: 'Back',
        type: 'back'
      },
      {
        text: 'Finish',
        type: 'next'
      }
    ],
    title: "Change History",
    text: [
      "View the history of changes made to your business information, including AI-suggested updates.",
      "<div class='shepherd-progress'>",
      "<div class='shepherd-progress-dots'>",
      "<div class='shepherd-progress-dot'></div>",
      "<div class='shepherd-progress-dot'></div>",
      "<div class='shepherd-progress-dot'></div>",
      "<div class='shepherd-progress-dot'></div>",
      "<div class='shepherd-progress-dot active'></div>",
      "</div>",
      "<span>Step 5 of 5</span>",
      "</div>"
    ].join('')
  }
];

export function BusinessTour({ isFirstVisit = true, onComplete }: TourProps) {
  const [hasShownTour, setHasShownTour] = useState(false);
  const { tour } = useShepherdTourContext();

  useEffect(() => {
    if (!tour || hasShownTour) return;

    try {
      // Remove any existing steps
      tour.steps.forEach((step) => {
        if (step.id) tour.removeStep(step.id);
      });

      // Add steps to the tour
      steps.forEach(step => tour.addStep(step));

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

      // Start the tour if it's the first visit or manually triggered
      if (isFirstVisit) {
        setTimeout(() => {
          tour.start();
        }, 500);
      }

      return () => {
        tour.complete();
      };
    } catch (error) {
      console.error("Error initializing tour:", error);
    }
  }, [tour, isFirstVisit, hasShownTour, onComplete]);

  // Reset hasShownTour when isFirstVisit changes to true
  useEffect(() => {
    if (isFirstVisit) {
      setHasShownTour(false);
    }
  }, [isFirstVisit]);

  return null;
}