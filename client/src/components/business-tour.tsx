import { useEffect, useState } from "react";
import { useShepherdTour } from "react-shepherd";
import "shepherd.js/dist/css/shepherd.css";

const tourSteps = [
  {
    id: "welcome",
    title: "Welcome to Business Management",
    text: "Let's take a quick tour of how to manage your business information effectively.",
    attachTo: {
      element: ".business-header",
      on: "bottom"
    },
    classes: "shepherd-theme-custom",
    buttons: [
      {
        type: "cancel",
        classes: "shepherd-button-secondary",
        text: "Skip"
      },
      {
        type: "next",
        text: "Get Started"
      }
    ]
  },
  {
    id: "sections",
    title: "Business Sections",
    text: "Navigate between different aspects of your business using these tabs. Each section contains specific information and metrics.",
    attachTo: {
      element: "[role='tablist']",
      on: "bottom"
    },
    buttons: [
      {
        type: "back",
        text: "Back"
      },
      {
        type: "next",
        text: "Next"
      }
    ]
  },
  {
    id: "content",
    title: "Section Content",
    text: "Add or edit detailed information about this aspect of your business. Use the edit button to make changes.",
    attachTo: {
      element: ".section-content",
      on: "bottom"
    },
    buttons: [
      {
        type: "back",
        text: "Back"
      },
      {
        type: "next",
        text: "Next"
      }
    ]
  },
  {
    id: "fields",
    title: "Structured Fields",
    text: "Track specific metrics and data points in a structured format. Click the edit icon to update individual fields.",
    attachTo: {
      element: ".fields-section",
      on: "top"
    },
    buttons: [
      {
        type: "back",
        text: "Back"
      },
      {
        type: "next",
        text: "Next"
      }
    ]
  },
  {
    id: "history",
    title: "Change History",
    text: "View the history of changes made to your business information, including AI-suggested updates.",
    attachTo: {
      element: ".history-button",
      on: "bottom"
    },
    buttons: [
      {
        type: "back",
        text: "Back"
      },
      {
        type: "next",
        text: "Finish"
      }
    ]
  }
];

interface TourProps {
  isFirstVisit?: boolean;
}

export function BusinessTour({ isFirstVisit = true }: TourProps) {
  const [hasShownTour, setHasShownTour] = useState(false);
  const tour = useShepherdTour();

  useEffect(() => {
    if (!tour || !isFirstVisit || hasShownTour) return;

    try {
      tour.addSteps(tourSteps);

      // Save tour completion status
      tour.on("complete", () => {
        setHasShownTour(true);
        localStorage.setItem("businessTourCompleted", "true");
      });

      tour.on("cancel", () => {
        setHasShownTour(true);
        localStorage.setItem("businessTourCompleted", "true");
      });

      // Wait for elements to be rendered before starting tour
      setTimeout(() => {
        tour.start();
      }, 500);
    } catch (error) {
      console.error("Error initializing tour:", error);
    }
  }, [tour, isFirstVisit, hasShownTour]);

  return null;
}