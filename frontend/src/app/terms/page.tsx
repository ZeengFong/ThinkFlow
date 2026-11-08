import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_URL, LegalPage, List, Section } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service · ThinkFlow",
  description: "The rules for using ThinkFlow.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="November 8, 2026">
      <p>
        These terms cover your use of ThinkFlow, a free study planner. By signing in, you agree to
        them. If you don&apos;t agree, please don&apos;t use ThinkFlow.
      </p>

      <Section title="Using ThinkFlow">
        <List>
          <li>You need to be at least 13 years old to create an account.</li>
          <li>Keep your sign-in secure. You&apos;re responsible for activity in your account.</li>
          <li>ThinkFlow is free. There are daily limits on AI use so the service stays free for everyone.</li>
        </List>
      </Section>

      <Section title="Your content">
        <p>
          Everything you create in ThinkFlow (projects, steps, notes and uploads) stays yours. You give
          ThinkFlow permission to store it and to process it, including sending it to AI providers,
          only as needed to run the app for you. See the{" "}
          <Link href="/privacy" className="text-baby-blue hover:text-baby-blue-dark">
            Privacy Policy
          </Link>{" "}
          for details.
        </p>
      </Section>

      <Section title="AI-generated plans">
        <p>
          AI suggestions, time estimates and due dates can be wrong or incomplete. Always check them
          against your actual assignment instructions and deadlines. ThinkFlow helps you plan; it
          doesn&apos;t do your work for you, and you&apos;re responsible for following your school&apos;s
          academic integrity rules.
        </p>
      </Section>

      <Section title="Things you must not do">
        <List>
          <li>Try to access other people&apos;s accounts or data, or break the app&apos;s security.</li>
          <li>Upload content that is illegal, harmful, or that you don&apos;t have the right to share.</li>
          <li>Use automated scripts to overload the service or get around the AI limits.</li>
        </List>
        <p>We may suspend accounts that break these rules.</p>
      </Section>

      <Section title="No guarantees">
        <p>
          ThinkFlow is provided &ldquo;as is&rdquo;, without warranties of any kind. It runs on free
          hosting, so it may be slow to wake up, occasionally unavailable, or change over time. Keep
          your own copy of important deadlines. To the fullest extent the law allows, ThinkFlow and its
          developers aren&apos;t liable for missed deadlines, lost data or other losses from using the
          service.
        </p>
      </Section>

      <Section title="Changes and contact">
        <p>
          We may update these terms; the date at the top shows the latest version, and continuing to
          use ThinkFlow means you accept the changes. You can stop using ThinkFlow at any time.
          Questions:{" "}
          <a href={CONTACT_URL} target="_blank" rel="noreferrer" className="text-baby-blue hover:text-baby-blue-dark">
            open an issue on ThinkFlow&apos;s GitHub
          </a>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
