import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBk26qcFo76e4G3zMakEA7erwNBZ-m1Jy4",
  authDomain: "semantix-english-contact-us.firebaseapp.com",
  projectId: "semantix-english-contact-us",
  storageBucket: "semantix-english-contact-us.firebasestorage.app",
  messagingSenderId: "914151871441",
  appId: "1:914151871441:web:6cb5d730db48f2f98246f0",
  measurementId: "G-K13TW19N5G"
};

// Initialize Firebase
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const db = getFirestore(app);

export async function POST(request) {
  try {
    const data = await request.json();

    // Add submission to Firestore
    const docRef = await addDoc(collection(db, "contactSubmissions"), {
      ...data,
      timestamp: serverTimestamp(),
    });

    return Response.json({ 
      success: true, 
      id: docRef.id,
      message: "Form submitted successfully" 
    });
  } catch (error) {
    console.error("Error saving contact form submission:", error);
    
    // Check if it's a permission error
    if (error.code === 'permission-denied') {
      return Response.json(
        { error: "Firebase permissions issue. Please update Firestore security rules." },
        { status: 500 }
      );
    }
    
    return Response.json(
      { error: "Failed to submit form. Please try again." },
      { status: 500 }
    );
  }
}

