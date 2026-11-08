import type { Metadata } from "next";
import { CONTACT_URL, LegalPage, List, Section } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy · ThinkFlow",
  description: "What ThinkFlow collects, how it is used, and how to delete it.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="November 8, 2026">
      <p>
        ThinkFlow is a free study planner that turns assignments into step-by-step plans. This page
        explains what information ThinkFlow collects, why, and what you can do about it. The short
        version: we only keep what the app needs to work, we never sell it, and we don&apos;t show ads.
      </p>

      <Section title="What we collect">
        <List>
          <li>
            <strong className="text-foreground">Your account details.</strong> When you sign in with
            Google, we receive your name, email address and profile picture. When you sign in with an
            email link, we receive your email address.
          </li>
          <li>
            <strong className="text-foreground">What you create.</strong> Projects, flows, tasks, due
            dates, AI chat messages, your study preferences, and the text extracted from PDFs you
            upload. The PDF file itself is not stored, only its text.
          </li>
          <li>
            <strong className="text-foreground">Usage counts.</strong> How many AI requests you make
            each day, so the free daily limit can be applied fairly.
          </li>
        </List>
        <p>We do not collect your Google password, contacts, files, calendar or any other Google data.</p>
      </Section>

      <Section title="How we use it">
        <List>
          <li>To sign you in and keep your projects private to your account.</li>
          <li>To show your name and picture inside the app.</li>
          <li>
            To build and update your plans with AI. When you use an AI feature, the relevant project
            details (title, description, deadline, uploaded text, existing steps and your message)
            are sent to an AI provider to generate a response.
          </li>
        </List>
        <p>We don&apos;t use your information for advertising, and we never sell or rent it.</p>
      </Section>

      <Section title="Google user data">
        <p>
          ThinkFlow&apos;s use of information received from Google APIs adheres to the{" "}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noreferrer"
            className="text-baby-blue hover:text-baby-blue-dark"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements. Google sign-in is used only to identify you; your
          Google profile is not shared with AI providers or used to train AI models.
        </p>
      </Section>

      <Section title="Services that process your data">
        <List>
          <li>
            <strong className="text-foreground">Supabase</strong>: sign-in and the database that
            stores your account and projects.
          </li>
          <li>
            <strong className="text-foreground">Render</strong>: runs ThinkFlow&apos;s server.
          </li>
          <li>
            <strong className="text-foreground">Vercel</strong>: hosts the website.
          </li>
          <li>
            <strong className="text-foreground">Groq and Google Gemini</strong>: generate AI plans and
            chat replies. They process the project text you send under their own terms, and free
            tiers may let a provider use submissions to improve its services. Please don&apos;t put
            sensitive personal information (such as health or financial details) in your projects.
          </li>
        </List>
      </Section>

      <Section title="Cookies and storage">
        <p>
          ThinkFlow uses cookies only to keep you signed in, and your browser&apos;s local storage to
          remember your light or dark theme. There are no advertising or tracking cookies.
        </p>
      </Section>

      <Section title="Keeping and deleting your data">
        <p>
          Your data stays until you delete it. You can delete any project, step or chat history in the
          app at any time, and deleting a project removes its flow, tasks and chat. To delete your
          whole account and everything in it,{" "}
          <a href={CONTACT_URL} target="_blank" rel="noreferrer" className="text-baby-blue hover:text-baby-blue-dark">
            contact us
          </a>{" "}
          and we will remove it within 30 days.
        </p>
      </Section>

      <Section title="Security">
        <p>
          Data is sent over encrypted connections (HTTPS), and the server checks your sign-in on every
          request so no one else can open your projects. No system is perfectly secure, but we take
          reasonable steps to protect your information.
        </p>
      </Section>

      <Section title="Children">
        <p>
          ThinkFlow is meant for students aged 13 and older. If you are under 13, please don&apos;t
          create an account. If you believe a child under 13 has signed up, contact us and we&apos;ll
          delete the account.
        </p>
      </Section>

      <Section title="Changes and contact">
        <p>
          If this policy changes, we&apos;ll update the date at the top of this page. Questions or
          requests:{" "}
          <a href={CONTACT_URL} target="_blank" rel="noreferrer" className="text-baby-blue hover:text-baby-blue-dark">
            open an issue on ThinkFlow&apos;s GitHub
          </a>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
