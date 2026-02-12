'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check } from 'lucide-react';

export default function ContactPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', company: '', message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    // ... לוגיקת השליחה שלך נשארת זהה
    setTimeout(() => { setIsSubmitting(false); setIsSuccess(true); }, 1500);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-white text-[#171a20] font-sans selection:bg-black selection:text-white">
      <div className="max-w-screen-xl mx-auto px-6 py-24">
        
        {/* Navigation */}
        <nav className="mb-20" dir="rtl">
          <button
            onClick={() => router.push('/')}
            className="group flex items-center gap-2 text-sm font-medium tracking-widest uppercase transition-opacity hover:opacity-60"
          >
            <ArrowRight className="w-4 h-4" />
            <span>חזרה ל-Semantix</span>
          </button>
        </nav>

        <div className="grid lg:grid-cols-12 gap-20">
          
          {/* Left Side: Header & Info */}
          <div className="lg:col-span-5" dir="rtl">
            <h1 className="text-4xl md:text-5xl font-medium tracking-tight mb-8">
              בואו נדבר על <br />עתיד החיפוש שלכם.
            </h1>
            <p className="text-lg text-gray-500 max-w-md leading-relaxed mb-12">
              אנחנו עוזרים למותגים מובילים להפוך כוונת רכישה לתוצאות בשטח. מלאו את הפרטים ונחזור אליכם לשיחת אפיון.
            </p>

            <div className="space-y-8 border-t border-gray-100 pt-12">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mb-2">אימייל</h4>
                <a href="mailto:sales@semantix.co.il" className="text-lg hover:underline underline-offset-4 transition-all">sales@semantix.co.il</a>
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mb-2">Sales</h4>
                <p className="text-lg">050-123-4567</p>
              </div>
            </div>
          </div>

          {/* Right Side: Form */}
          <div className="lg:col-span-7" dir="rtl">
            {isSuccess ? (
              <div className="h-full flex flex-col items-center justify-center border border-gray-100 rounded-sm p-20 text-center animate-in fade-in zoom-in duration-500">
                <div className="w-16 h-16 border border-black rounded-full flex items-center justify-center mb-6">
                  <Check className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-medium mb-2">הבקשה התקבלה</h3>
                <p className="text-gray-500">צוות Semantix יצור איתך קשר בהקדם.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-10">
                <div className="grid md:grid-cols-2 gap-10">
                  <div className="relative group">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block">שם מלא</label>
                    <input
                      type="text" name="name" required value={formData.name} onChange={handleChange}
                      className="w-full bg-transparent border-b border-gray-200 py-2 focus:border-black outline-none transition-colors"
                      placeholder="ישראל ישראלי"
                    />
                  </div>
                  <div className="relative group">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block">אימייל עסקי</label>
                    <input
                      type="email" name="email" required value={formData.email} onChange={handleChange}
                      className="w-full bg-transparent border-b border-gray-200 py-2 focus:border-black outline-none transition-colors"
                      placeholder="name@company.com"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-10">
                  <div className="relative group">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block">טלפון</label>
                    <input
                      type="tel" name="phone" value={formData.phone} onChange={handleChange}
                      className="w-full bg-transparent border-b border-gray-200 py-2 focus:border-black outline-none transition-colors"
                    />
                  </div>
                  <div className="relative group">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block">חברה / URL</label>
                    <input
                      type="text" name="company" value={formData.company} onChange={handleChange}
                      className="w-full bg-transparent border-b border-gray-200 py-2 focus:border-black outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="relative group">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block">איך נוכל לעזור?</label>
                  <textarea
                    name="message" required rows="4" value={formData.message} onChange={handleChange}
                    className="w-full bg-transparent border-b border-gray-200 py-2 focus:border-black outline-none transition-colors resize-none"
                  />
                </div>

                <div className="pt-6">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full md:w-64 bg-[#171a20] text-white text-xs font-bold uppercase tracking-[0.2em] py-4 rounded-sm transition-all duration-500 hover:bg-white hover:text-black border border-[#171a20] disabled:opacity-30"
                  >
                    {isSubmitting ? 'שולח...' : 'שליחת בקשה'}
                  </button>
                </div>
              </form>
            )}
          </div>

        </div>


  
      </div>
    </div>
  );
}