import { Link } from "react-router-dom";

const SERIF = "font-['Playfair_Display',Georgia,'Times_New_Roman',serif]";
const LAST_UPDATED = "June 8, 2026";

function Section({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className={`${SERIF} mb-3 text-[22px] font-bold text-[#ededf2]`}>{title}</h2>
      <div className="space-y-3 text-[15px] leading-[1.7] text-[#9a9aae]">{children}</div>
    </section>
  );
}

export default function Privacy() {
  return (
    <div className="min-h-screen bg-[#08080f] text-[#ededf2] [background-image:radial-gradient(900px_500px_at_50%_-8%,rgba(124,108,255,0.16),transparent_60%)]">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b-[0.5px] border-white/[0.07] px-7">
        <Link to="/" className="no-underline">
          <span className={`${SERIF} text-xl font-bold tracking-[0.01em] text-[#b6abff]`}>VocabTrainer</span>
        </Link>
        <Link to="/" className="text-[13.5px] text-[#9a9aae] no-underline transition-colors hover:text-[#b6abff]">
          ← Back to app
        </Link>
      </header>

      <main className="mx-auto max-w-[760px] px-6 py-12">
        <h1 className={`${SERIF} mb-2 text-[40px] font-extrabold leading-[1.05] text-[#ededf2]`}>Privacy Policy</h1>
        <p className="mb-10 text-[13px] text-[#6a6a7c]">Last updated: {LAST_UPDATED}</p>

        <Section title="1. Overview">
          <p>This Privacy Policy explains what information VocabTrainer (the “Service”) collects, how it is used, and the choices you have. By using the Service, you consent to the practices described here.</p>
        </Section>

        <Section title="2. Information We Collect">
          <p><strong className="text-[#ededf2]">Account information:</strong> your username and email address. If you sign in with Google, we receive your Google account’s email, name, and a unique identifier.</p>
          <p><strong className="text-[#ededf2]">Content you create:</strong> the words you save to your library and your quiz attempts and scores.</p>
          <p><strong className="text-[#ededf2]">Authentication data:</strong> we store a securely hashed refresh token to keep you signed in, in an httpOnly cookie. We do not store your password in plain text; passwords are hashed.</p>
        </Section>

        <Section title="3. How We Use Your Information">
          <p>We use your information to provide and maintain the Service: to authenticate you, generate and store definitions, run quizzes, send account-related emails (such as password resets), and protect against abuse.</p>
        </Section>

        <Section title="4. Third-Party Services">
          <p>We share limited data with providers strictly to operate the Service:</p>
          <p><strong className="text-[#ededf2]">Google</strong> — for sign-in (OAuth).<br />
          <strong className="text-[#ededf2]">OpenAI</strong> — the word you search is sent to generate definitions and quiz content.<br />
          <strong className="text-[#ededf2]">Email provider</strong> — to deliver transactional emails like password resets.<br />
          <strong className="text-[#ededf2]">Database hosting</strong> — your account and content are stored with our database host.</p>
          <p>These providers process data under their own privacy policies.</p>
        </Section>

        <Section title="5. Cookies">
          <p>We use a single httpOnly cookie to store your refresh token so your session persists. This cookie is essential for authentication and is not used for advertising or tracking.</p>
        </Section>

        <Section title="6. Data Retention">
          <p>We retain your account information and content for as long as your account exists. When you delete your account, your associated data is removed from our active systems.</p>
        </Section>

        <Section title="7. Security">
          <p>We take reasonable measures to protect your data, including password hashing, hashed and rotated refresh tokens, and HTTPS. No method of transmission or storage is completely secure, however, and we cannot guarantee absolute security.</p>
        </Section>

        <Section title="8. Your Rights">
          <p>You can update your username or email in your profile, request deletion of your account, and contact us with privacy questions. Depending on your jurisdiction, you may have additional rights to access or erase your data.</p>
        </Section>

        <Section title="9. Children’s Privacy">
          <p>The Service is not directed to children under 13 (or the minimum age in your jurisdiction), and we do not knowingly collect their information.</p>
        </Section>

        <Section title="10. Changes to This Policy">
          <p>We may update this Policy from time to time. Material changes will be reflected by updating the “Last updated” date above.</p>
        </Section>

        <Section title="11. Contact">
          <p>Questions about this Policy? Contact us at <span className="text-[#b6abff]">harshalkatkar76@gmail.com</span>.</p>
        </Section>

        <div className="mt-10 border-t-[0.5px] border-white/[0.07] pt-6 text-[13px] text-[#6a6a7c]">
          See also our{" "}
          <Link to="/terms" className="text-[#b6abff] no-underline hover:underline">Terms of Service</Link>.
        </div>
      </main>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&display=swap');`}</style>
    </div>
  );
}