"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";

export default function GetStartedButton() {
  const { data: session } = useSession();

  // Don't render anything if user is logged in
  if (session) {
    return null;
  }

  // Only show Get Started button for non-logged in users
  return (
    <a 
      href="https://calendly.com/semantix-sales" 
      target="_blank"
      rel="noopener noreferrer"
      className="hidden sm:inline-flex bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-full hover:shadow-lg transition-all duration-300 transform hover:scale-105 font-medium -translate-x-4"
    >
     נסו בחינם
    </a>
  );
} 