'use client'
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function ConditionalFooter() {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith('/dashboard');
  
  // Don't render footer on dashboard pages
  if (isDashboard) {
    return null;
  }
  
  return (
    <footer className="bg-gray-900 text-white py-12 px-4" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div>
            <img src="/main-logo.svg" alt="Semantix Logo" className="h-8 w-auto mb-4 brightness-0 invert" />
            <p className="text-gray-400 text-sm">חיפוש חכם מבוסס בינה מלאכותית שמבין את הלקוחות שלכם</p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">המוצר</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><Link href="#features" className="hover:text-white transition-colors">תכונות</Link></li>
              <li><Link href="#how-it-works" className="hover:text-white transition-colors">איך זה עובד</Link></li>
              <li><Link href="/product" className="hover:text-white transition-colors">הדגמה</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">יצירת קשר ותמיכה</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><a href="https://wa.me/972542251558" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">WhatsApp</a></li>
              <li><a href="mailto:Sales@semantix-ai.com" className="hover:text-white transition-colors">אימייל</a></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">תנאי השימוש</Link></li>
              <li><Link href="/privacy" className="hover:text-white transition-colors">מדיניות פרטיות</Link></li>
            </ul>
          </div>
        </div>
        
        {/* Social Links */}
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm mb-4 md:mb-0">© 2025 Semantix. כל הזכויות שמורות.</p>
          <div className="flex space-x-2">
            <a href="https://wa.me/972542251558" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors p-3 rounded-md hover:bg-gray-800">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2.546 20.2A1.01 1.01 0 0 0 3.8 21.454l3.032-.892A9.957 9.957 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/>
              </svg>
            </a>
            <a href="mailto:Sales@semantix-ai.com" className="text-gray-400 hover:text-white transition-colors p-3 rounded-md hover:bg-gray-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </a>
            <a href="https://www.linkedin.com/company/semantix-io/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors p-3 rounded-md hover:bg-gray-800">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.85-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
} 