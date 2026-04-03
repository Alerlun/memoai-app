import { useNavigate } from 'react-router-dom'

const LAST_UPDATED = 'April 2, 2026'
const CONTACT_EMAIL = 'alerlunai@gmail.com'

export default function PrivacyPage() {
  const nav = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--tx)' }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 200, background: 'var(--nb-bg)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--bd)', height: 58, display: 'flex', alignItems: 'center', padding: '0 18px', gap: 12 }}>
        <button className="btn btn-g btn-sm" onClick={() => nav(-1)}>← Back</button>
        <span style={{ fontSize: 15, fontWeight: 700 }}>Privacy Policy</span>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 20px 80px' }}>
        {/* Hero */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-.4px', marginBottom: 8 }}>Privacy Policy</h1>
          <p style={{ fontSize: 13, color: 'var(--t3)' }}>Last updated: {LAST_UPDATED}</p>
        </div>

        <Section title="1. Introduction & Scope">
          <P>MemoAI ("<strong>we</strong>", "<strong>us</strong>", or "<strong>our</strong>") operates the MemoAI web application and related services (collectively, the "<strong>Service</strong>"). This Privacy Policy explains how we collect, use, store, and share your information when you use our Service.</P>
          <P>This policy applies to all users, visitors, and customers of MemoAI, including free and paid subscribers. By using the Service, you agree to the practices described in this policy.</P>
        </Section>

        <Section title="2. What Data We Collect">
          <SubHeading>Personal Information</SubHeading>
          <BulletList items={[
            'Full name (provided at registration)',
            'Email address (used for account login and communications)',
          ]} />
          <SubHeading>Account & Preference Data</SubHeading>
          <BulletList items={[
            'Subscription status (free or Pro)',
            'Language preference (English or Swedish)',
            'Upload usage count (to enforce weekly free tier limits)',
            'Theme preference (light or dark mode)',
          ]} />
          <SubHeading>Study Content</SubHeading>
          <BulletList items={[
            'Text you upload or paste to generate study materials (notes, lecture transcripts, textbook excerpts)',
            'Generated flashcards, quiz questions, practice tests, and study notes',
            'Spaced-repetition progress data (memory scores, review intervals)',
          ]} />
          <SubHeading>Usage & Technical Data</SubHeading>
          <BulletList items={[
            'IP address (collected automatically by our hosting and database providers)',
            'Browser type and operating system (via standard HTTP headers)',
            'Session tokens (for keeping you logged in)',
          ]} />
          <P>We do <strong>not</strong> collect health data, financial data, precise location, or any government-issued identification numbers.</P>
        </Section>

        <Section title="3. How We Collect Data">
          <BulletList items={[
            'Directly from you — when you create an account, upload study content, or change settings',
            'Automatically — when you use the Service, our hosting infrastructure (Vercel) and database provider (Supabase) log standard technical data such as IP addresses and request timestamps',
            'Through authentication — Supabase Auth handles login and session management and stores your email and password hash',
          ]} />
          <P>We do not use social logins, third-party sign-in (such as Google or Facebook), or collect data from external partners or data brokers.</P>
        </Section>

        <Section title="4. Why We Use Your Data">
          <BulletList items={[
            'Providing the Service — storing your account, study sets, progress, and preferences',
            'AI content generation — your uploaded text is sent to OpenAI\'s API to generate flashcards, quizzes, practice tests, and study notes',
            'Enforcing usage limits — tracking weekly upload counts for free-tier users',
            'Payment processing — verifying subscription status via Stripe webhooks (we never see or store raw card details)',
            'Service improvement — understanding general usage patterns to improve the product (we do not use individual user content for this)',
            'Security — detecting and preventing abuse, fraud, and unauthorized access',
          ]} />
          <P>We do <strong>not</strong> use your data for advertising, sell it to third parties, or use it to train AI models beyond OpenAI's standard API processing terms.</P>
        </Section>

        <Section title="5. Legal Basis (GDPR)">
          <P>If you are located in the European Union or European Economic Area, we process your personal data under the following legal bases:</P>
          <BulletList items={[
            'Contractual necessity — to fulfil our agreement with you and provide the Service (account management, study set storage, AI generation)',
            'Legitimate interests — to improve the Service, ensure security, and prevent fraud, where these interests are not overridden by your rights',
            'Legal obligation — to comply with applicable laws and regulations',
            'Consent — where required by law, such as for non-essential cookies or marketing communications (we currently do not send marketing emails)',
          ]} />
        </Section>

        <Section title="6. Cookies & Tracking Technologies">
          <SubHeading>Essential Cookies & Local Storage</SubHeading>
          <P>We use browser localStorage (not traditional cookies) to store:</P>
          <BulletList items={[
            'Your language preference',
            'Your theme preference (light/dark mode)',
            'Your study streak counter',
            'Supabase authentication session tokens',
          ]} />
          <P>These are strictly necessary for the Service to function. We do <strong>not</strong> use analytics cookies, advertising cookies, or third-party tracking pixels.</P>
          <SubHeading>Controlling Storage</SubHeading>
          <P>You can clear all stored data by clearing your browser's localStorage and cookies for this site. This will log you out and reset preferences.</P>
        </Section>

        <Section title="7. Data Sharing & Disclosure">
          <P>We share your data only with the following service providers, strictly for the purpose of delivering the Service:</P>
          <BulletList items={[
            'Supabase (supabase.com) — database, authentication, and backend infrastructure. Your account data and study sets are stored on Supabase servers.',
            'OpenAI (openai.com) — AI content generation. Text you upload is sent to OpenAI\'s API to generate study materials. OpenAI processes this data under their API usage policies.',
            'Stripe (stripe.com) — payment processing for Pro subscriptions. We share your email with Stripe to create a billing customer. Card details are handled entirely by Stripe and never touch our servers.',
            'Vercel (vercel.com) — hosting and deployment of the MemoAI web application.',
          ]} />
          <P>We <strong>do not sell</strong> your personal data. We <strong>do not share</strong> your data with advertisers, data brokers, or marketing platforms.</P>
          <P>We may disclose your information if required by law, court order, or government authority, or to protect the rights and safety of MemoAI or its users.</P>
        </Section>

        <Section title="8. Data Retention">
          <BulletList items={[
            'Account data (name, email) — retained for as long as your account is active. Deleted upon account deletion request.',
            'Study sets and content — retained until you delete them or your account is closed.',
            'Spaced-repetition progress data — retained as part of your study sets.',
            'Authentication logs — retained by Supabase in accordance with their data retention policies (typically 90 days for logs).',
            'Payment records — Stripe retains transaction records as required by financial regulations (typically 7 years).',
          ]} />
          <P>After account deletion, residual data may remain in encrypted backups for up to 90 days before being permanently purged.</P>
        </Section>

        <Section title="9. Your Rights">
          <P>Depending on your location, you may have the following rights regarding your personal data:</P>
          <BulletList items={[
            'Access — request a copy of the personal data we hold about you',
            'Correction — request that inaccurate or incomplete data be corrected',
            'Deletion — request deletion of your account and associated data ("right to be forgotten")',
            'Objection — object to processing based on legitimate interests',
            'Portability — request your data in a structured, machine-readable format',
            'Restriction — request that we restrict processing of your data in certain circumstances',
          ]} />
          <P>To exercise any of these rights, contact us at <strong>{CONTACT_EMAIL}</strong>. We will respond within 30 days. For EU/EEA residents, you also have the right to lodge a complaint with your national data protection authority.</P>
        </Section>

        <Section title="10. Data Security">
          <BulletList items={[
            'All data in transit is encrypted using TLS/HTTPS',
            'Database access is protected by Row-Level Security (RLS) — each user can only access their own data',
            'Authentication is handled by Supabase Auth with bcrypt password hashing',
            'API keys are stored as environment variables and never exposed in client-side source code (note: the OpenAI API key is used client-side — we recommend users be aware of this)',
            'Access to production systems is restricted to authorised personnel only',
          ]} />
          <P>While we implement industry-standard security measures, no system is 100% secure. We cannot guarantee that your data will never be accessed, disclosed, or destroyed by a breach. We will notify affected users of any security incident as required by law.</P>
        </Section>

        <Section title="11. International Data Transfers">
          <P>MemoAI is operated with infrastructure based primarily in the United States (Vercel, Supabase, OpenAI, Stripe). If you are located in the EU/EEA or another jurisdiction with data transfer restrictions, your data may be transferred to and processed in the United States.</P>
          <P>These transfers are conducted under appropriate safeguards, including Standard Contractual Clauses (SCCs) where applicable, as provided by our service providers. For more information, refer to the privacy policies of Supabase, OpenAI, Stripe, and Vercel.</P>
        </Section>

        <Section title="12. Children's Privacy">
          <P>MemoAI is intended for users aged <strong>16 and older</strong>. We do not knowingly collect personal data from children under the age of 16. If you are under 16, please do not use the Service or provide any personal information.</P>
          <P>If we become aware that we have collected data from a child under 16 without parental consent, we will take steps to delete that data promptly. If you believe we may have data from a child, please contact us at {CONTACT_EMAIL}.</P>
        </Section>

        <Section title="13. Changes to This Policy">
          <P>We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. When we make material changes, we will update the "Last updated" date at the top of this page.</P>
          <P>For significant changes, we will notify you by displaying a notice within the application. Your continued use of the Service after any changes constitutes acceptance of the updated policy.</P>
        </Section>

        <Section title="14. Contact Information" last>
          <P>If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:</P>
          <div style={{ background: 'var(--s2)', borderRadius: 'var(--r)', padding: '16px 20px', marginTop: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>MemoAI</div>
            <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 4 }}>
              Email: <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--ac)' }}>{CONTACT_EMAIL}</a>
            </div>
            <div style={{ fontSize: 13, color: 'var(--t2)' }}>
              We aim to respond to all privacy-related inquiries within <strong>30 days</strong>.
            </div>
          </div>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children, last }) {
  return (
    <div style={{ marginBottom: last ? 0 : 32, paddingBottom: last ? 0 : 32, borderBottom: last ? 'none' : '1px solid var(--bd)' }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12, color: 'var(--tx)' }}>{title}</h2>
      {children}
    </div>
  )
}

function SubHeading({ children }) {
  return <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t2)', marginBottom: 6, marginTop: 12 }}>{children}</p>
}

function P({ children }) {
  return <p style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--t2)', marginBottom: 8 }}>{children}</p>
}

function BulletList({ items }) {
  return (
    <ul style={{ paddingLeft: 4, marginBottom: 8 }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 6 }}>
          <span style={{ color: 'var(--ac)', fontSize: 16, lineHeight: 1.4, flexShrink: 0 }}>•</span>
          <span style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--t2)' }}>{item}</span>
        </li>
      ))}
    </ul>
  )
}
