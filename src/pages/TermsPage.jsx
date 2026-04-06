import { useNavigate } from 'react-router-dom'
import logoSrc from '../assets/logo.png'

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: `By creating an account or using MemoAI ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service. These Terms apply to all users of the Service, whether free or paid.`,
  },
  {
    title: '2. Description of Service',
    body: `MemoAI is an AI-powered study tool that generates flashcards, quizzes, study plans, and other learning materials from content you provide. The Service is intended for personal, non-commercial study use. AI-generated content is provided as a study aid and may occasionally contain inaccuracies — always verify important information from authoritative sources.`,
  },
  {
    title: '3. Account Registration',
    body: `You must create an account to use MemoAI. You agree to provide accurate, complete, and current information during registration. You are responsible for safeguarding your account credentials and for all activity that occurs under your account. You must be at least 13 years old to use the Service. Notify us immediately if you suspect unauthorised access to your account.`,
  },
  {
    title: '4. Subscription Plans',
    body: `MemoAI offers two subscription tiers:\n\n• Free Plan — Up to 3 content uploads per month. Access to core study features including flashcards, quiz mode, and study plans.\n\n• Pro Plan — Unlimited uploads per month, access to all advanced features, and priority processing. The Pro Plan is billed at €4.99 per month (or the local currency equivalent displayed at checkout).`,
  },
  {
    title: '5. Billing and Payment',
    body: `Pro Plan subscriptions are billed on a recurring monthly basis through Stripe, our third-party payment processor. By subscribing to the Pro Plan, you authorise MemoAI to charge your payment method each month until you cancel.\n\nAll payments are processed securely by Stripe. MemoAI does not store your payment card details on our servers. Prices may be updated with at least 30 days' advance notice sent to your registered email address.`,
  },
  {
    title: '6. Cancellation Policy',
    body: `You may cancel your Pro subscription at any time through the billing portal in your account settings.\n\nWhen you cancel:\n• You retain full Pro access until the end of your current billing period.\n• You will not be charged for any subsequent billing periods.\n• At the end of the paid period, your account automatically reverts to the Free Plan.\n• No partial refunds are issued for remaining days in a paid billing period.\n\nThis policy ensures you always receive the full value of what you have already paid for. Cancellation takes effect at the end of the current billing cycle, not immediately.`,
  },
  {
    title: '7. Refund Policy',
    body: `All payments for the Pro Plan are non-refundable, except where required by applicable consumer protection law. If you believe a charge was made in error, contact us within 14 days of the charge date. We will review your case and issue a refund if the circumstances warrant it under applicable law. Users in the EU have the right to withdraw from a subscription within 14 days of the initial purchase unless the service has already been used.`,
  },
  {
    title: '8. Acceptable Use',
    body: `You agree not to use the Service to:\n• Upload, process, or share illegal, harmful, defamatory, or infringing content.\n• Attempt to reverse-engineer, decompile, or replicate any part of the Service.\n• Use automated bots, scrapers, or scripts to access the Service.\n• Share your account credentials with other people.\n• Interfere with or disrupt the Service or its infrastructure.\n• Circumvent any usage limits or access controls.\n\nViolation of these rules may result in immediate suspension or permanent termination of your account without refund.`,
  },
  {
    title: '9. User Content',
    body: `You retain full ownership of any content you upload to MemoAI. By uploading content, you grant MemoAI a limited, non-exclusive, royalty-free licence to process that content solely for the purpose of generating study materials and providing the Service to you.\n\nWe do not use your content to train AI models or sell it to third parties. Your content is processed transiently to generate study materials and is not retained beyond what is necessary to operate the Service. You are solely responsible for ensuring you have the rights to any content you upload.`,
  },
  {
    title: '10. Intellectual Property',
    body: `MemoAI, its name, logo, design, software, and all original content (excluding user-uploaded content) are the exclusive property of MemoAI and its licensors, protected by applicable intellectual property laws.\n\nAI-generated flashcards, quizzes, and study materials are generated for your personal study use. You may not reproduce, distribute, sell, or create derivative works from MemoAI's proprietary materials without prior written permission.`,
  },
  {
    title: '11. Privacy',
    body: `We collect only the information necessary to provide and improve the Service, including your name, email address, and usage data. We do not sell your personal data to third parties.\n\nPayment information is handled entirely by Stripe and is never stored on MemoAI's servers. We use Supabase for secure data storage and Anthropic's API for AI content generation. For full details on how we handle your data, please refer to our Privacy Policy (coming soon).`,
  },
  {
    title: '12. Disclaimer of Warranties',
    body: `The Service is provided on an "as is" and "as available" basis without warranties of any kind, either express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement.\n\nMemoAI does not warrant that the Service will be uninterrupted, error-free, or completely secure. We make no guarantees about the accuracy, completeness, or reliability of AI-generated study content.`,
  },
  {
    title: '13. Limitation of Liability',
    body: `To the maximum extent permitted by applicable law, MemoAI and its owners, employees, and affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages — including loss of data, loss of revenue, or loss of opportunity — arising from your use of or inability to use the Service.\n\nIn all cases, MemoAI's total aggregate liability to you shall not exceed the total amount you paid for the Service in the 12 months immediately preceding the claim.`,
  },
  {
    title: '14. Termination',
    body: `MemoAI reserves the right to suspend or permanently terminate your account if you violate these Terms, engage in fraudulent activity, abuse the Service, or for any other legitimate operational reason, with reasonable notice where practicable.\n\nYou may delete your account at any time from your account settings. Upon account deletion, your personal data and study sets will be permanently removed from our systems in accordance with our data retention policy.`,
  },
  {
    title: '15. Changes to These Terms',
    body: `We may update these Terms from time to time to reflect changes in the law, our Service, or our business practices. We will notify you of material changes via email or an in-app notice at least 14 days before they take effect.\n\nYour continued use of the Service after updated Terms take effect constitutes your acceptance of the revised Terms. If you do not agree to the updated Terms, you must stop using the Service and may cancel your subscription.`,
  },
  {
    title: '16. Governing Law and Jurisdiction',
    body: `These Terms of Service are governed by and construed in accordance with the laws of Sweden, without regard to its conflict of law principles.\n\nAny disputes arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts of Sweden. Consumers in the EU may also have the right to bring disputes before their local courts under applicable consumer protection law.`,
  },
  {
    title: '17. Contact Us',
    body: `If you have any questions, concerns, or complaints about these Terms of Service or the Service in general, please contact us:\n\nMemoAI Support\nEmail: alerlunai@gmail.com\n\nWe aim to respond to all enquiries within 2 business days.`,
  },
]

export default function TermsPage() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'var(--nb-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid var(--bd)', height: 58, display: 'flex', alignItems: 'center', padding: '0 18px', gap: 12 }}>
        <button onClick={() => navigate(-1)} className="btn btn-g btn-sm" style={{ padding: '7px 12px', fontSize: 13 }}>
          ← Back
        </button>
        <div style={{ width: 26, height: 26, borderRadius: 7, background: '#fff', overflow: 'hidden', padding: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <img src={logoSrc} alt="MemoAI" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
        </div>
        <span style={{ fontSize: 16, fontWeight: 700 }}>Terms of Service</span>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px' }}>
        {/* Title block */}
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8, letterSpacing: '-.5px' }}>Terms of Service</h1>
          <p style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 12 }}>Effective date: April 1, 2026 · Last updated: April 1, 2026</p>
          <div style={{ background: 'var(--al)', border: '1px solid var(--ac)', borderRadius: 'var(--r)', padding: '12px 16px' }}>
            <p style={{ fontSize: 13, color: 'var(--ac)', lineHeight: 1.6, fontWeight: 500 }}>
              Please read these Terms carefully before using MemoAI. They form a legal agreement between you and MemoAI governing your use of the Service.
            </p>
          </div>
        </div>

        {/* Sections */}
        {SECTIONS.map(({ title, body }) => (
          <div key={title} style={{ marginBottom: 30 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10, color: 'var(--tx)' }}>{title}</h2>
            <p style={{ fontSize: 14, color: 'var(--t2)', lineHeight: 1.75, whiteSpace: 'pre-line' }}>{body}</p>
          </div>
        ))}

        {/* Footer */}
        <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid var(--bd)', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 16 }}>MemoAI</p>
          <button onClick={() => navigate(-1)} className="btn btn-s btn-sm">← Go Back</button>
        </div>
      </div>
    </div>
  )
}
