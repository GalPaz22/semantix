import React from 'react';

export const metadata = {
  title: 'Terms of Service | Semantix',
  description: 'The terms governing your use of the Semantix website and search platform.',
  alternates: {
    canonical: 'https://www.semantix-ai.com/terms',
  },
};

const TermsAndConditions = () => {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 bg-white">
      <div className="prose prose-gray max-w-none">
        <header className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
          <p className="text-lg text-gray-600">Last updated: June 26, 2025</p>
        </header>

        <div className="space-y-12">
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Welcome to Semantix AI's proprietary artificial intelligence search software platform. These Terms of Service ("Terms") govern your use of our website, 
              software-as-a-service products, and related services (collectively, the "Service"). 
              By accessing or using our Service, you agree to be bound by these Terms.
            </p>
            <p className="text-gray-700 leading-relaxed">
              If you do not agree to these Terms, please do not use our Service. We reserve the right to modify 
              these Terms at any time, and such modifications will be effective immediately upon posting.
            </p>
          </section>

          {/* Services */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Our Software Services</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Semantix AI develops and provides proprietary artificial intelligence software solutions, specifically:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
              <li>AI-powered semantic search software (SaaS)</li>
              <li>Machine learning algorithms for e-commerce optimization</li>
              <li>Cloud-based artificial intelligence search solutions</li>
              <li>API access to our proprietary AI technology</li>
              <li>Software documentation and technical resources</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mb-4">
              Our software is designed as a standalone SaaS solution that provides AI-powered search capabilities 
              through API integration. All software, algorithms, and intellectual property are owned and developed 
              exclusively by Semantix AI.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Our software operates independently and does not modify, redistribute, or resell third-party software. 
              We maintain full compliance with all applicable platform terms of service and industry regulations.
            </p>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Intellectual Property Rights</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">Ownership</h3>
                <p className="text-gray-700 leading-relaxed">
                  Semantix AI owns all rights, title, and interest in and to our software, including all intellectual 
                  property rights. Our AI algorithms, machine learning models, and software code are proprietary 
                  and protected by copyright, trade secret, and other applicable laws.
                </p>
              </div>
              
              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">Original Development</h3>
                <p className="text-gray-700 leading-relaxed">
                  All software provided through our Service is originally developed by Semantix AI. We do not 
                  resell, redistribute, or modify third-party software. Our AI technology is built from the ground 
                  up using our own proprietary algorithms and methodologies.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">Platform Compliance</h3>
                <p className="text-gray-700 leading-relaxed">
                  Our software integrates with e-commerce platforms through legitimate API connections and standard 
                  integration methods. We maintain strict compliance with all platform terms of service and do not 
                  violate any third-party intellectual property rights.
                </p>
              </div>
            </div>
          </section>

          {/* Account and Registration */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Account Registration</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              To access our AI software services, you must create an account. You are responsible for:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
              <li>Providing accurate and complete business information</li>
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized use</li>
              <li>Ensuring your use complies with all applicable laws and regulations</li>
            </ul>
          </section>

          {/* Payment and Billing */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Payment and Billing</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">Payment Processing</h3>
                <p className="text-gray-700 leading-relaxed">
                  All payments are processed securely through Paddle, our authorized payment processor. 
                  By making a purchase, you agree to Paddle's terms of service and privacy policy. 
                  We accept major credit cards, PayPal, and other payment methods as available through Paddle.
                </p>
              </div>
              
              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">SaaS Subscription Model</h3>
                <p className="text-gray-700 leading-relaxed">
                  Our AI software is provided as a Software-as-a-Service (SaaS) solution with recurring subscription 
                  billing. You are purchasing access to our proprietary AI technology, not a physical product or 
                  consulting service. All prices are listed in USD unless otherwise specified.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">Pricing</h3>
                <p className="text-gray-700 leading-relaxed">
                  Semantix offers custom pricing based on your catalog, traffic, and product needs.
                  Subscription terms, including fees and billing cycles, are provided in your order form
                  or commercial agreement. For current pricing, please contact our sales team at{' '}
                  <a href="mailto:Sales@semantix-ai.com" className="text-purple-700 hover:underline">
                    Sales@semantix-ai.com
                  </a>
                  .
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">Automatic Billing</h3>
                <p className="text-gray-700 leading-relaxed">
                  For subscription-based software access, billing occurs automatically at the beginning of each 
                  billing cycle. You may cancel your subscription at any time through your account dashboard 
                  or by contacting our support team.
                </p>
              </div>
            </div>
          </section>

          {/* Refund Policy */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Refund Policy</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">30-Day Money-Back Guarantee</h3>
                <p className="text-gray-700 leading-relaxed">
                  We offer a 30-day money-back guarantee for all software subscriptions. If you're not satisfied 
                  with our AI software performance, you may request a full refund within 30 days of purchase.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">Refund Conditions</h3>
                <p className="text-gray-700 leading-relaxed mb-3">To be eligible for a refund:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li>Request must be made within 30 days of original subscription purchase</li>
                  <li>You must provide a valid technical reason for the refund request</li>
                  <li>The software must not have processed more than 10,000 search queries</li>
                  <li>You agree to discontinue using our AI software upon receiving the refund</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">Refund Process</h3>
                <p className="text-gray-700 leading-relaxed">
                  Refund requests should be submitted to support@semantix-ai.com with your subscription details. 
                  Approved refunds will be processed within 5-10 business days to your original payment method 
                  through Paddle's system.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">Non-Refundable Items</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-2">
                  <li>Custom API development work or modifications</li>
                  <li>Subscriptions used for more than 30 days</li>
                  <li>Renewed subscription fees (unless cancelled before renewal)</li>
                  <li>Enterprise license agreements with custom terms</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Software License */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Software License and Usage Rights</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">SaaS License Grant</h3>
                <p className="text-gray-700 leading-relaxed">
                  Upon subscription, we grant you a non-exclusive, non-transferable license to use our AI software 
                  as a service during your active subscription period, subject to the usage limits specified 
                  in your subscription plan.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">Permitted Use</h3>
                <p className="text-gray-700 leading-relaxed mb-3">You may use our AI software for:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li>Implementing AI-powered search functionality in your applications</li>
                  <li>Processing search queries through our API</li>
                  <li>Integrating our software with your existing systems</li>
                  <li>Using our AI algorithms for legitimate business purposes</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">Usage Restrictions</h3>
                <p className="text-gray-700 leading-relaxed mb-3">You may not:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-2">
                  <li>Redistribute, resell, or sublicense our software</li>
                  <li>Reverse engineer, decompile, or attempt to extract our algorithms</li>
                  <li>Remove or modify any proprietary notices or branding</li>
                  <li>Use the software for illegal or unauthorized purposes</li>
                  <li>Exceed the API usage limits specified in your subscription</li>
                  <li>Create competing AI search software using our technology</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Software Support */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Software Support and Maintenance</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We provide technical support and regular software updates during your active subscription period. 
              Support is provided via email and our support portal during business hours (Sunday-Thursday, 9 AM - 5 PM Israel Time).
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              Our AI software operates through cloud-based APIs and does not require local installation. 
              We maintain 99.9% uptime SLA and continuously improve our algorithms and performance.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Support includes API documentation, integration assistance, and troubleshooting. We do not provide 
              consulting services, custom development, or business strategy advice - only technical software support.
            </p>
          </section>

          {/* Privacy Policy */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Privacy Policy</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">Information We Collect</h3>
                <p className="text-gray-700 leading-relaxed mb-3">We collect the following types of information:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-2">
                  <li><strong>Account Information:</strong> Business name, email address, billing information</li>
                  <li><strong>API Usage Data:</strong> Search queries, performance metrics (anonymized)</li>
                  <li><strong>Technical Data:</strong> System logs, error reports, API response times</li>
                  <li><strong>Communication Data:</strong> Support ticket contents and correspondence</li>
                  <li><strong>Payment Information:</strong> Processed securely through Paddle (we do not store payment details)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">How We Use Your Information</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-2">
                  <li>To provide and improve our AI software services</li>
                  <li>To process payments and send receipts</li>
                  <li>To provide technical support and software maintenance</li>
                  <li>To send important service updates and software notifications</li>
                  <li>To comply with legal obligations and software licensing requirements</li>
                  <li>To enhance our AI algorithms and search performance</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">Data Processing and Third Parties</h3>
                <p className="text-gray-700 leading-relaxed">
                  We do not sell or rent your personal information. We may share information with:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mt-2">
                  <li><strong>Paddle:</strong> For secure payment processing</li>
                  <li><strong>Cloud Service Providers:</strong> For hosting our AI software infrastructure</li>
                  <li><strong>Analytics Tools:</strong> For software performance monitoring (anonymized data only)</li>
                  <li><strong>Legal Requirements:</strong> When required by law or to protect our intellectual property</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">Data Security</h3>
                <p className="text-gray-700 leading-relaxed">
                  We implement enterprise-grade security measures to protect your data and our proprietary AI software. 
                  All data is encrypted in transit and at rest, with regular security audits and compliance monitoring.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">Your Rights</h3>
                <p className="text-gray-700 leading-relaxed">
                  You have the right to access, update, or delete your personal information. 
                  Contact us at support@semantix-ai.com to exercise these rights.
                </p>
              </div>
            </div>
          </section>

          {/* Disclaimers and Limitations */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Software Disclaimers and Limitations</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">Service Availability</h3>
                <p className="text-gray-700 leading-relaxed">
                  While we strive for 99.9% uptime, we cannot guarantee uninterrupted software service. 
                  We may perform maintenance or updates that temporarily affect AI software availability.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">AI Software Performance</h3>
                <p className="text-gray-700 leading-relaxed">
                  Our AI algorithms are continuously improving but may not be perfect for every use case. 
                  Search results and performance may vary based on data quality and implementation factors.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">Limitation of Liability</h3>
                <p className="text-gray-700 leading-relaxed">
                  To the maximum extent permitted by law, our liability for any damages arising from your 
                  use of our AI software shall not exceed the amount you paid for the specific subscription 
                  that gave rise to the claim in the preceding 12 months.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">Integration Compatibility</h3>
                <p className="text-gray-700 leading-relaxed">
                  Our software integrates with various platforms through standard APIs. While we maintain 
                  compatibility with current platform versions, we cannot guarantee compatibility with all 
                  third-party systems or future platform changes.
                </p>
              </div>
            </div>
          </section>

          {/* Compliance */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Regulatory Compliance</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">Software Compliance</h3>
                <p className="text-gray-700 leading-relaxed">
                  Our AI software complies with all applicable software licensing laws, data protection regulations, 
                  and industry standards. We maintain compliance with GDPR, CCPA, and other relevant privacy laws.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">Platform Integration Compliance</h3>
                <p className="text-gray-700 leading-relaxed">
                  We maintain strict compliance with all third-party platform terms of service and API usage policies. 
                  Our software does not violate any platform restrictions or intellectual property rights.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">Financial Compliance</h3>
                <p className="text-gray-700 leading-relaxed">
                  All financial transactions are processed through Paddle, which maintains compliance with 
                  international payment regulations, anti-money laundering laws, and card network requirements.
                </p>
              </div>
            </div>
          </section>

          {/* Termination */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Termination</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We may terminate or suspend your access to our AI software immediately, without prior notice, 
              for conduct that violates these Terms, threatens our software security, or is harmful to other users.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Upon termination, your right to use our AI software ceases immediately, and you must 
              discontinue all API usage and remove any references to our software from your systems.
            </p>
          </section>

          {/* Governing Law */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Governing Law</h2>
            <p className="text-gray-700 leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of Israel, 
              without regard to its conflict of law provisions. Any disputes arising under these Terms shall be 
              subject to the exclusive jurisdiction of the courts in Tel Aviv, Israel.
            </p>
          </section>

          {/* Contact Information */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Contact Information</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              If you have any questions about these Terms of Service, please contact us:
            </p>
            <div className="bg-gray-50 p-6 rounded-lg">
              <p className="text-gray-700"><strong>Email:</strong> support@semantix-ai.com</p>
              <p className="text-gray-700"><strong>Company:</strong> Semantix AI</p>
              <p className="text-gray-700"><strong>Business Type:</strong> AI Software Development & SaaS Provider</p>
              <p className="text-gray-700"><strong>Location:</strong> Israel</p>
            </div>
          </section>

          {/* Updates to Terms */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. Updates to These Terms</h2>
            <p className="text-gray-700 leading-relaxed">
              We reserve the right to modify these Terms at any time to reflect changes in our AI software, 
              legal requirements, or business practices. We will notify users of significant changes via email 
              or through our software platform. Continued use of our services after changes constitutes 
              acceptance of the new Terms.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;