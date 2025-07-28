'use client';

import { useEffect } from 'react';

/**
 * This component connects the menu button in the layout to the dashboard's mobile menu functionality.
 * It finds all menu buttons by their class or data attribute and attaches click handlers to them.
 */
export default function MenuConnector() {
  useEffect(() => {
    // Function to connect menu buttons to the global function
    const connectMenuButtons = () => {
      // Find all menu buttons by class, ID, or data attribute
      // Adjust these selectors based on how the menu button is identified in your layout
      const menuButtons = document.querySelectorAll('.menu-button, [data-menu-button], button[aria-label="Open menu"]');
      
      menuButtons.forEach(button => {
        console.log('Found menu button, attaching handler', button);
        
        // Remove existing listeners to avoid duplicates
        button.removeEventListener('click', handleMenuButtonClick);
        
        // Add click handler
        button.addEventListener('click', handleMenuButtonClick);
      });
    };
    
    // Handle menu button click
    const handleMenuButtonClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Menu button clicked via MenuConnector');
      
      // Try different methods to open the menu
      if (window.openMobileMenu) {
        window.openMobileMenu();
      } else {
        // Dispatch a custom event as fallback
        document.dispatchEvent(new CustomEvent('openMobileMenu'));
      }
    };
    
    // Connect buttons on initial load
    connectMenuButtons();
    
    // Also connect buttons when DOM changes (for dynamically added buttons)
    const observer = new MutationObserver(mutations => {
      connectMenuButtons();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    return () => {
      // Clean up
      observer.disconnect();
      
      const menuButtons = document.querySelectorAll('.menu-button, [data-menu-button], button[aria-label="Open menu"]');
      menuButtons.forEach(button => {
        button.removeEventListener('click', handleMenuButtonClick);
      });
    };
  }, []);
  
  // This component doesn't render anything
  return null;
} 