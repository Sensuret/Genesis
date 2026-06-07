import { LegalList, LegalP, LegalSection } from "@/components/legal/legal-page-shell";

const SUPPORT = "support@genesis.app";

export function TermsContent() {
  return (
    <>
      <LegalP>
        Note: we actively solicit feedback on our terms of service; please send any comments or
        questions to{" "}
        <a href={`mailto:${SUPPORT}`} className="text-brand-300 hover:underline">
          {SUPPORT}
        </a>
      </LegalP>

      <LegalSection title="1. User's Acknowledgment and Acceptance of Terms">
        <LegalP>
          GƎNƎSIS (&ldquo;GƎNƎSIS&rdquo;, &ldquo;Us&rdquo;, or &ldquo;We&rdquo;) provides the
          GƎNƎSIS site and various related services (collectively, the &ldquo;site&rdquo;) to you,
          the user, subject to your compliance with all the terms, conditions, and notices contained
          or referenced herein (the &ldquo;Terms of Service&rdquo;), as well as any other written
          agreement between us and you.
        </LegalP>
        <LegalP>
          BY USING THIS SITE, YOU AGREE TO BE BOUND BY THESE TERMS OF SERVICE. IF YOU DO NOT WISH TO
          BE BOUND BY THESE TERMS OF SERVICE, PLEASE EXIT THE SITE NOW. YOUR REMEDY FOR
          DISSATISFACTION WITH THIS SITE, OR ANY PRODUCTS, SERVICES, CONTENT, OR OTHER INFORMATION
          AVAILABLE ON OR THROUGH THIS SITE, IS TO STOP USING THE SITE AND/OR THOSE PARTICULAR
          PRODUCTS OR SERVICES.
        </LegalP>
        <LegalP>
          These Terms of Service are effective as of October 29th, 2020. We expressly reserve the
          right to change these Terms of Service from time to time without notice to you. Your
          continued use of this site after such modifications will constitute acknowledgement of the
          modified Terms of Service and agreement to abide and be bound by the modified Terms of
          Service.
        </LegalP>
      </LegalSection>

      <LegalSection title="2. Description of Services">
        <LegalP>
          We make various services available on this site including, but not limited to, trade
          journaling, trade analysis, sharing or publishing of trades, and other like services. You
          are responsible for providing, at your own expense, all equipment necessary to use the
          services, including a computer and Internet access.
        </LegalP>
        <LegalP>
          We reserve the sole right to either modify or discontinue the site, including any of the
          site&apos;s features, at any time with or without notice to you. We will not be liable to
          you or any third party should we exercise such right.
        </LegalP>
      </LegalSection>

      <LegalSection title="3. Registration Data and Privacy">
        <LegalP>
          In order to access some of the services on this site, you will be required to use an
          account and password that can be obtained by completing our online registration form. By
          registering, you agree that all information provided in the Registration Data is true and
          accurate and that you will maintain and update this information as required.
        </LegalP>
        <LegalP>
          You also grant us the right to disclose to third parties certain Registration Data about
          you, but only as specifically listed in our Privacy Policy.
        </LegalP>
      </LegalSection>

      <LegalSection title="4. Conduct on Site">
        <LegalP>
          Your use of the site is subject to all applicable laws and regulations. By posting
          information in or otherwise using any communications service that may be available to you
          on or through this site, you agree that you will not upload, share, post, or otherwise
          distribute content that:
        </LegalP>
        <LegalList
          items={[
            "Is unlawful, threatening, abusive, harassing, defamatory, libelous, deceptive, fraudulent, or invasive of another's privacy.",
            "Victimizes or intimidates individuals on the basis of religion, gender, sexual orientation, race, ethnicity, age, or disability.",
            "Infringes on any patent, trademark, trade secret, copyright, or other proprietary right of any party.",
            "Constitutes unauthorized advertising, junk or bulk email, or any form of lottery or gambling.",
            "Contains software viruses or code designed to disrupt or damage equipment or obtain unauthorized access to data.",
            "Impersonates any person or entity, including any of our employees or representatives."
          ]}
        />
        <LegalP>
          You agree that we may at any time terminate your membership, account, or other affiliation
          with our site without prior notice for violating any of the above provisions.
        </LegalP>
      </LegalSection>

      <LegalSection title="5. Subscriptions">
        <LegalP>
          Subscriptions are sold on this site, and are generally paid in advance to receive the
          service. Plan features, pricing, and availability are described on our Pricing page and
          may change with notice.
        </LegalP>
      </LegalSection>

      <LegalSection title="6. Third Party Sites and Information">
        <LegalP>
          This site may link you to other sites on the Internet or otherwise include references to
          information provided by other parties. These other sites and parties are not under our
          control, and you acknowledge that we are not responsible for the accuracy, legality, or
          decency of the content of such sites.
        </LegalP>
      </LegalSection>

      <LegalSection title="7. Intellectual Property Information">
        <LegalP>
          Copyright © GƎNƎSIS, All Rights Reserved. All content presented to you on this site is
          protected by copyrights, trademarks, service marks, patents or other proprietary rights
          and laws, and is the sole property of GƎNƎSIS.
        </LegalP>
        <LegalP>
          You are only permitted to use the content as expressly authorized by us. Except for a
          single copy made for personal use only, you may not copy, reproduce, modify, republish,
          upload, post, transmit, or distribute any documents or information from this site without
          prior written permission.
        </LegalP>
        <LegalP>
          All custom graphics, icons, logos and service names are trademarks or service marks of
          GƎNƎSIS. Nothing in these Terms of Service grants you any right to use any trademark,
          service mark, logo, and/or the name of GƎNƎSIS or its Affiliates.
        </LegalP>
      </LegalSection>

      <LegalSection title="8. Accuracy of Information">
        <LegalP>
          All of the information on this website is for entertainment and educational purposes only.
          While the information is believed to be accurate, none of the information on this site
          should be considered solely reliable for use in making actual investment decisions.
          GƎNƎSIS is a distributor (and not a publisher) of content supplied by third parties.
        </LegalP>
      </LegalSection>

      <LegalSection title="9. Investment Decisions">
        <LegalP>
          You assume all risk associated with investment decisions made on the basis of information
          contained on this web site. It is our policy to never advocate the purchase or sale of any
          individual investment vehicle. Prior to the execution of a trade, you are advised to
          consult with your broker or other financial representative to verify pricing and other
          information.
        </LegalP>
      </LegalSection>

      <LegalSection title="10. Shared Trades">
        <LegalP>
          By posting and sharing your Content using the Services, you grant us a non-exclusive,
          royalty-free, worldwide license to use, copy, reproduce, modify, adapt, publish, translate,
          distribute, perform and display your Content as necessary to provide the Services.
        </LegalP>
        <LegalP>
          By posting content to the service, you warrant that you either own or otherwise control all
          of the rights to that content. You agree to indemnify and hold Us harmless for any claims
          arising from your use of the service or your violation of these Terms.
        </LegalP>
        <LegalP>
          We shall have the right in Our sole discretion to terminate your access to and use of the
          Services and/or remove any of your Content should We consider your statements or conduct to
          be in violation of these Terms or applicable law.
        </LegalP>
      </LegalSection>

      <LegalSection title="11. Disclaimer of Warranties">
        <LegalP>
          ALL MATERIALS AND SERVICES ON THIS SITE ARE PROVIDED ON AN &ldquo;AS IS&rdquo; AND
          &ldquo;AS AVAILABLE&rdquo; BASIS WITHOUT WARRANTY OF ANY KIND, EITHER EXPRESS OR IMPLIED,
          INCLUDING THE IMPLIED WARRANTIES OF MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE.
        </LegalP>
        <LegalP>
          WE MAKE NO WARRANTY THAT (A) THE SERVICES WILL MEET YOUR REQUIREMENTS, (B) THE SERVICES
          WILL BE UNINTERRUPTED, TIMELY, SECURE, OR ERROR-FREE, (C) THE RESULTS OBTAINED WILL BE
          EFFECTIVE, ACCURATE OR RELIABLE, OR (D) THE QUALITY OF ANY PRODUCTS OR SERVICES WILL MEET
          YOUR EXPECTATIONS.
        </LegalP>
      </LegalSection>

      <LegalSection title="12. Limitation of Liability">
        <LegalP>
          IN NO EVENT SHALL WE OR OUR AFFILIATES BE LIABLE TO YOU OR ANY THIRD PARTY FOR ANY SPECIAL,
          PUNITIVE, INCIDENTAL, INDIRECT OR CONSEQUENTIAL DAMAGES OF ANY KIND, ARISING OUT OF OR IN
          CONNECTION WITH THE USE OF THIS SITE.
        </LegalP>
      </LegalSection>

      <LegalSection title="13. Indemnification">
        <LegalP>
          Upon a request by us, you agree to defend, indemnify, and hold us and our Affiliates
          harmless from all liabilities, claims, and expenses, including attorney&apos;s fees, that
          arise from your use or misuse of this site.
        </LegalP>
      </LegalSection>

      <LegalSection title="14. Security and Password">
        <LegalP>
          You are solely responsible for maintaining the confidentiality of your password and account.
          You may not transfer or share your account with anyone, and we reserve the right to
          immediately terminate your account if you do transfer or share your account.
        </LegalP>
      </LegalSection>

      <LegalSection title="15. International Use">
        <LegalP>
          Although this site may be accessible worldwide, we make no representation that materials on
          this site are appropriate or available for use in locations outside the United States.
          Those who choose to access this site from other locations do so on their own initiative
          and are responsible for compliance with local laws.
        </LegalP>
      </LegalSection>

      <LegalSection title="16. Termination of Use">
        <LegalP>
          You agree that we may, in our sole discretion, terminate or suspend your access to all or
          part of the site with or without notice and for any reason, including breach of these
          Terms of Service. Upon termination, your right to use the services immediately ceases.
        </LegalP>
      </LegalSection>

      <LegalSection title="17. Governing Law">
        <LegalP>
          This site is controlled by us from our offices within the State of Florida, United States
          of America. By accessing this site both of us agree that the statutes and laws of the
          State of Florida will apply to all matters relating to the use of this site.
        </LegalP>
      </LegalSection>

      <LegalSection title="18. Notices">
        <LegalP>
          All notices to a party shall be in writing and shall be made via email. Notices to us must
          be sent to the attention of Customer Service at{" "}
          <a href={`mailto:${SUPPORT}`} className="text-brand-300 hover:underline">
            {SUPPORT}
          </a>
          .
        </LegalP>
      </LegalSection>

      <LegalSection title="19. Entire Agreement">
        <LegalP>
          These terms and conditions constitute the entire agreement and understanding between us
          concerning the subject matter of this agreement and supersedes all prior agreements. These
          Terms of Service may not be altered except by a written agreement signed by you and us.
        </LegalP>
      </LegalSection>

      <LegalSection title="20. Miscellaneous">
        <LegalP>
          In any action to enforce these Terms of Service, the prevailing party will be entitled to
          costs and attorneys&apos; fees. You may not assign your rights and obligations under these
          Terms of Service to any party. We may freely assign our rights and obligations.
        </LegalP>
        <LegalP>
          You agree not to sell, resell, reproduce, duplicate, copy or use for any commercial
          purposes any portion of this site, or use of or access to this site.
        </LegalP>
      </LegalSection>

      <LegalSection title="21. Contact Information">
        <LegalP>
          Except as explicitly noted on this site, the services available through this site are
          offered by GƎNƎSIS. If you notice that any user is violating these Terms of Service,
          please contact us at{" "}
          <a href={`mailto:${SUPPORT}`} className="text-brand-300 hover:underline">
            {SUPPORT}
          </a>
          .
        </LegalP>
      </LegalSection>

      <LegalSection title="22. Refunds and Cancellations">
        <LegalP>
          GƎNƎSIS has a no refund policy after sign-up. All payments made are final and
          non-refundable.
        </LegalP>
        <LegalP>
          GƎNƎSIS is not responsible for continued subscriptions should a customer forget to cancel
          their account. It is the customer&apos;s responsibility to confirm the cancellation.
        </LegalP>
      </LegalSection>
    </>
  );
}
