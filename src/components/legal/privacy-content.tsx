import { LegalList, LegalP, LegalSection } from "@/components/legal/legal-page-shell";

export function PrivacyContent() {
  return (
    <>
      <LegalP>
        This privacy notice discloses the privacy practices for GƎNƎSIS Trade Analytics
        (&ldquo;GƎNƎSIS&rdquo;, &ldquo;us&rdquo;, &ldquo;we&rdquo;, or &ldquo;our&rdquo;).
      </LegalP>
      <LegalP>
        GƎNƎSIS operates this website and application. This page informs you of our policies
        regarding the collection, use, and disclosure of personal data when you use our Service and
        the choices you have associated with that data.
      </LegalP>
      <LegalP>
        We use your data to provide and improve the Service. By using the Service, you agree to the
        collection and use of information in accordance with this policy.
      </LegalP>
      <LegalP>
        This privacy notice applies solely to information collected by this website and application.
        It will notify you of the following:
      </LegalP>
      <LegalList
        items={[
          "What personally identifiable information is collected from you through the site, how it is used and with whom it may be shared.",
          "What choices are available to you regarding the use of your data.",
          "The security procedures in place to protect the misuse of your information.",
          "How you can correct any inaccuracies in the information."
        ]}
      />

      <LegalSection title="Information Collection, Use, and Sharing">
        <LegalP>
          We are the sole owners of the information collected on this site. We only have access to
          or collect information that you voluntarily give us when using the site. We will not sell
          or rent this information to anyone.
        </LegalP>
        <LegalP>
          We use your information to provide the services of the site. We will not share your
          information with any third party outside of our organization, other than as necessary to
          fulfill your request. Specifically:
        </LegalP>
        <LegalList
          items={[
            "If you explicitly share a trade publicly, certain information about your trade will be made available on the site. If you do not wish this information to be public, please do not share trades.",
            "Unless you ask us not to, we may contact you via email in the future to tell you about specials, new products or services, or changes to this privacy policy.",
            "We collect statistical information on web traffic using a third party web analytics service; this may use a cookie on your computer, but no user-identifiable information is ever shared with this third party other than typical web analytics such as IP address, browser, etc.",
            "In no event will your individual data be made available to anyone, nor will any personally identifiable information be made available or associated with any of the data."
          ]}
        />
      </LegalSection>

      <LegalSection title="Your Access to and Control Over Information">
        <LegalP>
          You may opt out of any future contacts from us at any time. You can do the following at
          any time by contacting us via email at{" "}
          <a href="mailto:support@genesis.app" className="text-brand-300 hover:underline">
            support@genesis.app
          </a>
          :
        </LegalP>
        <LegalList
          items={[
            "Have us delete any data we have about you.",
            "Express any concern you have about our use of your data."
          ]}
        />
      </LegalSection>

      <LegalSection title="Security">
        <LegalP>
          We take precautions to protect your information. When you submit sensitive information via
          the website, your information is protected both online and offline.
        </LegalP>
        <LegalP>
          Wherever we collect sensitive information (such as your trade data), that information is
          encrypted and transmitted to us in a secure way.
        </LegalP>
        <LegalP>
          If you feel that we are not abiding by this privacy policy, please contact us immediately
          via email at{" "}
          <a href="mailto:support@genesis.app" className="text-brand-300 hover:underline">
            support@genesis.app
          </a>
          .
        </LegalP>
      </LegalSection>

      <LegalSection title="Subscription and Billing Data">
        <LegalP>
          If you subscribe to a paid plan, payment information is processed by our payment provider.
          We store subscription status, plan tier, and billing history necessary to provide the
          Service. We do not store full credit card numbers on our servers.
        </LegalP>
      </LegalSection>

      <LegalSection title="Data Retention">
        <LegalP>
          We retain your account data for as long as your account is active. You may request
          deletion of your account and associated trade data from Settings or by contacting
          support. Some data may be retained as required by law or for legitimate business purposes.
        </LegalP>
      </LegalSection>

      <LegalSection title="Changes to This Policy">
        <LegalP>
          We may update this Privacy Policy from time to time. We will notify you of material
          changes by posting the new policy on this page and updating the effective date. Your
          continued use of the Service after changes constitutes acceptance of the updated policy.
        </LegalP>
      </LegalSection>
    </>
  );
}
