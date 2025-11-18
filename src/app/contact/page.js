'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Mail, Phone, MapPin, CheckCircle } from 'lucide-react';

export default function ContactPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Send data to API
      const response = await fetch('/api/contact-submission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit form');
      }

      // Success!
      setIsSubmitting(false);
      setIsSuccess(true);
      
      console.log('✅ Contact form submitted successfully:', data);
      
      // Reset form after 3 seconds
      setTimeout(() => {
        setFormData({
          name: '',
          email: '',
          phone: '',
          company: '',
          message: '',
        });
        setIsSuccess(false);
      }, 3000);

    } catch (error) {
      console.error('❌ Error submitting contact form:', error);
      setIsSubmitting(false);
      alert('אירעה שגיאה בשליחת הטופס. אנא נסה שוב.');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 py-20 px-4">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300 rounded-full filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-300 rounded-full filter blur-3xl opacity-20 animate-pulse"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-16" dir="rtl">
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-6 transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
            <span>חזרה לדף הבית</span>
          </button>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-pink-600 text-transparent bg-clip-text">
            בואו נדבר
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            נשמח לשמוע ממך ולעזור לך להפוך את החיפוש באתר שלך ליעיל ומדויק יותר
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Contact Form */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/50" dir="rtl">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-right">שלחו לנו הודעה</h2>
            
            {isSuccess ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">ההודעה נשלחה בהצלחה!</h3>
                <p className="text-gray-600 text-center">נחזור אליך בהקדם האפשרי</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2 text-right">
                    שם מלא *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-right"
                    placeholder="הזינו את שמכם המלא"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2 text-right">
                    אימייל *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-right"
                    placeholder="example@email.com"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2 text-right">
                    טלפון
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-right"
                    placeholder="050-1234567"
                  />
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2 text-right">
                    חברה / אתר
                  </label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-right"
                    placeholder="שם החברה או כתובת האתר"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2 text-right">
                    הודעה *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    value={formData.message}
                    onChange={handleChange}
                    rows="5"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all resize-none text-right"
                    placeholder="ספרו לנו קצת על הצרכים שלכם..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white font-bold py-4 px-8 rounded-full text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isSubmitting ? 'שולח...' : 'שלח הודעה'}
                </button>
              </form>
            )}
          </div>

          {/* Contact Info & Quick Actions */}
          <div className="space-y-6" dir="rtl">
            {/* Schedule a Call Card */}
            <div className="bg-gradient-to-br from-purple-600 to-purple-500 rounded-2xl shadow-2xl p-8 text-white">
              <h3 className="text-2xl font-bold mb-4 text-right">העדיפו לדבר ישירות?</h3>
              <p className="text-purple-100 mb-6 text-right">
                קבעו שיחת ייעוץ עם אחד ממומחי Semantix והבינו איך אנחנו יכולים לעזור לכם
              </p>
              <button
                onClick={() => window.open('https://calendly.com/semantix-sales/30min', '_blank')}
                className="w-full bg-white text-purple-600 font-bold py-3 px-6 rounded-full hover:shadow-lg transition-all duration-300 transform hover:scale-105"
              >
                קביעת שיחה בקלנדלי
              </button>
            </div>

            {/* Contact Details */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/50">
              <h3 className="text-2xl font-bold text-gray-800 mb-6 text-right">פרטי התקשרות</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="text-right flex-1">
                    <h4 className="font-semibold text-gray-800 mb-1">אימייל</h4>
                    <a href="mailto:hello@semantix.co.il" className="text-purple-600 hover:text-purple-700 transition-colors">
                      hello@semantix.co.il
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="text-right flex-1">
                    <h4 className="font-semibold text-gray-800 mb-1">טלפון</h4>
                    <a href="tel:+972501234567" className="text-purple-600 hover:text-purple-700 transition-colors">
                      050-123-4567
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="text-right flex-1">
                    <h4 className="font-semibold text-gray-800 mb-1">מיקום</h4>
                    <p className="text-gray-600">תל אביב, ישראל</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Why Choose Us */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/50">
              <h3 className="text-2xl font-bold text-gray-800 mb-6 text-right">למה Semantix?</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
                  <p className="text-gray-700 text-right">הטמעה מהירה תוך פחות מ-10 דקות</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
                  <p className="text-gray-700 text-right">תמיכה מלאה בעברית ובאנגלית</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
                  <p className="text-gray-700 text-right">שיפור של 20-40% בהמרות מחיפוש</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
                  <p className="text-gray-700 text-right">תמיכה טכנית מקצועית 24/7</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 0.2;
          }
          50% {
            opacity: 0.3;
          }
        }
        .animate-pulse {
          animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
}

